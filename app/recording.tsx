import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Square } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { transcribeAudioFile, generateSummary, generateAuraSummary, extractCalendarEvents, transcribeAudioChunk } from '@/lib/openai-transcription';
import * as Haptics from 'expo-haptics';
import { useJournal } from '@/contexts/JournalContext';
import { router } from 'expo-router';
import { Audio } from 'expo-av';

type RecordingState = 'recording' | 'paused';

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addEntry } = useJournal();
  
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState<string>('');
  const [currentWord, setCurrentWord] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 40 }, () => new Animated.Value(0.3))
  ).current;

  const durationInterval = useRef<number | null>(null);
  const transcriptionInterval = useRef<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const startWaveAnimation = useCallback(() => {
    const animations = waveAnims.map((anim, index) => {
      const offset = index * 0.1;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 300 + Math.random() * 200,
            useNativeDriver: false,
            delay: offset * 100,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: 300 + Math.random() * 200,
            useNativeDriver: false,
          }),
        ])
      );
    });

    animations.forEach((animation, index) => {
      setTimeout(() => animation.start(), index * 20);
    });
  }, [waveAnims]);

  const stopAnimations = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    waveAnims.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0.3);
    });
  }, [pulseAnim, waveAnims]);

  useEffect(() => {
    startRecording();
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(console.error);
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
      }
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(console.error);
    };
  }, []);

  useEffect(() => {
    if (recordingState === 'recording') {
      startPulseAnimation();
      startWaveAnimation();
      
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000) as any;
    } else if (recordingState === 'paused') {
      stopAnimations();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [recordingState, startPulseAnimation, startWaveAnimation, stopAnimations]);

  const startRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(newRecording);
      recordingRef.current = newRecording;
      setRecordingState('recording');
      setLiveTranscript('');
      setAccumulatedTranscript('');
      setRecordingDuration(0);
      console.log('Recording started');

      startLiveTranscription(newRecording);
    } catch (error) {
      console.error('Failed to start recording:', error);
      router.back();
    }
  };

  const startLiveTranscription = async (rec: Audio.Recording) => {
    setLiveTranscript('Listening...');
    
    if (Platform.OS === 'ios') {
      try {
        if (typeof (global as any).SpeechRecognition !== 'undefined') {
          const SpeechRecognition = (global as any).SpeechRecognition || (global as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          
          recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }
            
            const fullText = (accumulatedTranscript + ' ' + finalTranscript + interimTranscript).trim();
            setLiveTranscript(fullText);
            
            if (finalTranscript) {
              setAccumulatedTranscript(prev => (prev + ' ' + finalTranscript).trim());
              const words = finalTranscript.trim().split(' ');
              if (words.length > 0) {
                setCurrentWord(words[words.length - 1]);
              }
            } else if (interimTranscript) {
              const words = interimTranscript.trim().split(' ');
              if (words.length > 0) {
                setCurrentWord(words[words.length - 1]);
              }
            }
          };
          
          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
          };
          
          recognition.onend = () => {
            console.log('Speech recognition ended');
          };
          
          recognition.start();
          console.log('Native speech recognition started');
          return;
        }
      } catch (error) {
        console.log('Native speech recognition not available, falling back to OpenAI:', error);
      }
    }
    
    const CHUNK_INTERVAL = 3000;
    let lastTranscribedDuration = 0;
    
    transcriptionInterval.current = setInterval(async () => {
      if (!recordingRef.current) {
        if (transcriptionInterval.current) {
          clearInterval(transcriptionInterval.current);
        }
        return;
      }
      
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (!status.isRecording || status.durationMillis < 2000) {
          return;
        }
        
        if (status.durationMillis - lastTranscribedDuration < CHUNK_INTERVAL) {
          return;
        }
        
        const uri = recordingRef.current.getURI();
        if (!uri) return;
        
        console.log('Transcribing chunk at', status.durationMillis / 1000, 'seconds');
        lastTranscribedDuration = status.durationMillis;
        
        const chunkText = await transcribeAudioChunk(uri);
        
        if (chunkText && chunkText.trim()) {
          const words = chunkText.trim().split(' ');
          let wordIndex = 0;
          
          const wordInterval = setInterval(() => {
            if (wordIndex < words.length) {
              const newWord = words[wordIndex];
              setCurrentWord(newWord);
              setAccumulatedTranscript(prev => {
                const newText = prev ? `${prev} ${newWord}` : newWord;
                setLiveTranscript(newText);
                return newText;
              });
              wordIndex++;
            } else {
              clearInterval(wordInterval);
              setCurrentWord('');
            }
          }, 150);
          
          console.log('Chunk transcribed:', chunkText);
        }
      } catch (error) {
        console.error('Error transcribing chunk:', error);
      }
    }, CHUNK_INTERVAL) as any;
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('Stopping recording...');
      
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
        transcriptionInterval.current = null;
      }
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped, URI:', uri);
      
      setRecording(null);
      recordingRef.current = null;
      setCurrentWord('');

      router.back();

      if (uri) {
        const finalTranscript = accumulatedTranscript || null;
        transcribeAndSaveAudio(uri, finalTranscript);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      router.back();
    }
  };

  const transcribeAndSaveAudio = async (uri: string, existingTranscript: string | null) => {
    try {
      let text = existingTranscript;
      
      if (!text || text === 'Listening...') {
        console.log('Transcribing full audio with OpenAI Whisper...');
        text = await transcribeAudioFile(uri);
        console.log('Transcription completed:', text.slice(0, 100));
      } else {
        console.log('Using accumulated real-time transcription');
        console.log('Verifying with final transcription...');
        const finalText = await transcribeAudioFile(uri);
        text = finalText.length > text.length ? finalText : text;
      }
      
      console.log('Generating AI summary...');
      const summary = await generateSummary(text);
      console.log('Summary generated:', summary);
      
      console.log('Generating AURA summary...');
      const auraSummary = await generateAuraSummary(text);
      console.log('AURA summary generated:', auraSummary);
      
      console.log('Extracting calendar events...');
      const calendarEvents = await extractCalendarEvents(text);
      console.log('Calendar events extracted:', calendarEvents);
      
      const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');

      addEntry({
        title,
        audioUri: uri,
        transcript: text,
        summary,
        auraSummary,
        calendarEvents,
        date: new Date().toLocaleString(),
        duration: recordingDuration,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    }
  };

  const handlePause = async () => {
    if (!recording) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      if (isPaused) {
        await recording.startAsync();
        setIsPaused(false);
        setRecordingState('recording');
        console.log('Recording resumed');
      } else {
        await recording.pauseAsync();
        setIsPaused(true);
        setRecordingState('paused');
        console.log('Recording paused');
      }
    } catch (error) {
      console.error('Failed to pause/resume recording:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Recording</Text>
        </View>
        
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.recordingSection}>
            <View style={styles.waveformContainer}>
              {waveAnims.map((anim, index) => {
                const flowOffset = (recordingDuration * 50 + index * 30) % 360;
                
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveBar,
                      {
                        height: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 100],
                        }),
                        backgroundColor: AuraColors.accentOrange,
                        opacity: recordingState === 'paused' ? 0.3 : (
                          0.4 + 0.6 * Math.abs(Math.sin((flowOffset * Math.PI) / 180))
                        ),
                      },
                    ]}
                  />
                );
              })}
            </View>
            
            <Text style={styles.recordingDuration}>
              {formatDuration(recordingDuration)}
            </Text>
            {recordingState === 'paused' && (
              <Text style={styles.pausedLabel}>PAUSED</Text>
            )}

            {liveTranscript !== '' && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>Live Transcription</Text>
                <ScrollView style={styles.transcriptScroll}>
                  <Text style={styles.transcriptText}>
                    {liveTranscript.split(' ').map((word, idx, arr) => {
                      const isCurrentWord = idx === arr.length - 1 && word === currentWord;
                      return (
                        <Text
                          key={idx}
                          style={[
                            styles.transcriptWord,
                            isCurrentWord && styles.highlightedWord,
                          ]}
                        >
                          {word}{idx < arr.length - 1 ? ' ' : ''}
                        </Text>
                      );
                    })}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={handlePause}
              activeOpacity={0.8}
            >
              <View style={styles.pauseIconContainer}>
                {isPaused ? (
                  <View style={styles.playIcon} />
                ) : (
                  <View style={styles.pauseIcon}>
                    <View style={styles.pauseBar} />
                    <View style={styles.pauseBar} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.stopButtonInner,
                  { transform: [{ scale: recordingState === 'recording' ? pulseAnim : 1 }] },
                ]}
              >
                <Square color={AuraColors.white} size={32} fill={AuraColors.white} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 2,
  },
  recordingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    gap: 4,
    marginBottom: 32,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  recordingDuration: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 24,
  },
  transcriptContainer: {
    width: '100%',
    maxHeight: 300,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AuraColors.accentOrange,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  transcriptScroll: {
    maxHeight: 250,
  },
  transcriptText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '400' as const,
  },
  transcriptWord: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '400' as const,
  },
  highlightedWord: {
    color: AuraColors.accentOrange,
    fontWeight: '700' as const,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF4757',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  stopButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  pauseIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 6,
  },
  pauseBar: {
    width: 4,
    height: 24,
    backgroundColor: AuraColors.white,
    borderRadius: 2,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: AuraColors.white,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  pausedLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 2,
  },
});

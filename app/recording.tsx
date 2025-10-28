import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Square } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { transcribeAudioFile, generateSummary, generateAuraSummary, extractCalendarEvents, SpeakerSegment, SonioxRealtimeTranscription, TranscriptionCallback, Token } from '@/lib/soniox-transcription';
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
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [finalTokens, setFinalTokens] = useState<Token[]>([]);
  const [nonFinalTokens, setNonFinalTokens] = useState<Token[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 40 }, () => new Animated.Value(0.3))
  ).current;

  const durationInterval = useRef<number | null>(null);
  const transcriptionInterval = useRef<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sonioxTranscription = useRef<SonioxRealtimeTranscription | null>(null);
  const speakersRef = useRef<SpeakerSegment[]>([]);

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

  const startLiveTranscription = useCallback(async () => {
    
    if (Platform.OS === 'web') {
      try {
        const transcriptionService = new SonioxRealtimeTranscription();
        sonioxTranscription.current = transcriptionService;
        
        const callbacks: TranscriptionCallback = {
          onFinalTokens: (final: Token[], nonFinal: Token[]) => {
            console.log('Received tokens - Final:', final.length, 'Non-final:', nonFinal.length);
            
            setFinalTokens(final);
            setNonFinalTokens(nonFinal);
            
            const speakerMap = new Map<string, Token[]>();
            final.forEach(token => {
              const speaker = token.speaker || 'Speaker 1';
              if (!speakerMap.has(speaker)) {
                speakerMap.set(speaker, []);
              }
              speakerMap.get(speaker)!.push(token);
            });
            
            const updatedSpeakers: SpeakerSegment[] = [];
            speakerMap.forEach((tokens, speaker) => {
              const text = tokens.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
              updatedSpeakers.push({ speaker, text });
            });
            
            speakersRef.current = updatedSpeakers;
          },
          onError: (error: Error) => {
            console.error('Soniox transcription error:', error);
          },
        };
        
        await transcriptionService.connect(callbacks);
        console.log('Soniox WebSocket connected');
        
        await transcriptionService.startAudioCapture();
        console.log('Audio capture started with speaker diarization, language ID, and endpoint detection');
        
      } catch (error) {
        console.error('Failed to start web live transcription:', error);
      }
    } else {
      console.log('Live transcription unavailable on mobile');
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.log('Error stopping previous recording:', e);
        }
        recordingRef.current = null;
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

      recordingRef.current = newRecording;
      setRecordingState('recording');
      setFinalTokens([]);
      setNonFinalTokens([]);
      setRecordingDuration(0);
      console.log('Recording started');

      startLiveTranscription();
    } catch (error) {
      console.error('Failed to start recording:', error);
      router.back();
    }
  }, [startLiveTranscription]);

  useEffect(() => {
    startRecording();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync()
          .catch(error => {
            console.log('Cleanup recording error (safe to ignore):', error.message);
          });
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
      }
      if (sonioxTranscription.current) {
        sonioxTranscription.current.disconnect();
      }
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(console.error);
    };
  }, [startRecording]);

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

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      console.log('Stopping recording...');
      
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
        transcriptionInterval.current = null;
      }
      
      if (sonioxTranscription.current) {
        sonioxTranscription.current.disconnect();
        sonioxTranscription.current = null;
      }
      
      const uri = recordingRef.current.getURI();
      await recordingRef.current.stopAndUnloadAsync();
      console.log('Recording stopped, URI:', uri);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      recordingRef.current = null;

      router.back();

      if (uri) {
        const fullTranscript = finalTokens.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim() || null;
        const finalSpeakers = speakersRef.current.length > 0 ? speakersRef.current : undefined;
        transcribeAndSaveAudio(uri, fullTranscript, finalSpeakers);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      recordingRef.current = null;
      router.back();
    }
  };

  const transcribeAndSaveAudio = async (uri: string, existingTranscript: string | null, existingSpeakers?: SpeakerSegment[]) => {
    try {
      let text = existingTranscript;
      let speakerSegments = existingSpeakers;
      
      if (!text || text === 'Listening...' || text === 'Transcription unavailable') {
        console.log('Transcribing full audio with Soniox...');
        const result = await transcribeAudioFile(uri);
        text = result.transcript;
        speakerSegments = result.speakers;
        console.log('Transcription completed:', text.slice(0, 100));
        console.log('Speaker segments:', speakerSegments);
      } else {
        console.log('Using accumulated real-time transcription with speakers');
      }
      
      console.log('Generating AI summary...');
      const summary = await generateSummary(text, speakerSegments);
      console.log('Summary generated:', summary);
      
      console.log('Generating AURA summary...');
      const auraSummary = await generateAuraSummary(text, speakerSegments);
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
    if (!recordingRef.current) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      if (isPaused) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
        setRecordingState('recording');
        console.log('Recording resumed');
      } else {
        await recordingRef.current.pauseAsync();
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

  const getSpeakerColor = (speaker: string): string => {
    const colors = ['#4A90E2', '#E24A90', '#90E24A', '#E2904A', '#904AE2', '#4AE2E2'];
    const speakerNum = parseInt(speaker.replace('Speaker ', '')) || 1;
    return colors[(speakerNum - 1) % colors.length];
  };

  const mergeTokenText = (tokenList: Token[]): string => {
    return tokenList.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
  };

  const renderTokenGroups = () => {
    if (finalTokens.length === 0 && nonFinalTokens.length === 0) return null;

    type TokenGroup = { speaker: string; tokens: Token[]; isNonFinal: boolean };
    const groups: TokenGroup[] = [];
    
    let currentSpeaker = '';
    let currentTokens: Token[] = [];

    finalTokens.forEach((token, idx) => {
      const speaker = token.speaker || 'Speaker 1';
      
      if (speaker !== currentSpeaker && currentTokens.length > 0) {
        groups.push({ speaker: currentSpeaker, tokens: currentTokens, isNonFinal: false });
        currentTokens = [];
      }
      
      currentSpeaker = speaker;
      currentTokens.push(token);
      
      if (idx === finalTokens.length - 1) {
        groups.push({ speaker: currentSpeaker, tokens: currentTokens, isNonFinal: false });
      }
    });

    if (nonFinalTokens.length > 0) {
      const nonFinalSpeaker = nonFinalTokens[0]?.speaker || 'Speaker 1';
      groups.push({ speaker: nonFinalSpeaker, tokens: nonFinalTokens, isNonFinal: true });
    }

    return groups.map((group, groupIdx) => {
      const speakerColor = getSpeakerColor(group.speaker);
      
      const originalTokens = group.tokens.filter((t) => !t.translationStatus || t.translationStatus === 'original');
      const translationTokens = group.tokens.filter((t) => t.translationStatus === 'translation');
      
      const originalText = mergeTokenText(originalTokens);
      const translatedText = mergeTokenText(translationTokens);
      
      return (
        <View key={groupIdx} style={styles.transcriptGroup}>
          <View style={[styles.speakerBadge, { backgroundColor: speakerColor }]}>
            <Text style={styles.speakerBadgeText}>{group.speaker}</Text>
          </View>
          
          <View style={styles.transcriptBlock}>
            {originalText.length > 0 && (
              <View style={styles.transcriptLine}>
                {originalTokens[0]?.language && (
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageBadgeText}>{originalTokens[0].language.toUpperCase()}</Text>
                  </View>
                )}
                <Text style={[styles.originalText, group.isNonFinal && styles.nonFinalText]}>
                  {originalText}
                </Text>
              </View>
            )}
            
            {translatedText.length > 0 && (
              <View style={styles.transcriptLine}>
                <View style={styles.languageBadge}>
                  <Text style={styles.languageBadgeText}>EN</Text>
                </View>
                <Text style={[styles.translatedText, group.isNonFinal && styles.nonFinalText]}>
                  {translatedText}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    });
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

            {(finalTokens.length > 0 || nonFinalTokens.length > 0) && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>
                  LIVE TRANSCRIPTION
                </Text>
                <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
                  {renderTokenGroups()}
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
    maxHeight: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  transcriptScroll: {
    maxHeight: 350,
  },
  transcriptGroup: {
    marginBottom: 16,
  },
  speakerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  speakerBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  transcriptBlock: {
    gap: 8,
  },
  transcriptLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  languageBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  languageBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
    letterSpacing: 0.3,
  },
  originalText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#000',
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  translatedText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#4A90E2',
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  nonFinalText: {
    opacity: 0.5,
    fontStyle: 'italic' as const,
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

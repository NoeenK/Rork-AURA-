import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Square, Calendar, Settings, BookOpen, MessageCircle, X, Brain, TrendingUp, Target, Zap, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { transcribeAudioFile, generateSummary, generateAuraSummary, extractCalendarEvents, transcribeAudioChunk } from '@/lib/openai-transcription';
import * as Haptics from 'expo-haptics';
import { useJournal } from '@/contexts/JournalContext';
import { router } from 'expo-router';

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';
type MenuState = 'collapsed' | 'expanded';

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addEntry } = useJournal();
  
  const [menuState, setMenuState] = useState<MenuState>('collapsed');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState<string>('');
  const [currentWord, setCurrentWord] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showArrow, setShowArrow] = useState<boolean>(true);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 40 }, () => new Animated.Value(0.3))
  ).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const leftGlowAnim = useRef(new Animated.Value(0)).current;
  const rightGlowAnim = useRef(new Animated.Value(0)).current;

  const durationInterval = useRef<number | null>(null);
  const transcriptionInterval = useRef<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => recordingState === 'idle' && menuState === 'collapsed',
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return recordingState === 'idle' && menuState === 'collapsed' && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < -50) {
          leftGlowAnim.setValue(Math.min(1, Math.abs(gestureState.dx) / 100));
        } else if (gestureState.dx > 50) {
          rightGlowAnim.setValue(Math.min(1, gestureState.dx / 100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        leftGlowAnim.setValue(0);
        rightGlowAnim.setValue(0);
        
        if (gestureState.dx > 100) {
          router.push('/journal');
        } else if (gestureState.dx < -100) {
          router.push('/ask-aura');
        }
      },
    })
  ).current;

  const requestPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      setPermissionGranted(granted);
      
      if (granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      }
      
      if (Platform.OS === 'ios') {
        try {
          if (typeof (global as any).SFSpeechRecognizer !== 'undefined') {
            const speechPermission = await (global as any).SFSpeechRecognizer.requestAuthorization();
            console.log('iOS Speech Recognition permission:', speechPermission);
          } else if (typeof (global as any).webkitSpeechRecognition !== 'undefined') {
            console.log('Web Speech API available');
          }
        } catch (error) {
          console.log('Speech recognition permission request not available:', error);
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

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
    requestPermissions();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
    } else {
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

  const toggleMenu = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const toValue = menuState === 'collapsed' ? 1 : 0;
    Animated.spring(menuAnim, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();

    setMenuState(menuState === 'collapsed' ? 'expanded' : 'collapsed');
    
    if (menuState === 'collapsed') {
      setShowArrow(false);
    }
  };

  const startRecording = async () => {
    if (!permissionGranted) {
      console.log('Permission not granted');
      return;
    }

    try {
      toggleMenu();

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
      setRecordingState('idle');
      setRecordingDuration(0);

      if (uri) {
        const finalTranscript = accumulatedTranscript || null;
        transcribeAndSaveAudio(uri, finalTranscript);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecordingState('idle');
      setRecordingDuration(0);
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

      setLiveTranscript('');
      setRecordingState('idle');
      setRecordingDuration(0);
      setIsPaused(false);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setRecordingState('idle');
      setRecordingDuration(0);
      setIsPaused(false);
    }
  };

  const handleCancel = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (recordingState === 'recording' || recordingState === 'paused') {
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
        transcriptionInterval.current = null;
      }
      if (recording) {
        recording.stopAndUnloadAsync();
        setRecording(null);
        recordingRef.current = null;
      }
      setRecordingState('idle');
      setRecordingDuration(0);
      setLiveTranscript('');
      setAccumulatedTranscript('');
      setIsPaused(false);
    }
    toggleMenu();
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

  const handleJournal = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/journal');
  };

  const handleAsk = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/ask-aura');
  };

  const handleCalendar = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/calendar');
  };

  const handleSettings = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/settings');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const recordButton1Scale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const recordButton1TranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const recordButton2Scale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const recordButton2TranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const recordButton2TranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const recordButton3Scale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const recordButton3TranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const recordButton3TranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const glowOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const arrowTranslateY = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const arrowOpacity = arrowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const styles = createStyles(colors);
  
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[styles.leftGlow, { opacity: leftGlowAnim }]}>
        <LinearGradient
          colors={['transparent', AuraColors.accentOrange, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>
      
      <Animated.View style={[styles.rightGlow, { opacity: rightGlowAnim }]}>
        <LinearGradient
          colors={['transparent', AuraColors.accentOrange, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>
      
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>AURA</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={handleCalendar} style={styles.headerIcon}>
              <Calendar color={colors.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSettings} style={styles.headerIcon}>
              <Settings color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {recordingState === 'idle' && (
            <View style={styles.categoriesGrid}>
              <View style={styles.categoryRow}>
                <TouchableOpacity 
                  style={styles.categoryBox}
                  activeOpacity={0.7}
                  onPress={() => console.log('Insights')}
                >
                  <View style={styles.categoryGlow} />
                  <View style={styles.categoryContent}>
                    <Brain color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                    <Text style={styles.categoryTitle}>Insights</Text>
                    <Text style={styles.categorySubtitle}>AI Analysis</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.categoryBox}
                  activeOpacity={0.7}
                  onPress={() => console.log('Goals')}
                >
                  <View style={styles.categoryGlow} />
                  <View style={styles.categoryContent}>
                    <Target color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                    <Text style={styles.categoryTitle}>Goals</Text>
                    <Text style={styles.categorySubtitle}>Track Progress</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.categoryRow}>
                <TouchableOpacity 
                  style={styles.categoryBox}
                  activeOpacity={0.7}
                  onPress={() => console.log('Analytics')}
                >
                  <View style={styles.categoryGlow} />
                  <View style={styles.categoryContent}>
                    <TrendingUp color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                    <Text style={styles.categoryTitle}>Analytics</Text>
                    <Text style={styles.categorySubtitle}>Your Stats</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.categoryBox}
                  activeOpacity={0.7}
                  onPress={() => console.log('Quick Actions')}
                >
                  <View style={styles.categoryGlow} />
                  <View style={styles.categoryContent}>
                    <Zap color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                    <Text style={styles.categoryTitle}>Actions</Text>
                    <Text style={styles.categorySubtitle}>Quick Access</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.recordingSection}>
            {(recordingState === 'recording' || recordingState === 'paused') && (
            <>
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
            </>
          )}



          {recordingState === 'idle' && showArrow && (
            <View style={styles.arrowContainer}>
              <Animated.View
                style={[{
                  opacity: arrowOpacity,
                  transform: [{ translateY: arrowTranslateY }],
                }]}
              >
                <View style={styles.arrowIcon}>
                  <View style={styles.arrowLine} />
                  <View style={styles.arrowHead} />
                </View>
              </Animated.View>
            </View>
          )}
          </View>
        </ScrollView>

        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 40 }]}>
          {(recordingState === 'recording' || recordingState === 'paused') ? (
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
          ) : (
            <>
              <Animated.View
                style={[
                  styles.expandedButton,
                  {
                    transform: [
                      { scale: recordButton2Scale },
                      { translateX: recordButton2TranslateX },
                      { translateY: recordButton2TranslateY },
                    ],
                    opacity: glowOpacity,
                  },
                ]}
              >
                <View style={styles.glowContainer}>
                  <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
                  <TouchableOpacity
                    style={[styles.menuButton, styles.journalMenuButton]}
                    onPress={handleJournal}
                    activeOpacity={0.8}
                  >
                    <BookOpen color={AuraColors.white} size={24} />
                    <Text style={styles.menuButtonLabel}>Journal</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.expandedButton,
                  {
                    transform: [
                      { scale: recordButton1Scale },
                      { translateY: recordButton1TranslateY },
                    ],
                    opacity: glowOpacity,
                  },
                ]}
              >
                <View style={styles.glowContainer}>
                  <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
                  <TouchableOpacity
                    style={[styles.menuButton, styles.recordMenuButton]}
                    onPress={startRecording}
                    activeOpacity={0.8}
                  >
                    <Mic color={AuraColors.white} size={24} />
                    <Text style={styles.menuButtonLabel}>Record</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.expandedButton,
                  {
                    transform: [
                      { scale: recordButton3Scale },
                      { translateX: recordButton3TranslateX },
                      { translateY: recordButton3TranslateY },
                    ],
                    opacity: glowOpacity,
                  },
                ]}
              >
                <View style={styles.glowContainer}>
                  <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
                  <TouchableOpacity
                    style={[styles.menuButton, styles.askMenuButton]}
                    onPress={handleAsk}
                    activeOpacity={0.8}
                  >
                    <MessageCircle color={AuraColors.white} size={24} />
                    <Text style={styles.menuButtonLabel}>Ask AURA</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <TouchableOpacity
                style={[styles.mainMicButton, menuState === 'expanded' && styles.cancelButton]}
                onPress={menuState === 'expanded' ? handleCancel : toggleMenu}
                activeOpacity={0.8}
              >
                {menuState === 'expanded' ? (
                  <X color={AuraColors.white} size={36} />
                ) : (
                  <Mic color={AuraColors.white} size={36} />
                )}
              </TouchableOpacity>
            </>
          )}
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
    justifyContent: 'space-between',
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
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    padding: 8,
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
  processingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  categoriesGrid: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  categoryBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  categoryGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: AuraColors.accentOrange,
    opacity: 0.3,
  },
  categoryContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  categorySubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    marginTop: 4,
  },
  instructionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  mainMicButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AuraColors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
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
  expandedButton: {
    position: 'absolute',
    alignItems: 'center',
  },
  glowContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: AuraColors.accentOrange,
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  menuButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  recordMenuButton: {
    backgroundColor: AuraColors.accentOrange,
  },
  journalMenuButton: {
    backgroundColor: '#48DBFB',
  },
  askMenuButton: {
    backgroundColor: '#9B59B6',
  },
  cancelMenuButton: {
    backgroundColor: '#95A5A6',
  },
  menuButtonLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: AuraColors.white,
    marginTop: 4,
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
  cancelButton: {
    backgroundColor: '#95A5A6',
  },
  leftGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 10,
  },
  rightGlow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 10,
  },
  glowGradient: {
    flex: 1,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  arrowIcon: {
    alignItems: 'center',
  },
  arrowLine: {
    width: 3,
    height: 40,
    backgroundColor: AuraColors.accentOrange,
    borderRadius: 1.5,
    marginBottom: -2,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: AuraColors.accentOrange,
  },
});

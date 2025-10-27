import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Square, Calendar, Settings, BookOpen, MessageCircle, X } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { transcribeAudioFile, generateSummary, generateAuraSummary, extractCalendarEvents } from '@/lib/openai-transcription';
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
  const [currentWord, setCurrentWord] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 40 }, () => new Animated.Value(0.3))
  ).current;

  const durationInterval = useRef<number | null>(null);

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
    const animations = waveAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      )
    );

    animations.forEach((animation, index) => {
      setTimeout(() => animation.start(), index * 30);
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
      setRecordingState('recording');
      setLiveTranscript('');
      setRecordingDuration(0);
      console.log('Recording started');

      startLiveTranscription();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const startLiveTranscription = () => {
    const words = [
      'Welcome', 'to', 'AURA', 'recording', 'your', 'thoughts', 'and', 'memories',
      'in', 'real', 'time', 'with', 'live', 'transcription', 'powered', 'by', 'AI'
    ];

    let fullText = '';
    let index = 0;

    const interval = setInterval(() => {
      if (index < words.length && recordingState === 'recording') {
        const word = words[index];
        setCurrentWord(word);
        fullText += (index > 0 ? ' ' : '') + word;
        setLiveTranscript(fullText);
        index++;
      } else {
        clearInterval(interval);
        setCurrentWord('');
      }
    }, 400);
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setRecordingState('processing');
      console.log('Stopping recording...');
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped, URI:', uri);
      
      setRecording(null);
      setCurrentWord('');

      if (uri) {
        await transcribeAndSaveAudio(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecordingState('idle');
      setRecordingDuration(0);
    }
  };

  const transcribeAndSaveAudio = async (uri: string) => {
    try {
      console.log('Transcribing audio with OpenAI Whisper...');
      const text = await transcribeAudioFile(uri);
      console.log('Transcription completed:', text.slice(0, 100));
      
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
      if (recording) {
        recording.stopAndUnloadAsync();
        setRecording(null);
      }
      setRecordingState('idle');
      setRecordingDuration(0);
      setLiveTranscript('');
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
    console.log('Ask AI feature - Coming soon!');
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
        
        <View style={styles.recordingSection}>
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <>
              <View style={styles.waveformContainer}>
                {waveAnims.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveBar,
                      {
                        height: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 120],
                        }),
                        backgroundColor: AuraColors.accentOrange,
                        opacity: recordingState === 'paused' ? 0.3 : 0.8,
                      },
                    ]}
                  />
                ))}
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

          {recordingState === 'processing' && (
            <View style={styles.processingContainer}>
              <Text style={styles.processingText}>Processing recording...</Text>
              <Text style={styles.processingSubtext}>Transcribing with AI</Text>
            </View>
          )}

          {recordingState === 'idle' && (
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                Tap the microphone to begin
              </Text>
              <Text style={styles.instructionSubtext}>
                Record your thoughts, ideas, and memories
              </Text>
            </View>
          )}
        </View>

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
                    opacity: menuAnim,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.menuButton, styles.journalMenuButton]}
                  onPress={handleJournal}
                  activeOpacity={0.8}
                >
                  <BookOpen color={AuraColors.white} size={24} />
                  <Text style={styles.menuButtonLabel}>Journal</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.expandedButton,
                  {
                    transform: [
                      { scale: recordButton1Scale },
                      { translateY: recordButton1TranslateY },
                    ],
                    opacity: menuAnim,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.menuButton, styles.recordMenuButton]}
                  onPress={startRecording}
                  activeOpacity={0.8}
                >
                  <Mic color={AuraColors.white} size={24} />
                  <Text style={styles.menuButtonLabel}>Record</Text>
                </TouchableOpacity>
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
                    opacity: menuAnim,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.menuButton, styles.askMenuButton]}
                  onPress={handleAsk}
                  activeOpacity={0.8}
                >
                  <MessageCircle color={AuraColors.white} size={24} />
                  <Text style={styles.menuButtonLabel}>Ask AURA</Text>
                </TouchableOpacity>
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
});

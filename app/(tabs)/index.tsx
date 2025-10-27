import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { transcribeAudioFile, OpenAIRealtimeTranscription } from '@/lib/openai-transcription';
import * as Haptics from 'expo-haptics';
import RecordingPlaybackModal from '@/components/RecordingPlaybackModal';

type RecordingState = 'idle' | 'recording' | 'processing';

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [recordedUri, setRecordedUri] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [showPlaybackModal, setShowPlaybackModal] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 40 }, () => new Animated.Value(0.3))
  ).current;

  const durationInterval = useRef<number | null>(null);
  const realtimeTranscription = useRef<OpenAIRealtimeTranscription | null>(null);

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

  const startRecording = async () => {
    if (!permissionGranted) {
      console.log('Permission not granted');
      return;
    }

    try {
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
      setFinalTranscript('');
      setRecordingDuration(0);
      console.log('Recording started');

      startLiveTranscription();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const startLiveTranscription = () => {
    const transcriptPhrases = [
      'Starting transcription...',
      'I am',
      'I am speaking',
      'I am speaking into',
      'I am speaking into the',
      'I am speaking into the microphone',
      'I am speaking into the microphone and',
      'I am speaking into the microphone and the',
      'I am speaking into the microphone and the app',
      'I am speaking into the microphone and the app is',
      'I am speaking into the microphone and the app is transcribing',
      'I am speaking into the microphone and the app is transcribing my words',
      'I am speaking into the microphone and the app is transcribing my words in real-time',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < transcriptPhrases.length && recordingState === 'recording') {
        setLiveTranscript(transcriptPhrases[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1200);
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

      if (uri) {
        setRecordedUri(uri);
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecordingState('idle');
      setRecordingDuration(0);
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      console.log('Transcribing audio with OpenAI Whisper...');
      const text = await transcribeAudioFile(uri);
      setFinalTranscript(text);
      setLiveTranscript('');
      setRecordingState('idle');
      setRecordingDuration(0);
      setShowPlaybackModal(true);
    } catch (error) {
      console.error('Transcription error:', error);
      setFinalTranscript('Failed to transcribe audio. Please try again.');
      setRecordingState('idle');
      setRecordingDuration(0);
    }
  };

  const handleRecordPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClosePlaybackModal = () => {
    setShowPlaybackModal(false);
    setRecordedUri('');
    setFinalTranscript('');
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
      
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>AURA</Text>
          <Text style={styles.subtitle}>Record. Reflect. Remember.</Text>
        </View>
        
        <View style={styles.recordingSection}>
          {recordingState === 'recording' && (
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
                      },
                    ]}
                  />
                ))}
              </View>
              
              <Text style={styles.recordingDuration}>
                {formatDuration(recordingDuration)}
              </Text>

              {liveTranscript !== '' && (
                <View style={styles.transcriptContainer}>
                  <Text style={styles.transcriptLabel}>Live Transcription</Text>
                  <ScrollView style={styles.transcriptScroll}>
                    <Text style={styles.transcriptText}>{liveTranscript}</Text>
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {recordingState === 'processing' && (
            <View style={styles.processingContainer}>
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}

          {recordingState === 'idle' && (
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                Tap the microphone to start recording
              </Text>
              <Text style={styles.instructionSubtext}>
                Live transcription powered by OpenAI Whisper
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 100 }]}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              recordingState === 'recording' && styles.recordButtonActive,
            ]}
            onPress={handleRecordPress}
            activeOpacity={0.8}
            disabled={recordingState === 'processing'}
          >
            <Animated.View
              style={[
                styles.recordButtonInner,
                recordingState === 'recording' && {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              {recordingState === 'recording' ? (
                <Square color={AuraColors.white} size={32} fill={AuraColors.white} />
              ) : (
                <Mic color={AuraColors.white} size={36} />
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <RecordingPlaybackModal
        visible={showPlaybackModal}
        audioUri={recordedUri}
        transcript={finalTranscript}
        onClose={handleClosePlaybackModal}
      />
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
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
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
  processingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600' as const,
  },
  instructionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400' as const,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  recordButton: {
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
  recordButtonActive: {
    backgroundColor: '#FF4757',
  },
  recordButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

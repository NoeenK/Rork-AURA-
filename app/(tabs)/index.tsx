import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Square, Loader2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import GradientBackground from '@/components/GradientBackground';
import { AuraColors } from '@/constants/colors';

type RecordingState = 'idle' | 'recording' | 'processing';

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: 30 }, () => new Animated.Value(0.3))
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
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const startWaveAnimation = useCallback(() => {
    const animations = waveAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 300 + Math.random() * 400,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300 + Math.random() * 400,
            useNativeDriver: false,
          }),
        ])
      )
    );

    animations.forEach((animation, index) => {
      setTimeout(() => animation.start(), index * 50);
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
    } else {
      stopAnimations();
    }
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
      setTranscript('');
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
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
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecordingState('idle');
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      console.log('Starting transcription for:', uri);
      
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('audio', blob, 'recording.webm');
      } else {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        const audioFile = {
          uri,
          name: `recording.${fileType}`,
          type: `audio/${fileType}`,
        } as any;
        
        formData.append('audio', audioFile);
      }

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Transcription result:', data);
      
      setTranscript(data.text || 'No transcription available');
      setRecordingState('idle');
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscript('Failed to transcribe audio. Please try again.');
      setRecordingState('idle');
    }
  };

  const handleRecordPress = () => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>AURA</Text>
          <Text style={styles.subtitle}>Record. Reflect. Remember.</Text>
        </View>

        <View style={styles.content}>
          {recordingState === 'recording' && (
            <View style={styles.waveformContainer}>
              {waveAnims.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 120],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {transcript !== '' && recordingState === 'idle' && (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptLabel}>Transcript</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          )}

          {recordingState === 'idle' && transcript === '' && (
            <View style={styles.promptContainer}>
              <Text style={styles.promptText}>Tap the mic to start recording</Text>
              <Text style={styles.promptSubtext}>
                Your voice will be transcribed in real-time
              </Text>
            </View>
          )}
        </View>

        <View style={styles.recordButtonContainer}>
          {recordingState === 'processing' ? (
            <View style={styles.processingButton}>
              <Loader2 color={AuraColors.white} size={40} />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleRecordPress}
              style={styles.recordButtonTouchable}
              disabled={!permissionGranted}
            >
              <Animated.View
                style={[
                  styles.recordButton,
                  recordingState === 'recording' && styles.recordButtonActive,
                  { transform: [{ scale: recordingState === 'recording' ? pulseAnim : 1 }] },
                ]}
              >
                {recordingState === 'recording' ? (
                  <Square color={AuraColors.white} size={40} fill={AuraColors.white} />
                ) : (
                  <Mic color={AuraColors.white} size={40} />
                )}
              </Animated.View>
            </TouchableOpacity>
          )}
          
          {recordingState === 'recording' && (
            <Text style={styles.recordingText}>Recording...</Text>
          )}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: AuraColors.white,
    marginBottom: 4,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500' as const,
  },
  content: {
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
  },
  waveBar: {
    width: 4,
    backgroundColor: AuraColors.white,
    borderRadius: 2,
    opacity: 0.8,
  },
  transcriptContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptText: {
    fontSize: 18,
    color: AuraColors.white,
    lineHeight: 28,
  },
  promptContainer: {
    alignItems: 'center',
  },
  promptText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: AuraColors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  promptSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  recordButtonContainer: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  recordButtonTouchable: {
    alignItems: 'center',
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: AuraColors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  recordButtonActive: {
    backgroundColor: '#FF3366',
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuraColors.white,
    marginTop: 16,
  },
  processingButton: {
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuraColors.white,
  },
});

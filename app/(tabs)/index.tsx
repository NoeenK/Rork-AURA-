import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Play, MoreVertical, Upload, Clock, XCircle, Smartphone, AlertCircle } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

type RecordingState = 'idle' | 'recording' | 'processing';

type RecordingStatus = 'uploading' | 'transcribing' | 'failed' | 'completed' | 'on-device';

interface RecordingItem {
  id: string;
  title: string;
  subtitle?: string;
  duration: string;
  date: string;
  status: RecordingStatus;
  waveformData?: number[];
}

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'recordings' | 'folders'>('recordings');
  
  const [recordings, setRecordings] = useState<RecordingItem[]>([
    {
      id: '1',
      title: 'Recordings',
      subtitle: 'Uploading',
      duration: '00:42',
      date: 'Oct7 - 12:21',
      status: 'uploading',
    },
    {
      id: '2',
      title: 'Class',
      subtitle: 'Transcribing',
      duration: '00:42',
      date: 'Oct7 - 12:21',
      status: 'transcribing',
    },
    {
      id: '3',
      title: 'Math',
      subtitle: 'Failed',
      duration: '00:42',
      date: 'Oct7 - 12:21',
      status: 'failed',
    },
    {
      id: '4',
      title: 'University',
      subtitle: 'On Device Mode',
      duration: '00:42',
      date: 'Oct7 - 12:21',
      status: 'on-device',
    },
    {
      id: '5',
      title: 'Mechanics',
      subtitle: 'Mechanics of Hammer and String',
      duration: '00:42',
      date: 'Oct7 - 12:21',
      status: 'completed',
    },
  ]);
  
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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  const getStatusIcon = (status: RecordingStatus) => {
    switch (status) {
      case 'uploading':
        return <Upload color={AuraColors.statusUploading} size={16} />;
      case 'transcribing':
        return <Clock color={AuraColors.statusTranscribing} size={16} />;
      case 'failed':
        return <XCircle color={AuraColors.statusFailed} size={16} />;
      case 'on-device':
        return <Smartphone color={AuraColors.statusOnDevice} size={16} />;
      case 'completed':
        return <Play color={AuraColors.white} size={16} />;
    }
  };

  const getStatusColor = (status: RecordingStatus) => {
    switch (status) {
      case 'uploading':
        return AuraColors.statusUploading;
      case 'transcribing':
        return AuraColors.statusTranscribing;
      case 'failed':
        return AuraColors.statusFailed;
      case 'on-device':
        return AuraColors.statusOnDevice;
      case 'completed':
        return AuraColors.white;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Voix</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <AlertCircle color={AuraColors.accentOrange} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity>
            <Mic color="rgba(255, 255, 255, 0.4)" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recordings' && styles.tabActive]}
          onPress={() => setActiveTab('recordings')}
        >
          <Text style={[styles.tabText, activeTab === 'recordings' && styles.tabTextActive]}>
            Recordings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'folders' && styles.tabActive]}
          onPress={() => setActiveTab('folders')}
        >
          <Text style={[styles.tabText, activeTab === 'folders' && styles.tabTextActive]}>
            Folders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Import Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Import Voice</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {recordings.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.recordingItem}
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <View style={styles.recordingIcon}>
              {getStatusIcon(item.status)}
            </View>
            
            <View style={styles.recordingContent}>
              <View style={styles.recordingHeader}>
                <Text style={styles.recordingTitle}>{item.title}</Text>
                <Text style={styles.recordingDuration}>{item.duration}</Text>
              </View>
              <View style={styles.recordingFooter}>
                <View style={styles.recordingStatus}>
                  {item.subtitle && (
                    <Text
                      style={[
                        styles.recordingSubtitle,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <Text style={styles.recordingDate}>{item.date}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical color="rgba(255, 255, 255, 0.4)" size={20} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={handleRecordPress}
        activeOpacity={0.8}
      >
        <Mic color={AuraColors.white} size={28} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuraColors.darkBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: AuraColors.white,
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuraColors.darkCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: AuraColors.white,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: AuraColors.white,
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
  },
  tabTextActive: {
    color: AuraColors.white,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuraColors.darkCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  recordingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContent: {
    flex: 1,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuraColors.white,
  },
  recordingDuration: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
  },
  recordingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  recordingDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  moreButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AuraColors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});

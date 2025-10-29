import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Square } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { transcribeAudioFile, transcribeAudioFileWithSpeakers, generateSummary, generateAuraSummary, extractCalendarEvents, SonioxRealtimeTranscription, TranscriptionToken, SpeakerSegment as TranscriptionSpeakerSegment } from '@/lib/soniox-transcription';
import * as Haptics from 'expo-haptics';
import { useJournal } from '@/contexts/JournalContext';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';

type RecordingState = 'recording' | 'paused';

export default function RecordingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addEntry, deleteEntry } = useJournal();
  
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [transcriptionTokens, setTranscriptionTokens] = useState<TranscriptionToken[]>([]);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [liveTranscriptStatus, setLiveTranscriptStatus] = useState<string>('Initializing...');
  const [locationString, setLocationString] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number; } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const heartbeatScale = useRef(new Animated.Value(1)).current;
  const heartbeatOpacity = useRef(new Animated.Value(0.6)).current;

  const durationInterval = useRef<number | null>(null);
  const transcriptionInterval = useRef<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sonioxClient = useRef<SonioxRealtimeTranscription | null>(null);
  const audioStreamInterval = useRef<number | null>(null);

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

  const startHeartbeatAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(heartbeatScale, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(heartbeatOpacity, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartbeatScale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(heartbeatOpacity, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1800),
      ])
    ).start();
  }, [heartbeatScale, heartbeatOpacity]);

  const stopAnimations = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    heartbeatScale.stopAnimation();
    heartbeatScale.setValue(1);
    heartbeatOpacity.stopAnimation();
    heartbeatOpacity.setValue(0.6);
  }, [pulseAnim, heartbeatScale, heartbeatOpacity]);

  const startLiveTranscription = useCallback(async (rec: Audio.Recording) => {
    try {
      console.log('Starting live transcription with Soniox');
      setLiveTranscriptStatus('Connecting to transcription service...');
      
      const client = new SonioxRealtimeTranscription();
      sonioxClient.current = client;
      
      await client.connect({
        onTranscript: (text: string, isFinal: boolean, tokens?: TranscriptionToken[]) => {
          if (tokens && tokens.length > 0) {
            setTranscriptionTokens([...tokens]);
            setLiveTranscriptStatus('');
            console.log('Received tokens:', tokens.length, 'Text:', text.slice(0, 50));
            
            // Auto-scroll to bottom when new tokens arrive
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        },
        onError: (error: Error) => {
          console.error('Transcription error:', error);
          setLiveTranscriptStatus('Connected. Speak to start transcribing...');
        },
      });
      
      if (Platform.OS === 'web') {
        setLiveTranscriptStatus('Listening...');
        await client.startLiveRecording();
        console.log('Live recording stream started (Web)');
      } else {
        setLiveTranscriptStatus('Recording... (Transcription after completion)');
        console.log('Mobile: expo-av does not support real-time streaming');
      }
      
    } catch (error) {
      console.error('Failed to start live transcription:', error);
      setLiveTranscriptStatus(Platform.OS === 'web' ? 'Microphone access required' : 'Recording...');
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setLocationCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          if (reverseGeocode && reverseGeocode.length > 0) {
            const addr = reverseGeocode[0];
            const locationStr = [addr.street, addr.city, addr.region]
              .filter(Boolean)
              .join(', ');
            setLocationString(locationStr || 'Unknown location');
          }
        } catch (error) {
          console.log('Location error:', error);
        }
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
      setRecordingDuration(0);
      setLiveTranscriptStatus('Connecting to transcription service...');
      console.log('Recording started');

      startLiveTranscription(newRecording);
    } catch (error) {
      console.error('Failed to start recording:', error);
      router.back();
    }
  }, [startLiveTranscription]);

  useEffect(() => {
    startRecording();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
      }
      if (audioStreamInterval.current) {
        clearInterval(audioStreamInterval.current);
      }
      if (sonioxClient.current) {
        sonioxClient.current.disconnect();
      }
    };
  }, [startRecording]);

  useEffect(() => {
    if (recordingState === 'recording') {
      startPulseAnimation();
      startHeartbeatAnimation();
      
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
  }, [recordingState, startPulseAnimation, startHeartbeatAnimation, stopAnimations]);

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('Stopping recording...');
      
      if (transcriptionInterval.current) {
        clearInterval(transcriptionInterval.current);
        transcriptionInterval.current = null;
      }
      
      if (audioStreamInterval.current) {
        clearInterval(audioStreamInterval.current);
        audioStreamInterval.current = null;
      }
      
      if (sonioxClient.current) {
        sonioxClient.current.disconnect();
        sonioxClient.current = null;
      }
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped, URI:', uri);
      
      const webTranscript = Platform.OS === 'web' && transcriptionTokens.length > 0
        ? transcriptionTokens.map(t => t.text).join('')
        : null;
      
      setRecording(null);
      recordingRef.current = null;

      router.back();

      if (uri) {
        await transcribeAndSaveAudio(uri, webTranscript);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      router.back();
    }
  };

  const transcribeAndSaveAudio = async (uri: string, existingTranscript: string | null) => {
    const tempId = Date.now().toString();
    
    try {
      addEntry({
        title: 'Processing...',
        audioUri: uri,
        transcript: '',
        summary: '',
        date: new Date().toLocaleString(),
        duration: recordingDuration,
        isProcessing: true,
      });
      
      let text = existingTranscript;
      let segments: TranscriptionSpeakerSegment[] = [];
      
      if (!text || text.trim().length === 0) {
        console.log('Transcribing full audio with Soniox (with speakers and translation)...');
        const result = await transcribeAudioFileWithSpeakers(uri);
        text = result.transcript;
        segments = result.segments;
        console.log('Transcription completed:', text.slice(0, 100), 'with', segments.length, 'segments');
      } else {
        console.log('Using real-time transcription from Soniox (Web)');
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

      deleteEntry(tempId);
      addEntry({
        title,
        audioUri: uri,
        transcript: text,
        transcriptWithSpeakers: segments.length > 0 ? segments : undefined,
        summary,
        auraSummary,
        calendarEvents,
        date: new Date().toLocaleString(),
        duration: recordingDuration,
        isProcessing: false,
        location: locationString || undefined,
        locationCoords: locationCoords || undefined,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      deleteEntry(tempId);
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

  const tokensBySegment = useMemo(() => {
    if (transcriptionTokens.length === 0) {
      return [];
    }

    type Segment = { speaker: string; language: string; text: string };
    const segments: Segment[] = [];
    let currentSegment: Segment | null = null;
    
    for (const token of transcriptionTokens) {
      const speaker = token.speaker || 'Speaker 1';
      const language = token.language || 'en';
      
      if (!currentSegment || currentSegment.speaker !== speaker || currentSegment.language !== language) {
        if (currentSegment && currentSegment.text.trim()) {
          segments.push(currentSegment);
        }
        currentSegment = { speaker, language, text: token.text };
      } else {
        currentSegment.text += token.text;
      }
    }
    
    if (currentSegment && currentSegment.text.trim()) {
      segments.push(currentSegment);
    }
    
    return segments;
  }, [transcriptionTokens]);

  const getLanguageDisplay = useCallback((lang: string): string => {
    const langMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ko': 'Korean',
      'ja': 'Japanese',
      'zh': 'Chinese',
    };
    return langMap[lang] || lang.toUpperCase();
  }, []);

  const speakerColors: Record<string, string> = {
    'Speaker 1': '#4CAF50',
    'Speaker 2': '#2196F3',
    'Speaker 3': '#FF5252',
    'Speaker 4': '#FF9800',
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
        
        <View style={styles.scrollContent}>
          <View style={styles.recordingSection}>
            <View style={styles.heartbeatContainer}>
              <Animated.View
                style={[
                  styles.glassCircle,
                  {
                    opacity: recordingState === 'recording' ? heartbeatOpacity : 0.3,
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.glassCircleGradient}
                />
                <View style={styles.glassCircleBorder} />
              </Animated.View>
            </View>
            
            <Text style={styles.recordingDuration}>
              {formatDuration(recordingDuration)}
            </Text>
            {recordingState === 'paused' && (
              <Text style={styles.pausedLabel}>PAUSED</Text>
            )}
          </View>

          <View style={styles.glassTranscriptBox}>
            <View style={styles.glassTranscriptBoxInner}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassGradient}
            />
            <LinearGradient
              colors={['rgba(255, 165, 0, 0.15)', 'rgba(255, 107, 53, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orangeGradientOverlay}
            />
            <ScrollView 
              ref={scrollViewRef}
              style={styles.glassScrollView}
              contentContainerStyle={styles.glassScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {tokensBySegment.length === 0 ? (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.transcriptPlaceholder}>{liveTranscriptStatus}</Text>
                  <Text style={styles.transcriptSubtext}>Speak clearly into your microphone</Text>
                </View>
              ) : (
                tokensBySegment.map((segment, idx) => (
                  <View key={idx} style={styles.transcriptSegment}>
                    <View style={styles.segmentHeader}>
                      <Text style={[styles.speakerLabel, { color: speakerColors[segment.speaker] || '#4CAF50' }]}>
                        {segment.speaker.toUpperCase()}
                      </Text>
                      <View style={styles.languageBadge}>
                        <Text style={styles.languageText}>
                          {getLanguageDisplay(segment.language)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.segmentText}>{segment.text.trim()}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            </View>
          </View>
        </View>



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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
    fontWeight: '200' as const,
    color: colors.text,
    marginBottom: 24,
    fontFamily: 'System',
    letterSpacing: 4,
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
    paddingHorizontal: 24,
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
  heartbeatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 32,
  },
  glassCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glassCircleGradient: {
    width: '100%',
    height: '100%',
  },
  glassCircleBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.4)',
  },
  glassTranscriptBox: {
    flex: 1,
    marginTop: 16,
    maxHeight: 150,
    minHeight: 150,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glassTranscriptBoxInner: {
    flex: 1,
  },
  glassGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glassScrollView: {
    flex: 1,
  },
  glassScrollContent: {
    padding: 20,
  },
  orangeGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  placeholderContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  transcriptPlaceholder: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    opacity: 0.9,
  },
  transcriptSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    opacity: 0.6,
  },
  transcriptSegment: {
    marginBottom: 16,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  speakerLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  languageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
  },
  languageText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.text,
    opacity: 0.8,
  },
  segmentText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '400' as const,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Modal, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Pause, RotateCcw, RotateCw, MoreVertical, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Audio } from 'expo-av';

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [selectedFullEntry, setSelectedFullEntry] = useState<any | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportOptionsMenu, setShowExportOptionsMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const waveAnims = useRef(
    Array.from({ length: 40 }, () => new Animated.Value(0.3))
  ).current;
  
  useEffect(() => {
    if (selectedFullEntry && selectedFullEntry.audioUri) {
      loadSound();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [selectedFullEntry]);

  useEffect(() => {
    if (isPlaying) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isPlaying]);

  const loadSound = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedFullEntry.audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        sound?.setPositionAsync(0);
      }
    }
  };

  const startWaveAnimation = () => {
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
  };

  const stopWaveAnimation = () => {
    waveAnims.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0.3);
    });
  };

  const handleEntryPress = (entry: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedFullEntry(entry);
  };

  const handlePlayPause = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleRewind = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;
    const newPosition = Math.max(0, position - 15000);
    await sound.setPositionAsync(newPosition);
  };

  const handleForward = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;
    const newPosition = Math.min(duration, position + 15000);
    await sound.setPositionAsync(newPosition);
  };

  const handleSpeedToggle = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;

    const speeds = [1.0, 1.5, 2.0, 0.5];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    try {
      await sound.setRateAsync(nextSpeed, true);
    } catch (error) {
      console.error('Error setting playback speed:', error);
    }
  };

  const handlePreviousEntry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const currentIndex = entries.findIndex(e => e.id === selectedFullEntry?.id);
    if (currentIndex < entries.length - 1) {
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync());
        setSound(null);
      }
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setSelectedFullEntry(entries[currentIndex + 1]);
    }
  };

  const handleNextEntry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const currentIndex = entries.findIndex(e => e.id === selectedFullEntry?.id);
    if (currentIndex > 0) {
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync());
        setSound(null);
      }
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setSelectedFullEntry(entries[currentIndex - 1]);
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExportAudio = () => {
    console.log('Exporting audio...');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExportMenu(false);
  };

  const handleExportSummary = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExportMenu(false);
    setShowExportOptionsMenu(true);
  };

  const handleExportAsWord = () => {
    console.log('Exporting as Word doc...');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExportOptionsMenu(false);
  };

  const handleExportAsPDF = () => {
    console.log('Exporting as PDF...');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExportOptionsMenu(false);
  };

  const handleExportAsText = () => {
    console.log('Exporting as Text file...');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowExportOptionsMenu(false);
  };

  const getCurrentWord = () => {
    if (!selectedFullEntry?.transcript) return -1;
    const words = selectedFullEntry.transcript.split(' ');
    const secondsPerWord = duration / words.length / 1000;
    const currentSecond = position / 1000;
    return Math.floor(currentSecond / secondsPerWord);
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
          <Text style={styles.title}>Journal</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={28} />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No journal entries yet</Text>
              <Text style={styles.emptySubtext}>
                Start recording to create your first entry
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                activeOpacity={0.7}
                onPress={() => handleEntryPress(entry)}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryTitleRow}>
                    <Play color={AuraColors.accentOrange} size={20} fill={AuraColors.accentOrange} />
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                  </View>
                  <Text style={styles.entryDuration}>
                    {Math.floor(entry.duration / 60)}:{(entry.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.entrySummary} numberOfLines={2}>
                  {entry.summary}
                </Text>
                <View style={styles.transcriptPreview}>
                  <Text style={styles.transcriptLabel}>Transcript</Text>
                  <Text style={styles.transcriptPreviewText} numberOfLines={3}>
                    {entry.transcript}
                  </Text>
                </View>
                <Text style={styles.entryDate}>{entry.date}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {selectedFullEntry && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedFullEntry(null)}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            
            <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
              <Text style={styles.modalTitle}>Journal Entry</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={() => setShowExportMenu(true)} style={styles.menuButton}>
                  <MoreVertical color={colors.text} size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  if (sound) {
                    sound.stopAsync().then(() => sound.unloadAsync());
                    setSound(null);
                  }
                  setIsPlaying(false);
                  setPosition(0);
                  setDuration(0);
                  setSelectedFullEntry(null);
                }} style={styles.closeButton}>
                  <X color={colors.text} size={28} />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 180 }]}
            >
              <View style={styles.modalEntryCard}>
                <Text style={styles.entryDateTop}>{selectedFullEntry.date}</Text>
                
                <View style={styles.entryHeader}>
                  <View style={styles.entryTitleRow}>
                    <Text style={styles.entryTitle} numberOfLines={2}>
                      {selectedFullEntry.title}
                    </Text>
                  </View>
                </View>
                
                {selectedFullEntry.auraSummary && (
                  <View style={styles.auraSummarySection}>
                    <Text style={styles.auraSummaryTitle}>AURA Summary</Text>
                    
                    <View style={styles.overviewSection}>
                      <Text style={styles.overviewLabel}>Overview</Text>
                      <Text style={styles.overviewText}>{selectedFullEntry.auraSummary.overview}</Text>
                    </View>
                    
                    {selectedFullEntry.auraSummary.tasks && selectedFullEntry.auraSummary.tasks.length > 0 && (
                      <View style={styles.tasksSection}>
                        <Text style={styles.tasksLabel}>Tasks To Do</Text>
                        {selectedFullEntry.auraSummary.tasks.map((task: string, idx: number) => (
                          <View key={idx} style={styles.taskItem}>
                            <View style={styles.taskBullet} />
                            <Text style={styles.taskText}>{task}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                
                <View style={styles.transcriptSection}>
                  <View style={styles.transcriptTabContainer}>
                    <View style={styles.transcriptTab}>
                      <Text style={styles.transcriptTabText}>Transcription</Text>
                      <View style={styles.transcriptTabUnderline} />
                    </View>
                  </View>
                  <View style={styles.transcriptContent}>
                    <Text style={styles.fullTranscriptText}>
                      {selectedFullEntry.transcript.split(' ').map((word: string, idx: number) => {
                        const isCurrentWord = isPlaying && idx === getCurrentWord();
                        return (
                          <Text
                            key={idx}
                            style={[
                              styles.transcriptWord,
                              isCurrentWord && styles.highlightedWord,
                            ]}
                          >
                            {word}{idx < selectedFullEntry.transcript.split(' ').length - 1 ? ' ' : ''}
                          </Text>
                        );
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={[styles.fixedAudioPlayer, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.waveformContainerBottom}>
                {waveAnims.map((anim, index) => {
                  const progress = duration > 0 ? position / duration : 0;
                  const barProgress = index / waveAnims.length;
                  const isPastProgress = barProgress <= progress;
                  
                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.waveBarBottom,
                        {
                          height: isPlaying ? anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [4, 32],
                          }) : 16,
                          backgroundColor: isPastProgress ? AuraColors.accentOrange : colors.textSecondary,
                          opacity: isPastProgress ? 1 : 0.3,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              
              <View style={styles.timeContainerBottom}>
                <Text style={styles.timeTextBottom}>{formatTime(position)}</Text>
                <Text style={styles.timeTextBottom}>{formatTime(duration)}</Text>
              </View>
              
              <View style={styles.playerControlsBottom}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={handlePreviousEntry}
                  activeOpacity={0.7}
                >
                  <ChevronLeft color={colors.text} size={28} strokeWidth={3} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallControlButton}
                  onPress={handleRewind}
                  activeOpacity={0.7}
                >
                  <RotateCcw color={colors.text} size={20} />
                  <Text style={styles.smallControlLabel}>15</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playButtonBottom}
                  onPress={handlePlayPause}
                  activeOpacity={0.8}
                >
                  {isPlaying ? (
                    <View style={styles.pauseIconBottom}>
                      <View style={styles.pauseBarBottom} />
                      <View style={styles.pauseBarBottom} />
                    </View>
                  ) : (
                    <Play color={AuraColors.white} size={28} fill={AuraColors.white} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallControlButton}
                  onPress={handleForward}
                  activeOpacity={0.7}
                >
                  <RotateCw color={colors.text} size={20} />
                  <Text style={styles.smallControlLabel}>15</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={handleNextEntry}
                  activeOpacity={0.7}
                >
                  <ChevronRight color={colors.text} size={28} strokeWidth={3} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                onPress={handleSpeedToggle} 
                activeOpacity={0.7}
                style={styles.speedControlButton}
              >
                <Text style={styles.playbackSpeedBottom}>x{playbackSpeed.toFixed(1)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      
      {showExportMenu && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExportMenu(false)}
        >
          <TouchableOpacity
            style={styles.exportMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowExportMenu(false)}
          >
            <View style={styles.exportMenuContainer}>
              <TouchableOpacity
                style={styles.exportMenuItem}
                onPress={handleExportAudio}
                activeOpacity={0.7}
              >
                <Download color={colors.text} size={20} />
                <Text style={styles.exportMenuText}>Export Audio</Text>
              </TouchableOpacity>
              <View style={styles.exportMenuDivider} />
              <TouchableOpacity
                style={styles.exportMenuItem}
                onPress={handleExportSummary}
                activeOpacity={0.7}
              >
                <FileText color={colors.text} size={20} />
                <Text style={styles.exportMenuText}>Export Summary</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showExportOptionsMenu && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExportOptionsMenu(false)}
        >
          <TouchableOpacity
            style={styles.exportMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowExportOptionsMenu(false)}
          >
            <View style={styles.exportMenuContainer}>
              <TouchableOpacity
                style={styles.exportMenuItem}
                onPress={handleExportAsWord}
                activeOpacity={0.7}
              >
                <FileText color={colors.text} size={20} />
                <Text style={styles.exportMenuText}>Export as Word Doc</Text>
              </TouchableOpacity>
              <View style={styles.exportMenuDivider} />
              <TouchableOpacity
                style={styles.exportMenuItem}
                onPress={handleExportAsPDF}
                activeOpacity={0.7}
              >
                <FileText color={colors.text} size={20} />
                <Text style={styles.exportMenuText}>Export as PDF</Text>
              </TouchableOpacity>
              <View style={styles.exportMenuDivider} />
              <TouchableOpacity
                style={styles.exportMenuItem}
                onPress={handleExportAsText}
                activeOpacity={0.7}
              >
                <FileText color={colors.text} size={20} />
                <Text style={styles.exportMenuText}>Export as Text File</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: AuraColors.accentOrange,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    flex: 1,
  },
  entryDuration: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AuraColors.accentOrange,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entrySummary: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '500' as const,
  },
  transcriptPreview: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  transcriptPreviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  entryDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  entryDateTop: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 24,
  },
  modalEntryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  playAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: AuraColors.accentOrange,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginVertical: 20,
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playAudioButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: AuraColors.white,
  },
  auraSummarySection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: AuraColors.accentOrange,
  },
  auraSummaryTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: AuraColors.accentOrange,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  overviewSection: {
    marginBottom: 20,
  },
  overviewLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    opacity: 0.7,
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '500' as const,
  },
  tasksSection: {
    marginTop: 12,
  },
  tasksLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    opacity: 0.7,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  taskBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AuraColors.accentOrange,
    marginTop: 8,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '500' as const,
  },
  transcriptSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary,
  },
  transcriptSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    opacity: 0.7,
  },
  transcriptTabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  transcriptTab: {
    paddingBottom: 8,
  },
  transcriptTabText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    marginBottom: 4,
  },
  transcriptTabUnderline: {
    height: 3,
    backgroundColor: AuraColors.accentOrange,
    borderRadius: 1.5,
  },
  transcriptContent: {
    marginBottom: 32,
  },
  fullTranscriptText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '400' as const,
  },
  transcriptWord: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '400' as const,
  },
  highlightedWord: {
    color: AuraColors.accentOrange,
    fontWeight: '700' as const,
  },
  audioPlayerSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 2,
    marginBottom: 16,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  playbackSpeed: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 8,
  },
  controlButton: {
    padding: 12,
  },
  controlIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.text,
  },
  playButtonLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AuraColors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
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
  exportMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportMenuContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 8,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  exportMenuText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  exportMenuDivider: {
    height: 1,
    backgroundColor: colors.background,
    marginHorizontal: 8,
  },
  fixedAudioPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  waveformContainerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
    marginBottom: 12,
  },
  waveBarBottom: {
    width: 3,
    borderRadius: 1.5,
  },
  timeContainerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  timeTextBottom: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  playbackSpeedBottom: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
  },
  speedControlButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -18 }],
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  playerControlsBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    position: 'relative',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  smallControlLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '700' as const,
    color: colors.text,
  },
  playButtonBottom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AuraColors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  pauseIconBottom: {
    flexDirection: 'row',
    gap: 5,
  },
  pauseBarBottom: {
    width: 3,
    height: 20,
    backgroundColor: AuraColors.white,
    borderRadius: 1.5,
  },
});

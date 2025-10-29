import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Modal, Animated, PanResponder, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Pause, RotateCcw, RotateCw, MoreVertical, Download, FileText, ChevronLeft, ChevronRight, Calendar, MapPin, User, Clock, Send, Mail, Link as LinkIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import { generateText } from '@rork/toolkit-sdk';

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [previousEntriesLength, setPreviousEntriesLength] = useState(entries.length);
  const [selectedFullEntry, setSelectedFullEntry] = useState<any | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportOptionsMenu, setShowExportOptionsMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'todo' | 'transcript'>('summary');
  const [checkedTodos, setCheckedTodos] = useState<Record<number, boolean>>({});
  const [generatedTodos, setGeneratedTodos] = useState<Record<string, string[]>>({});
  const [isGeneratingTodo, setIsGeneratingTodo] = useState(false);
  const [editableSummary, setEditableSummary] = useState('');
  const [editableTodos, setEditableTodos] = useState<string[]>([]);
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showNewEntryPopup, setShowNewEntryPopup] = useState(false);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const popupAnim = useRef(new Animated.Value(0)).current;
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          router.back();
        }
      },
    })
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
    if (entries.length > previousEntriesLength) {
      const latestEntry = entries[0];
      setNewEntryId(latestEntry.id);
      setShowNewEntryPopup(true);
      
      Animated.sequence([
        Animated.timing(popupAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(popupAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowNewEntryPopup(false);
        setNewEntryId(null);
      });
    }
    setPreviousEntriesLength(entries.length);
  }, [entries.length]);

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

      const progress = status.durationMillis > 0 ? status.positionMillis / status.durationMillis : 0;
      progressAnim.setValue(progress);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        sound?.setPositionAsync(0);
        progressAnim.setValue(0);
      }
    }
  };



  const handleEntryPress = (entry: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedFullEntry(entry);
    setEditableSummary(entry.auraSummary?.overview || entry.summary);
    const todos = entry.auraSummary?.tasks || generatedTodos[entry.id] || [];
    setEditableTodos(todos.map((t: any) => typeof t === 'string' ? t : t.task || String(t)));
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

  const handleNewEntryPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const entry = entries.find(e => e.id === newEntryId);
    if (entry) {
      handleEntryPress(entry);
      popupAnim.setValue(0);
      setShowNewEntryPopup(false);
      setNewEntryId(null);
    }
  };

  const handleTabPress = async (tab: 'summary' | 'todo' | 'transcript') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTab(tab);
    
    if (tab === 'todo' && selectedFullEntry && !generatedTodos[selectedFullEntry.id] && !selectedFullEntry.auraSummary?.tasks) {
      await generateTodoList();
    }
  };

  const generateTodoList = async () => {
    if (!selectedFullEntry || isGeneratingTodo) return;
    
    try {
      setIsGeneratingTodo(true);
      const prompt = `Based on this transcript, extract a list of actionable to-do items or tasks. Return only the tasks as a numbered list, one per line. If there are no clear tasks, return "No actionable items found."

Transcript:
${selectedFullEntry.transcript}`;
      
      const response = await generateText(prompt);
      const tasks = response
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(task => task && task !== 'No actionable items found.');
      
      setGeneratedTodos(prev => ({
        ...prev,
        [selectedFullEntry.id]: tasks
      }));
    } catch (error) {
      console.error('Error generating todo list:', error);
    } finally {
      setIsGeneratingTodo(false);
    }
  };

  const handleTodoToggle = (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCheckedTodos(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const styles = createStyles(colors);
  
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
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
                style={[styles.entryCard, entry.isProcessing && styles.processingCard]}
                activeOpacity={entry.isProcessing ? 1 : 0.7}
                onPress={() => !entry.isProcessing && handleEntryPress(entry)}
                disabled={entry.isProcessing}
              >
                {entry.isProcessing ? (
                  <View style={styles.processingContainer}>
                    <View style={styles.processingDotContainer}>
                      <Animated.View style={[styles.processingDot, { opacity: 0.4 }]} />
                      <Animated.View style={[styles.processingDot, { opacity: 0.6 }]} />
                      <Animated.View style={[styles.processingDot, { opacity: 0.8 }]} />
                    </View>
                    <Text style={styles.processingTitle}>Processing Recording...</Text>
                    <Text style={styles.processingSubtext}>Transcribing audio and generating summary</Text>
                    <View style={styles.entryTopRow}>
                      <View style={styles.entryDateTimeRow}>
                        <Calendar color={colors.textSecondary} size={14} />
                        <Text style={styles.entryDate}>{entry.date}</Text>
                      </View>
                    </View>
                    <View style={styles.entryDateTimeRow}>
                      <Clock color={colors.textSecondary} size={14} />
                      <Text style={styles.entryDate}>{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} | {entry.duration < 60 ? `${entry.duration}s` : `${Math.floor(entry.duration / 60)} min`}</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.entryTopRowMain}>
                      <View style={styles.entryTopRow}>
                        <View style={styles.entryDateTimeRow}>
                          <Calendar color={colors.textSecondary} size={14} />
                          <Text style={styles.entryDateTop}>{entry.date}</Text>
                        </View>
                      </View>
                      <View style={styles.entryDateTimeRow}>
                        <Clock color={colors.textSecondary} size={14} />
                        <Text style={styles.entryDateTop}>
                          {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} | {entry.duration < 60 ? `${entry.duration}s` : `${Math.floor(entry.duration / 60)} min`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.entryHeader}>
                      <View style={styles.entryTitleRow}>
                        <Play color={AuraColors.accentOrange} size={20} fill={AuraColors.accentOrange} />
                        <Text style={styles.entryTitle} numberOfLines={1}>
                          {entry.title}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.entrySummary} numberOfLines={2}>
                      {entry.summary}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        
        {showNewEntryPopup && (
          <Animated.View
            style={[
              styles.newEntryPopup,
              {
                opacity: popupAnim,
                transform: [
                  {
                    translateY: popupAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleNewEntryPress}
              activeOpacity={0.9}
              style={styles.newEntryPopupContent}
            >
              <LinearGradient
                colors={[AuraColors.accentOrange, '#FF8C42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newEntryPopupGradient}
              >
                <Play color={AuraColors.white} size={18} fill={AuraColors.white} />
                <Text style={styles.newEntryPopupText}>New Entry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
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
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowShareMenu(selectedFullEntry.id);
                  }}
                  activeOpacity={0.7}
                  style={styles.shareButtonModal}
                >
                  <LinearGradient
                    colors={['rgba(255, 138, 0, 0.2)', 'rgba(255, 110, 64, 0.25)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shareButtonGradient}
                  >
                    <Send color={AuraColors.accentOrange} size={16} strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
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
                <Text style={styles.summaryTitle} numberOfLines={2}>
                  {selectedFullEntry.auraSummary?.overview || selectedFullEntry.title}
                </Text>
                
                <View style={styles.entryMetadata}>
                  <View style={styles.metadataRow}>
                    <User color={colors.textSecondary} size={16} strokeWidth={2} />
                    <Text style={styles.metadataText}>Noeen Kashif</Text>
                  </View>
                  <View style={styles.metadataRow}>
                    <Calendar color={colors.textSecondary} size={16} strokeWidth={2} />
                    <Text style={styles.metadataText}>
                      {selectedFullEntry.date}
                    </Text>
                  </View>
                  <View style={styles.metadataRow}>
                    <Clock color={colors.textSecondary} size={16} strokeWidth={2} />
                    <Text style={styles.metadataText}>
                      {new Date(selectedFullEntry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} | {selectedFullEntry.duration < 60 ? `${selectedFullEntry.duration}s` : `${Math.floor(selectedFullEntry.duration / 60)} min`}
                    </Text>
                  </View>
                  {selectedFullEntry.location && (
                    <View style={styles.metadataRow}>
                      <MapPin color={colors.textSecondary} size={16} strokeWidth={2} />
                      <Text style={styles.metadataText} numberOfLines={1}>
                        {selectedFullEntry.location}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.tabButtonWrapper}>
                  <LinearGradient
                    colors={['rgba(255, 138, 0, 0.15)', 'rgba(255, 110, 64, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabButtonGradientBorder}
                  >
                    <View style={styles.tabButtonContainer}>
                      <TouchableOpacity 
                        style={[styles.tabButton, selectedTab === 'summary' && styles.tabButtonActive]}
                        onPress={() => handleTabPress('summary')}
                        activeOpacity={0.7}
                      >
                        {selectedTab === 'summary' && (
                          <LinearGradient
                            colors={['rgba(255, 138, 0, 0.25)', 'rgba(255, 110, 64, 0.25)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        <Text style={[styles.tabButtonText, selectedTab === 'summary' && styles.tabButtonTextActive]}>AI Summary</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.tabButton, selectedTab === 'todo' && styles.tabButtonActive]}
                        onPress={() => handleTabPress('todo')}
                        activeOpacity={0.7}
                      >
                        {selectedTab === 'todo' && (
                          <LinearGradient
                            colors={['rgba(255, 138, 0, 0.25)', 'rgba(255, 110, 64, 0.25)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        <Text style={[styles.tabButtonText, selectedTab === 'todo' && styles.tabButtonTextActive]}>To-Do</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.tabButton, selectedTab === 'transcript' && styles.tabButtonActive]}
                        onPress={() => handleTabPress('transcript')}
                        activeOpacity={0.7}
                      >
                        {selectedTab === 'transcript' && (
                          <LinearGradient
                            colors={['rgba(255, 138, 0, 0.25)', 'rgba(255, 110, 64, 0.25)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        <Text style={[styles.tabButtonText, selectedTab === 'transcript' && styles.tabButtonTextActive]}>Transcription</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
                
                {selectedTab === 'summary' && (
                  <View style={styles.auraSummarySection}>
                    <View style={styles.overviewSection}>
                      <Text
                        style={styles.summaryDisplayText}
                        numberOfLines={12}
                      >
                        {editableSummary || 'No summary available'}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedTab === 'todo' && (
                  <View style={styles.todoSection}>
                    {isGeneratingTodo ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={AuraColors.accentOrange} />
                        <Text style={styles.loadingText}>Generating to-do list...</Text>
                      </View>
                    ) : (
                      editableTodos.length > 0 ? (
                        editableTodos.map((task: string, idx: number) => (
                          <View key={idx} style={styles.todoItemContainer}>
                            <TouchableOpacity 
                              style={styles.todoCheckboxContainer}
                              onPress={() => handleTodoToggle(idx)}
                              activeOpacity={0.7}
                            >
                              <LinearGradient
                                colors={checkedTodos[idx] ? ['rgba(255, 138, 0, 0.3)', 'rgba(255, 110, 64, 0.3)'] : ['rgba(255, 138, 0, 0.15)', 'rgba(255, 110, 64, 0.15)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.todoCheckboxSquare}
                              >
                                {checkedTodos[idx] && (
                                  <Text style={styles.checkmarkText}>✓</Text>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                            <TextInput
                              style={[styles.editableTodoText, checkedTodos[idx] && styles.todoTextChecked]}
                              value={task}
                              onChangeText={(text) => {
                                const newTodos = [...editableTodos];
                                newTodos[idx] = text;
                                setEditableTodos(newTodos);
                              }}
                              multiline
                              placeholderTextColor={colors.textSecondary}
                            />
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noTodoText}>No actionable items found in this recording.</Text>
                      )
                    )}
                  </View>
                )}
                
                {selectedTab === 'transcript' && (
                  <View style={styles.transcriptContent}>
                    {selectedFullEntry.transcriptWithSpeakers ? (
                      selectedFullEntry.transcriptWithSpeakers.map((segment: any, segIdx: number) => (
                        <View key={segIdx} style={styles.speakerSegment}>
                          {segment.speaker && (
                            <View style={styles.speakerTag}>
                              <View style={styles.speakerDot} />
                              <Text style={styles.speakerLabel}>Speaker {segment.speaker}</Text>
                              {segment.language && segment.language !== 'en' && (
                                <View style={styles.languageIndicator}>
                                  <Text style={styles.languageIndicatorText}>
                                    {segment.language.toUpperCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                          <Text style={styles.segmentText}>{segment.text}</Text>
                          {segment.translation && segment.translation.trim() !== segment.text.trim() && (
                            <View style={styles.translationContainer}>
                              <Text style={styles.translationLabel}>English Translation:</Text>
                              <Text style={styles.translationText}>{segment.translation}</Text>
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
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
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={[styles.fixedAudioPlayer, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.waveformAndSpeedRow}>
                <View style={styles.waveformContainerBottom}>
                  <View style={styles.staticWaveform}>
                    {Array.from({ length: 60 }).map((_, index) => {
                      const heights = [12, 20, 28, 24, 16, 32, 28, 20, 24, 18, 22, 30, 26, 18, 14, 24, 32, 28, 22, 26, 20, 24, 30, 26, 22, 18, 28, 24, 20, 16];
                      const height = heights[index % heights.length];
                      return (
                        <View
                          key={index}
                          style={[styles.staticWaveBar, { height }]}
                        />
                      );
                    })}
                  </View>
                  <Animated.View
                    style={[
                      styles.gradientOverlay,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[AuraColors.accentOrange, AuraColors.accentOrange]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.gradientWaveform}>
                      {Array.from({ length: 60 }).map((_, index) => {
                        const heights = [12, 20, 28, 24, 16, 32, 28, 20, 24, 18, 22, 30, 26, 18, 14, 24, 32, 28, 22, 26, 20, 24, 30, 26, 22, 18, 28, 24, 20, 16];
                        const height = heights[index % heights.length];
                        return (
                          <View
                            key={index}
                            style={[styles.gradientWaveBar, { height }]}
                          />
                        );
                      })}
                    </View>
                  </Animated.View>
                </View>
                <TouchableOpacity 
                  onPress={handleSpeedToggle} 
                  activeOpacity={0.7}
                  style={styles.speedControlButton}
                >
                  <Text style={styles.playbackSpeedBottom}>x{playbackSpeed.toFixed(1)}</Text>
                </TouchableOpacity>
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
                  <View style={styles.navButtonInner}>
                    <ChevronLeft color={colors.text} size={18} strokeWidth={2.5} />
                    <View style={styles.navButtonBar} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallControlButton}
                  onPress={handleRewind}
                  activeOpacity={0.7}
                >
                  <RotateCcw color={colors.text} size={18} />
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
                    <Play color={AuraColors.white} size={24} fill={AuraColors.white} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallControlButton}
                  onPress={handleForward}
                  activeOpacity={0.7}
                >
                  <RotateCw color={colors.text} size={18} />
                  <Text style={styles.smallControlLabel}>15</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={handleNextEntry}
                  activeOpacity={0.7}
                >
                  <View style={styles.navButtonInner}>
                    <View style={styles.navButtonBar} />
                    <ChevronRight color={colors.text} size={18} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>
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
      
      {showShareMenu && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowShareMenu(null)}
        >
          <TouchableOpacity
            style={styles.shareMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowShareMenu(null)}
          >
            <View style={styles.shareMenuContainer}>
              <Text style={styles.shareMenuTitle}>Share Entry</Text>
              <TouchableOpacity
                style={styles.shareMenuItem}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  console.log('Share via email');
                  setShowShareMenu(null);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.shareIconWrapper}>
                  <Mail color={AuraColors.accentOrange} size={20} />
                </View>
                <Text style={styles.shareMenuText}>Share via Email</Text>
              </TouchableOpacity>
              <View style={styles.shareMenuDivider} />
              <TouchableOpacity
                style={styles.shareMenuItem}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  console.log('Copy shareable link');
                  setShowShareMenu(null);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.shareIconWrapper}>
                  <LinkIcon color={AuraColors.accentOrange} size={20} />
                </View>
                <Text style={styles.shareMenuText}>Copy Shareable Link</Text>
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
    fontSize: 32,
    fontWeight: '400' as const,
    color: colors.text,
    letterSpacing: 2.5,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
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
    backgroundColor: 'rgba(237, 232, 220, 0.4)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: AuraColors.accentOrange,
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.15)',
  },
  processingCard: {
    borderLeftColor: AuraColors.warmBrown,
    backgroundColor: 'rgba(237, 232, 220, 0.25)',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingDotContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AuraColors.accentOrange,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
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
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  entryDateTop: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryTopRowMain: {
    marginBottom: 12,
  },
  entryDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonModal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.3)',
    borderRadius: 16,
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
    paddingHorizontal: 8,
  },
  modalEntryCard: {
    backgroundColor: 'rgba(237, 232, 220, 0.45)',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 32,
    marginBottom: 16,
  },
  entryMetadata: {
    gap: 10,
    marginBottom: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500' as const,
    flex: 1,
  },
  tabButtonWrapper: {
    marginBottom: 24,
  },
  tabButtonGradientBorder: {
    borderRadius: 18,
    padding: 1.5,
  },
  tabButtonContainer: {
    flexDirection: 'row',
    gap: 0,
    backgroundColor: 'rgba(245, 241, 232, 0.8)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabButtonActive: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 138, 0, 0.3)',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: AuraColors.accentOrange,
    fontWeight: '700' as const,
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
    backgroundColor: 'rgba(245, 241, 232, 0.5)',
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: AuraColors.accentOrange,
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.1)',
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
  todoSection: {
    marginTop: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  todoBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AuraColors.accentOrange,
    marginTop: 8,
  },
  todoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '500' as const,
  },
  todoTextChecked: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.5,
  },
  editableText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '500' as const,
    padding: 0,
    margin: 0,
  },
  summaryDisplayText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '500' as const,
  },
  todoItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  todoCheckboxContainer: {
    paddingTop: 2,
  },
  todoCheckboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 138, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
  },
  editableTodoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '500' as const,
    padding: 0,
    margin: 0,
  },
  speakerSegment: {
    marginBottom: 20,
  },
  speakerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 138, 0, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  speakerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AuraColors.accentOrange,
  },
  speakerLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  segmentText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '400' as const,
  },
  languageIndicator: {
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  languageIndicatorText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.text,
    opacity: 0.7,
  },
  translationContainer: {
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(100, 149, 237, 0.4)',
    paddingVertical: 8,
  },
  translationLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#6495ED',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  translationText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    fontWeight: '400' as const,
    fontStyle: 'italic' as const,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  noTodoText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
    textAlign: 'center',
    paddingVertical: 16,
  },
  transcriptSection: {
    marginTop: 8,
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
    marginTop: 8,
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
    paddingTop: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  waveformAndSpeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  waveformContainerBottom: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  staticWaveform: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  staticWaveBar: {
    width: 2,
    backgroundColor: '#999',
    borderRadius: 1,
    opacity: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gradientWaveform: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  gradientWaveBar: {
    width: 2,
    backgroundColor: '#FFB84D',
    borderRadius: 1,
  },
  timeContainerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  timeTextBottom: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  playbackSpeedBottom: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  speedControlButton: {
    paddingHorizontal: 0,
    minWidth: 32,
  },
  playerControlsBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -2,
  },
  navButtonBar: {
    width: 2,
    height: 14,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  smallControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  smallControlLabel: {
    position: 'absolute',
    fontSize: 7,
    fontWeight: '700' as const,
    color: colors.text,
  },
  playButtonBottom: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    gap: 4,
  },
  pauseBarBottom: {
    width: 3,
    height: 16,
    backgroundColor: AuraColors.white,
    borderRadius: 1.5,
  },
  newEntryPopup: {
    position: 'absolute',
    top: 80,
    left: 24,
    right: 24,
    zIndex: 1000,
  },
  newEntryPopupContent: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  newEntryPopupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  newEntryPopupText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: AuraColors.white,
    letterSpacing: 0.5,
  },
  shareMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareMenuContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.2)',
  },
  shareMenuTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  shareMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  shareIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 138, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMenuText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  shareMenuDivider: {
    height: 1,
    backgroundColor: colors.background,
    marginHorizontal: 8,
  },
});

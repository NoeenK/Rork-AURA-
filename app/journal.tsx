import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import RecordingPlaybackModal from '@/components/RecordingPlaybackModal';

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [selectedEntry, setSelectedEntry] = useState<{
    audioUri: string;
    transcript: string;
  } | null>(null);
  const [selectedFullEntry, setSelectedFullEntry] = useState<any | null>(null);
  
  const handleEntryPress = (entry: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedFullEntry(entry);
  };

  const handleClosePlayback = () => {
    setSelectedEntry(null);
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
              <TouchableOpacity onPress={() => setSelectedFullEntry(null)} style={styles.closeButton}>
                <X color={colors.text} size={28} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]}
            >
              <View style={styles.modalEntryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryTitleRow}>
                    <Play color={AuraColors.accentOrange} size={20} fill={AuraColors.accentOrange} />
                    <Text style={styles.entryTitle} numberOfLines={2}>
                      {selectedFullEntry.title}
                    </Text>
                  </View>
                  <Text style={styles.entryDuration}>
                    {Math.floor(selectedFullEntry.duration / 60)}:{(selectedFullEntry.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.playAudioButton}
                  onPress={() => {
                    setSelectedEntry({
                      audioUri: selectedFullEntry.audioUri,
                      transcript: selectedFullEntry.transcript,
                    });
                    setSelectedFullEntry(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Play color={AuraColors.white} size={20} fill={AuraColors.white} />
                  <Text style={styles.playAudioButtonText}>Play Recording</Text>
                </TouchableOpacity>
                
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
                  <Text style={styles.transcriptSectionTitle}>Full Transcript</Text>
                  <Text style={styles.fullTranscriptText}>{selectedFullEntry.transcript}</Text>
                </View>
                
                <Text style={styles.entryDate}>{selectedFullEntry.date}</Text>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
      
      {selectedEntry && (
        <RecordingPlaybackModal
          visible={true}
          audioUri={selectedEntry.audioUri}
          transcript={selectedEntry.transcript}
          onClose={handleClosePlayback}
        />
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
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 0.5,
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
  fullTranscriptText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    fontWeight: '400' as const,
  },
});

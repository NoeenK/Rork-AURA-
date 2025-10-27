import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
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
  
  const handleEntryPress = (entry: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedEntry({
      audioUri: entry.audioUri,
      transcript: entry.transcript,
    });
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
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Zap, CheckCircle, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { generateText } from '@rork/toolkit-sdk';

interface Action {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export default function ActionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateActions();
  }, [entries]);

  const generateActions = async () => {
    setIsLoading(true);
    try {
      const journalContext = entries.slice(0, 15).map(entry => ({
        date: entry.date,
        transcript: entry.transcript,
        summary: entry.summary,
        auraSummary: entry.auraSummary,
      }));

      const prompt = `Based on these journal entries, suggest 5-8 actionable items the user can do to improve their life, mental health, or achieve their goals. Each action should be:
- Specific and achievable
- Relevant to their journal content
- Categorized (Health, Career, Relationships, Self-Care, Learning, Other)
- Prioritized (high, medium, low)

Return valid JSON:
{
  "actions": [{"id": "1", "title": "Action Title", "description": "Detailed description", "priority": "high", "category": "Health"}]
}

Journal entries:
${JSON.stringify(journalContext, null, 2)}

If no entries, return: {"actions": []}`;

      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
      const cleanedResponse = response.trim().replace(/^```json?\s*|\s*```$/g, '');
      const parsed = JSON.parse(cleanedResponse);
      
      if (parsed.actions && Array.isArray(parsed.actions)) {
        setActions(parsed.actions);
      }
    } catch (error) {
      console.error('Error generating actions:', error);
      setActions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleComplete = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCompletedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return AuraColors.accentOrange;
      case 'low':
        return '#4CAF50';
      default:
        return AuraColors.accentOrange;
    }
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
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.back();
            }}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.text} size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Actions</Text>
          <View style={styles.backButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AuraColors.accentOrange} />
            <Text style={styles.loadingText}>Generating recommendations...</Text>
          </View>
        ) : actions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Zap color={colors.textSecondary} size={48} />
            <Text style={styles.emptyTitle}>No Actions Yet</Text>
            <Text style={styles.emptyText}>
              Create journal entries to receive personalized action items and recommendations.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Progress</Text>
              <Text style={styles.progressText}>
                {completedIds.size} of {actions.length} completed
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <LinearGradient
                    colors={[AuraColors.accentOrange, '#FF8C42']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${actions.length > 0 ? (completedIds.size / actions.length) * 100 : 0}%` }
                    ]}
                  />
                </View>
              </View>
            </View>

            {actions.map((action) => {
              const isCompleted = completedIds.has(action.id);
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionCard, isCompleted && styles.actionCardCompleted]}
                  onPress={() => toggleComplete(action.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionHeader}>
                    <View
                      style={[
                        styles.priorityIndicator,
                        { backgroundColor: getPriorityColor(action.priority) }
                      ]}
                    />
                    <View style={styles.actionHeaderText}>
                      <Text style={styles.actionCategory}>{action.category}</Text>
                      <Text style={[styles.actionTitle, isCompleted && styles.actionTitleCompleted]}>
                        {action.title}
                      </Text>
                    </View>
                    <View style={styles.checkboxContainer}>
                      {isCompleted ? (
                        <CheckCircle color={AuraColors.accentOrange} size={24} fill={AuraColors.accentOrange} />
                      ) : (
                        <View style={styles.checkboxEmpty} />
                      )}
                    </View>
                  </View>
                  
                  <Text style={[styles.actionDescription, isCompleted && styles.actionDescriptionCompleted]}>
                    {action.description}
                  </Text>
                  
                  <View style={styles.actionFooter}>
                    <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(action.priority)}20` }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(action.priority) }]}>
                        {action.priority.toUpperCase()}
                      </Text>
                    </View>
                    <ArrowRight color={colors.textSecondary} size={18} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
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
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarBackground: {
    flex: 1,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  actionCardCompleted: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginTop: 4,
  },
  actionHeaderText: {
    flex: 1,
  },
  actionCategory: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 24,
  },
  actionTitleCompleted: {
    textDecorationLine: 'line-through' as const,
  },
  checkboxContainer: {
    marginTop: 4,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  actionDescription: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
    opacity: 0.9,
  },
  actionDescriptionCompleted: {
    opacity: 0.5,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});

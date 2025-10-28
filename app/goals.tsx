import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Target, TrendingUp, Calendar, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { generateText } from '@rork/toolkit-sdk';

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  category: string;
  timeframe: string;
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    analyzeGoals();
  }, [entries]);

  const analyzeGoals = async () => {
    setIsLoading(true);
    try {
      const journalContext = entries.slice(0, 15).map(entry => ({
        date: entry.date,
        transcript: entry.transcript,
        summary: entry.summary,
      }));

      const prompt = `Analyze the following journal entries and identify the user's goals, aspirations, and objectives. For each goal, provide:
- A clear title
- A brief description
- An estimated progress percentage (0-100)
- A category (Career, Health, Personal, Relationships, Learning, Other)
- A timeframe (Short-term, Mid-term, Long-term)

Return ONLY a valid JSON array of goals with this structure:
[{"id": "1", "title": "Goal Title", "description": "Description", "progress": 50, "category": "Category", "timeframe": "Mid-term"}]

Journal entries:
${JSON.stringify(journalContext, null, 2)}

If no clear goals are found, return an empty array: []`;

      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
      
      const cleanedResponse = response.trim().replace(/^```json?\s*|\s*```$/g, '');
      const parsedGoals = JSON.parse(cleanedResponse);
      
      if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
        setGoals(parsedGoals);
        const avgProgress = parsedGoals.reduce((sum, g) => sum + g.progress, 0) / parsedGoals.length;
        setOverallProgress(Math.round(avgProgress));
      } else {
        setGoals([]);
        setOverallProgress(0);
      }
    } catch (error) {
      console.error('Error analyzing goals:', error);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'career':
        return <TrendingUp color={AuraColors.accentOrange} size={20} />;
      case 'health':
        return <Target color={AuraColors.accentOrange} size={20} />;
      case 'personal':
        return <Check color={AuraColors.accentOrange} size={20} />;
      default:
        return <Target color={AuraColors.accentOrange} size={20} />;
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
          <Text style={styles.title}>Goals</Text>
          <View style={styles.backButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AuraColors.accentOrange} />
            <Text style={styles.loadingText}>Analyzing your goals...</Text>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Target color={colors.textSecondary} size={48} />
            <Text style={styles.emptyTitle}>No Goals Found</Text>
            <Text style={styles.emptyText}>
              Start journaling about your aspirations and goals to see them here.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <Text style={styles.overviewTitle}>Overall Progress</Text>
                <Text style={styles.overviewPercentage}>{overallProgress}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <LinearGradient
                    colors={[AuraColors.accentOrange, '#FF8C42']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${overallProgress}%` }]}
                  />
                </View>
              </View>
              <Text style={styles.overviewSubtext}>{goals.length} active goals</Text>
            </View>

            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalIconContainer}>
                    {getCategoryIcon(goal.category)}
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalCategory}>{goal.category} • {goal.timeframe}</Text>
                  </View>
                </View>
                
                <Text style={styles.goalDescription}>{goal.description}</Text>
                
                <View style={styles.goalProgressContainer}>
                  <View style={styles.goalProgressBar}>
                    <LinearGradient
                      colors={[AuraColors.accentOrange, '#FF8C42']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.goalProgressFill, { width: `${goal.progress}%` }]}
                    />
                  </View>
                  <Text style={styles.goalProgressText}>{goal.progress}%</Text>
                </View>
              </View>
            ))}
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
  overviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  overviewPercentage: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: AuraColors.accentOrange,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  overviewSubtext: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  goalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  goalCategory: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  goalDescription: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 14,
    opacity: 0.9,
  },
  goalProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalProgressText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    minWidth: 40,
    textAlign: 'right',
  },
});

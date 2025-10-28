import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Brain, TrendingUp, Heart, Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { generateText } from '@rork/toolkit-sdk';

interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  type: 'positive' | 'neutral' | 'actionable';
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    analyzeInsights();
  }, [entries]);

  const analyzeInsights = async () => {
    setIsLoading(true);
    try {
      const journalContext = entries.slice(0, 15).map(entry => ({
        date: entry.date,
        transcript: entry.transcript,
        summary: entry.summary,
      }));

      const prompt = `Analyze the following journal entries and provide deep psychological and behavioral insights. For each insight:
- A category (Patterns, Emotions, Growth, Mindset, Behavior)
- A compelling title
- A detailed description
- Type: positive, neutral, or actionable

Also provide a brief overall summary (2-3 sentences) of the user's mental and emotional state.

Return a valid JSON object with this structure:
{
  "summary": "Overall summary text",
  "insights": [{"id": "1", "category": "Category", "title": "Title", "description": "Description", "type": "positive"}]
}

Journal entries:
${JSON.stringify(journalContext, null, 2)}

If no entries exist, return: {"summary": "", "insights": []}`;

      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
      
      const cleanedResponse = response.trim().replace(/^```json?\s*|\s*```$/g, '');
      const parsed = JSON.parse(cleanedResponse);
      
      if (parsed.insights && Array.isArray(parsed.insights)) {
        setInsights(parsed.insights);
        setSummary(parsed.summary || '');
      }
    } catch (error) {
      console.error('Error analyzing insights:', error);
      setInsights([]);
      setSummary('');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'emotions':
        return <Heart color={AuraColors.accentOrange} size={20} />;
      case 'growth':
        return <TrendingUp color={AuraColors.accentOrange} size={20} />;
      case 'mindset':
        return <Lightbulb color={AuraColors.accentOrange} size={20} />;
      default:
        return <Brain color={AuraColors.accentOrange} size={20} />;
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
          <Text style={styles.title}>Insights</Text>
          <View style={styles.backButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AuraColors.accentOrange} />
            <Text style={styles.loadingText}>Analyzing your journal...</Text>
          </View>
        ) : insights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Brain color={colors.textSecondary} size={48} />
            <Text style={styles.emptyTitle}>No Insights Yet</Text>
            <Text style={styles.emptyText}>
              Create more journal entries to unlock AI-powered insights about your thoughts and patterns.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            {summary ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Overall Assessment</Text>
                <Text style={styles.summaryText}>{summary}</Text>
              </View>
            ) : null}

            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={styles.iconContainer}>
                    {getCategoryIcon(insight.category)}
                  </View>
                  <View style={styles.insightHeaderText}>
                    <Text style={styles.insightCategory}>{insight.category}</Text>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                </View>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                <View style={[
                  styles.typeBadge,
                  insight.type === 'positive' && styles.typeBadgePositive,
                  insight.type === 'actionable' && styles.typeBadgeActionable,
                ]}>
                  <Text style={styles.typeBadgeText}>
                    {insight.type === 'positive' ? '✨ Positive' : insight.type === 'actionable' ? '💡 Actionable' : '📊 Neutral'}
                  </Text>
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
  summaryCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 24,
  },
  insightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightHeaderText: {
    flex: 1,
  },
  insightCategory: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AuraColors.accentOrange,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 24,
  },
  insightDescription: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
    opacity: 0.9,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeBadgePositive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  typeBadgeActionable: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
  },
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, TrendingUp, Calendar, Clock, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { generateText } from '@rork/toolkit-sdk';

interface AnalyticsData {
  totalEntries: number;
  averageEntriesPerWeek: number;
  longestStreak: number;
  currentStreak: number;
  topEmotions: Array<{ emotion: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  insights: string;
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyzeData();
  }, [entries]);

  const analyzeData = async () => {
    setIsLoading(true);
    try {
      const totalEntries = entries.length;
      
      const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      for (let i = 0; i < sortedEntries.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = new Date(sortedEntries[i - 1].timestamp).toDateString();
          const currDate = new Date(sortedEntries[i].timestamp).toDateString();
          
          if (prevDate === currDate) {
            continue;
          }
          
          const dayDiff = Math.floor((sortedEntries[i].timestamp - sortedEntries[i - 1].timestamp) / (1000 * 60 * 60 * 24));
          
          if (dayDiff <= 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      currentStreak = tempStreak;

      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      const weeksDiff = Math.max(1, Math.ceil((lastEntry.timestamp - firstEntry.timestamp) / (1000 * 60 * 60 * 24 * 7)));
      const averageEntriesPerWeek = Math.round(totalEntries / weeksDiff);

      const journalContext = entries.slice(0, 20).map(entry => ({
        date: entry.date,
        summary: entry.summary,
        auraSummary: entry.auraSummary,
      }));

      const prompt = `Analyze these journal entries and provide:
1. Top 5 emotions mentioned (with approximate counts)
2. Top 5 topics or themes (with approximate counts)
3. A brief insight about patterns or trends

Return valid JSON:
{
  "topEmotions": [{"emotion": "Happy", "count": 15}],
  "topTopics": [{"topic": "Work", "count": 10}],
  "insights": "Brief insight text"
}

Journal entries:
${JSON.stringify(journalContext, null, 2)}`;

      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
      const cleanedResponse = response.trim().replace(/^```json?\s*|\s*```$/g, '');
      const parsed = JSON.parse(cleanedResponse);

      setAnalytics({
        totalEntries,
        averageEntriesPerWeek,
        longestStreak,
        currentStreak,
        topEmotions: parsed.topEmotions || [],
        topTopics: parsed.topTopics || [],
        insights: parsed.insights || '',
      });
    } catch (error) {
      console.error('Error analyzing data:', error);
      setAnalytics({
        totalEntries: entries.length,
        averageEntriesPerWeek: 0,
        longestStreak: 0,
        currentStreak: 0,
        topEmotions: [],
        topTopics: [],
        insights: '',
      });
    } finally {
      setIsLoading(false);
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
          <Text style={styles.title}>Analytics</Text>
          <View style={styles.backButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AuraColors.accentOrange} />
            <Text style={styles.loadingText}>Crunching the numbers...</Text>
          </View>
        ) : !analytics || analytics.totalEntries === 0 ? (
          <View style={styles.emptyContainer}>
            <TrendingUp color={colors.textSecondary} size={48} />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Start journaling to see your analytics and track your progress over time.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Calendar color={AuraColors.accentOrange} size={24} />
                </View>
                <Text style={styles.statValue}>{analytics.totalEntries}</Text>
                <Text style={styles.statLabel}>Total Entries</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Zap color={AuraColors.accentOrange} size={24} />
                </View>
                <Text style={styles.statValue}>{analytics.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <TrendingUp color={AuraColors.accentOrange} size={24} />
                </View>
                <Text style={styles.statValue}>{analytics.averageEntriesPerWeek}</Text>
                <Text style={styles.statLabel}>Avg/Week</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Clock color={AuraColors.accentOrange} size={24} />
                </View>
                <Text style={styles.statValue}>{analytics.longestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>

            {analytics.insights && (
              <View style={styles.insightsCard}>
                <Text style={styles.sectionTitle}>Trends & Patterns</Text>
                <Text style={styles.insightsText}>{analytics.insights}</Text>
              </View>
            )}

            {analytics.topEmotions.length > 0 && (
              <View style={styles.dataCard}>
                <Text style={styles.sectionTitle}>Top Emotions</Text>
                {analytics.topEmotions.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{item.emotion}</Text>
                    <View style={styles.dataBarContainer}>
                      <View style={styles.dataBarBackground}>
                        <LinearGradient
                          colors={[AuraColors.accentOrange, '#FF8C42']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.dataBarFill,
                            { width: `${Math.min(100, (item.count / Math.max(...analytics.topEmotions.map(e => e.count))) * 100)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.dataCount}>{item.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {analytics.topTopics.length > 0 && (
              <View style={styles.dataCard}>
                <Text style={styles.sectionTitle}>Top Topics</Text>
                {analytics.topTopics.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{item.topic}</Text>
                    <View style={styles.dataBarContainer}>
                      <View style={styles.dataBarBackground}>
                        <LinearGradient
                          colors={[AuraColors.accentOrange, '#FF8C42']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.dataBarFill,
                            { width: `${Math.min(100, (item.count / Math.max(...analytics.topTopics.map(t => t.count))) * 100)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.dataCount}>{item.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  insightsCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  insightsText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 22,
  },
  dataCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  dataItem: {
    marginBottom: 14,
  },
  dataLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  dataBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dataBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dataBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  dataCount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    minWidth: 30,
    textAlign: 'right',
  },
});

import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Calendar, Search } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  tag?: string;
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [entries] = useState<JournalEntry[]>([
    {
      id: '1',
      title: 'Morning Thoughts',
      content: 'Started the day with a great workout session...',
      date: 'Today, 8:30 AM',
      tag: 'Personal',
    },
    {
      id: '2',
      title: 'Project Meeting Notes',
      content: 'Discussed the new feature implementations with the team...',
      date: 'Yesterday, 2:15 PM',
      tag: 'Work',
    },
    {
      id: '3',
      title: 'Ideas for Next Week',
      content: 'Planning to explore new technologies and frameworks...',
      date: 'Oct 25, 4:45 PM',
      tag: 'Ideas',
    },
  ]);
  
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{user?.firstName || 'My'} Journal</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={handlePress}>
              <Search color={colors.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handlePress}>
              <Calendar color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryCard}
              activeOpacity={0.7}
              onPress={handlePress}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                {entry.tag && (
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{entry.tag}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.entryContent} numberOfLines={2}>
                {entry.content}
              </Text>
              <Text style={styles.entryDate}>{entry.date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 90 }]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Plus color={AuraColors.white} size={28} />
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
  },
  tagBadge: {
    backgroundColor: AuraColors.accentOrange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AuraColors.white,
  },
  entryContent: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
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

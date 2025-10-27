import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientBackground from '@/components/GradientBackground';
import { AuraColors } from '@/constants/colors';

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Memories</Text>
          <Text style={styles.subtitle}>Your recorded moments</Text>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No memories yet</Text>
            <Text style={styles.emptySubtext}>Start recording to create your first memory</Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: AuraColors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: AuraColors.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
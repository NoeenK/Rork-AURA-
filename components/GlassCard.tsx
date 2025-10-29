import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export default function GlassCard({ children, style, intensity = 20 }: GlassCardProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallbackCard, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(237, 232, 220, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fallbackCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(237, 232, 220, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
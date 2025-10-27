import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { AuraColors } from '@/constants/colors';

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
    backgroundColor: AuraColors.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fallbackCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
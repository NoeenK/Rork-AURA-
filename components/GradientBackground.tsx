import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { AuraColors } from '@/constants/colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  animate?: boolean;
}

export default function GradientBackground({ children, style, animate = true }: GradientBackgroundProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();
    }
  }, [animate, fadeAnim]);

  return (
    <Animated.View style={[styles.container, style, { opacity: animate ? fadeAnim : 1 }]}>
      <LinearGradient
        colors={[AuraColors.gradientStart, AuraColors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
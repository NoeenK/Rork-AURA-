import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView, PanResponder, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Calendar, Settings, Brain, TrendingUp, Target, Zap } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const leftGlowAnim = useRef(new Animated.Value(0.3)).current;
  const rightGlowAnim = useRef(new Animated.Value(0.3)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < -50) {
          leftGlowAnim.setValue(Math.min(1, 0.3 + Math.abs(gestureState.dx) / 150));
        } else if (gestureState.dx > 50) {
          rightGlowAnim.setValue(Math.min(1, 0.3 + gestureState.dx / 150));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.timing(leftGlowAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }).start();
        Animated.timing(rightGlowAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }).start();
        
        if (gestureState.dx > 100) {
          router.push('/journal');
        } else if (gestureState.dx < -100) {
          router.push('/ask-aura');
        }
      },
    })
  ).current;

  const handleRecording = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/recording');
  };

  const handleCalendar = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/calendar');
  };

  const handleSettings = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/settings');
  };

  const styles = createStyles(colors);
  
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[styles.leftGlow, { opacity: leftGlowAnim }]}>
        <LinearGradient
          colors={['transparent', AuraColors.accentOrange, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>
      
      <Animated.View style={[styles.rightGlow, { opacity: rightGlowAnim }]}>
        <LinearGradient
          colors={['transparent', AuraColors.accentOrange, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>
      
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nucrtwbaqeja2anws0t6d' }}
            style={styles.titleImage}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={handleCalendar} style={styles.headerIcon}>
              <Calendar color={colors.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSettings} style={styles.headerIcon}>
              <Settings color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.categoriesGrid}>
            <View style={styles.categoryRow}>
              <TouchableOpacity 
                style={styles.categoryBox}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/insights');
                }}
              >
                <View style={styles.categoryGlow} />
                <View style={styles.categoryContent}>
                  <Brain color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                  <Text style={styles.categoryTitle}>Insights</Text>
                  <Text style={styles.categorySubtitle}>AI Analysis</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryBox}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/goals');
                }}
              >
                <View style={styles.categoryGlow} />
                <View style={styles.categoryContent}>
                  <Target color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                  <Text style={styles.categoryTitle}>Goals</Text>
                  <Text style={styles.categorySubtitle}>Track Progress</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.categoryRow}>
              <TouchableOpacity 
                style={styles.categoryBox}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/analytics');
                }}
              >
                <View style={styles.categoryGlow} />
                <View style={styles.categoryContent}>
                  <TrendingUp color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                  <Text style={styles.categoryTitle}>Analytics</Text>
                  <Text style={styles.categorySubtitle}>Your Stats</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryBox}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push('/actions');
                }}
              >
                <View style={styles.categoryGlow} />
                <View style={styles.categoryContent}>
                  <Zap color={AuraColors.accentOrange} size={28} strokeWidth={2.5} />
                  <Text style={styles.categoryTitle}>Actions</Text>
                  <Text style={styles.categorySubtitle}>Quick Access</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.recordingSection} />
        </ScrollView>

        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity
            style={styles.mainMicButton}
            onPress={handleRecording}
            activeOpacity={0.8}
          >
            <Mic color={AuraColors.white} size={36} />
          </TouchableOpacity>
        </View>
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
    paddingBottom: 8,
  },
  titleImage: {
    width: 120,
    height: 40,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    padding: 8,
  },
  recordingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  categoriesGrid: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  categoryBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  categoryGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: AuraColors.accentOrange,
    opacity: 0.3,
  },
  categoryContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  categorySubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    marginTop: 4,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  mainMicButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  leftGlow: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    zIndex: 10,
    borderRadius: 1.5,
  },
  rightGlow: {
    position: 'absolute',
    right: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    zIndex: 10,
    borderRadius: 1.5,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 1.5,
  },

});

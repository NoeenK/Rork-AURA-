import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ScrollView, PanResponder, Modal } from 'react-native';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Calendar, Settings, Brain, TrendingUp, Target, Zap, MessageSquare, BookText } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [fontLoaded, setFontLoaded] = useState(false);
  
  const leftGlowAnim = useRef(new Animated.Value(0.3)).current;
  const rightGlowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    async function loadFont() {
      try {
        await Font.loadAsync({
          'Synthra': { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nu4rtyxwfuv3mq41m36i3' },
        });
        setFontLoaded(true);
      } catch (error) {
        console.log('Font loading error:', error);
        setFontLoaded(true);
      }
    }
    loadFont();
  }, []);

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

  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const circleScales = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const circleOpacities = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  const handleRecording = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowRecordingPopup(true);
    
    const animations = circleScales.map((scale, index) => {
      return Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
          delay: index * 100,
        }),
        Animated.timing(circleOpacities[index], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          delay: index * 100,
        }),
      ]);
    });

    Animated.stagger(100, animations).start();
  };

  const handleRecordingOptionSelect = (option: 'record' | 'journal' | 'ask') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const hideAnimations = circleScales.map((scale, index) => {
      return Animated.parallel([
        Animated.spring(scale, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
          delay: (2 - index) * 50,
        }),
        Animated.timing(circleOpacities[index], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          delay: (2 - index) * 50,
        }),
      ]);
    });

    Animated.stagger(50, hideAnimations).start(() => {
      setShowRecordingPopup(false);
      circleScales.forEach(s => s.setValue(0));
      circleOpacities.forEach(o => o.setValue(0));
      
      if (option === 'record') {
        router.push('/recording');
      } else if (option === 'journal') {
        router.push('/journal');
      } else if (option === 'ask') {
        router.push('/ask-aura');
      }
    });
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
          <Text style={[styles.logoText, fontLoaded && { fontFamily: 'Synthra' }]}>AURA</Text>
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

      {showRecordingPopup && (
        <Modal
          visible={true}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            const hideAnimations = circleScales.map((scale, index) => {
              return Animated.parallel([
                Animated.spring(scale, {
                  toValue: 0,
                  useNativeDriver: true,
                  damping: 15,
                  stiffness: 150,
                  delay: (2 - index) * 50,
                }),
                Animated.timing(circleOpacities[index], {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                  delay: (2 - index) * 50,
                }),
              ]);
            });
            Animated.stagger(50, hideAnimations).start(() => {
              setShowRecordingPopup(false);
              circleScales.forEach(s => s.setValue(0));
              circleOpacities.forEach(o => o.setValue(0));
            });
          }}
        >
          <TouchableOpacity
            style={styles.circlePopupOverlay}
            activeOpacity={1}
            onPress={() => {
              const hideAnimations = circleScales.map((scale, index) => {
                return Animated.parallel([
                  Animated.spring(scale, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 150,
                    delay: (2 - index) * 50,
                  }),
                  Animated.timing(circleOpacities[index], {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                    delay: (2 - index) * 50,
                  }),
                ]);
              });
              Animated.stagger(50, hideAnimations).start(() => {
                setShowRecordingPopup(false);
                circleScales.forEach(s => s.setValue(0));
                circleOpacities.forEach(o => o.setValue(0));
              });
            }}
          >
            <View style={styles.circleContainer}>
              <Animated.View
                style={[
                  styles.circleOptionSmall,
                  {
                    left: -100,
                    transform: [{ scale: circleScales[0] }],
                    opacity: circleOpacities[0],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.circleOptionInnerSmall}
                  onPress={() => handleRecordingOptionSelect('journal')}
                  activeOpacity={0.8}
                >
                  <BookText color={AuraColors.white} size={24} />
                  <Text style={styles.circleOptionTextSmall}>Journal</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.circleOptionSmall,
                  {
                    transform: [{ scale: circleScales[1] }],
                    opacity: circleOpacities[1],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.circleOptionInnerSmall}
                  onPress={() => handleRecordingOptionSelect('record')}
                  activeOpacity={0.8}
                >
                  <Mic color={AuraColors.white} size={24} />
                  <Text style={styles.circleOptionTextSmall}>Record</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.circleOptionSmall,
                  {
                    right: -100,
                    transform: [{ scale: circleScales[2] }],
                    opacity: circleOpacities[2],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.circleOptionInnerSmall}
                  onPress={() => handleRecordingOptionSelect('ask')}
                  activeOpacity={0.8}
                >
                  <MessageSquare color={AuraColors.white} size={24} />
                  <Text style={styles.circleOptionTextSmall}>Ask Aura</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  logoText: {
    fontSize: 32,
    fontWeight: '400' as const,
    color: colors.text,
    letterSpacing: 2,
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
    backgroundColor: 'rgba(255, 140, 66, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 66, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  circlePopupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOption: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  circleOptionInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOptionText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  circleOptionSmall: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 140, 66, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 66, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  circleOptionInnerSmall: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOptionTextSmall: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: AuraColors.white,
    marginTop: 2,
    letterSpacing: 0.3,
    textAlign: 'center',
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

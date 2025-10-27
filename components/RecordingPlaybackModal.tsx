import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, RotateCcw, RotateCw, X } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface RecordingPlaybackModalProps {
  visible: boolean;
  audioUri: string;
  transcript: string;
  onClose: () => void;
}

export default function RecordingPlaybackModal({
  visible,
  audioUri,
  transcript,
  onClose,
}: RecordingPlaybackModalProps) {
  const { colors } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const waveAnims = useRef(
    Array.from({ length: 30 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (visible && audioUri) {
      loadSound();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, audioUri]);

  useEffect(() => {
    if (isPlaying) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isPlaying]);

  const loadSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        sound?.setPositionAsync(0);
      }
    }
  };

  const startWaveAnimation = () => {
    const animations = waveAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      )
    );

    animations.forEach((animation, index) => {
      setTimeout(() => animation.start(), index * 30);
    });
  };

  const stopWaveAnimation = () => {
    waveAnims.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0.3);
    });
  };

  const handlePlayPause = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleRewind = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;
    const newPosition = Math.max(0, position - 15000);
    await sound.setPositionAsync(newPosition);
  };

  const handleForward = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!sound) return;
    const newPosition = Math.min(duration, position + 15000);
    await sound.setPositionAsync(newPosition);
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClose = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    onClose();
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Recording Complete</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.waveformContainer}>
            {waveAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 80],
                    }),
                    backgroundColor: AuraColors.accentOrange,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleRewind}
              activeOpacity={0.7}
            >
              <RotateCcw color={colors.text} size={28} />
              <Text style={styles.controlLabel}>15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
              activeOpacity={0.8}
            >
              {isPlaying ? (
                <Pause color={AuraColors.white} size={36} fill={AuraColors.white} />
              ) : (
                <Play color={AuraColors.white} size={36} fill={AuraColors.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleForward}
              activeOpacity={0.7}
            >
              <RotateCw color={colors.text} size={28} />
              <Text style={styles.controlLabel}>15s</Text>
            </TouchableOpacity>
          </View>

          {transcript && (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptLabel}>Transcription</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    waveformContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 100,
      gap: 3,
      marginBottom: 24,
    },
    waveBar: {
      width: 3,
      borderRadius: 1.5,
      opacity: 0.8,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 32,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: AuraColors.accentOrange,
    },
    timeText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      minWidth: 40,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      marginBottom: 24,
    },
    controlButton: {
      alignItems: 'center',
      gap: 4,
    },
    controlLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    playButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: AuraColors.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: AuraColors.accentOrange,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    transcriptContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 16,
      maxHeight: 200,
    },
    transcriptLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: AuraColors.accentOrange,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    transcriptText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
  });

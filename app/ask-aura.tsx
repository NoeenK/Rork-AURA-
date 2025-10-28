import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Keyboard, PanResponder, TouchableWithoutFeedback, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, ArrowUp, History } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { generateText } from '@rork/toolkit-sdk';
import { Audio } from 'expo-av';

export default function AskAuraScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const historyAnim = useRef(new Animated.Value(-300)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);
  
  const toggleHistory = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowHistory(!showHistory);
    Animated.spring(historyAnim, {
      toValue: !showHistory ? 0 : -300,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
    }).start();
  };

  const selectHistoryItem = (item: string) => {
    setQuery(item);
    toggleHistory();
    inputRef.current?.focus();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) {
          router.back();
        }
      },
    })
  ).current;

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        Animated.spring(inputAnim, {
          toValue: -e.endCoordinates.height,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }).start();
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.spring(inputAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [inputAnim]);

  const handleSend = async () => {
    if (!query.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userQuery = query.trim();
    setQuery('');
    Keyboard.dismiss();
    
    setHistory(prev => {
      const newHistory = [userQuery, ...prev.filter(h => h !== userQuery)];
      return newHistory.slice(0, 20);
    });
    
    const newMessages = [...messages, { role: 'user' as const, content: userQuery }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const journalContext = entries.map(entry => ({
        date: entry.date,
        transcript: entry.transcript,
        summary: entry.summary,
        auraSummary: entry.auraSummary,
      })).slice(0, 20);

      const systemPrompt = {
        role: 'assistant' as const,
        content: `You are AURA, an AI assistant that helps users understand their journal entries, thoughts, and conversations. You have access to the user's journal entries and can answer questions about them. Be helpful, insightful, and empathetic. Here is the journal context:\n\n${JSON.stringify(journalContext, null, 2)}`
      };

      const response = await generateText({
        messages: [systemPrompt, ...newMessages],
      });

      setMessages([...newMessages, { role: 'assistant', content: response }]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error querying AURA:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your question. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isRecording) {
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setRecording(null);
          setIsRecording(false);

          if (uri) {
            const formData = new FormData();
            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append('audio', {
              uri,
              name: `recording.${fileType}`,
              type: `audio/${fileType}`,
            } as any);

            const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();
            if (data.text) {
              setQuery(data.text);
              inputRef.current?.focus();
            }
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
          setIsRecording(false);
        }
      }
    } else {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync({
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        setRecording(newRecording);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };



  const styles = createStyles(colors);

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleHistory} style={styles.historyButton}>
            <History color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Ask AURA</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={28} />
          </TouchableOpacity>
        </View>
        
        {messages.length === 0 ? (
          <View style={styles.logoContainer} {...panResponder.panHandlers}>
            <View style={styles.logoWrapper}>
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nucrtwbaqeja2anws0t6d' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        ) : (
          <View style={styles.messagesWrapper}>
            <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 140 }]}
            showsVerticalScrollIndicator={false}
            {...panResponder.panHandlers}
          >
            {messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageCard,
                  message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                <Text style={styles.messageRole}>
                  {message.role === 'user' ? 'You' : 'AURA'}
                </Text>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            ))}
            {isLoading && (
              <View style={[styles.messageCard, styles.assistantMessage]}>
                <Text style={styles.messageRole}>AURA</Text>
                <ActivityIndicator color={AuraColors.accentOrange} style={styles.loader} />
              </View>
            )}
          </ScrollView>
          </View>
        )}
        
        <Animated.View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16, transform: [{ translateY: inputAnim }] }]}>
          <View style={styles.searchBarWrapper}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.searchBarGradient}
            >
              <View style={styles.searchBarGlow} />
              <View style={styles.searchBarInner}>
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder={query ? "" : "Ask me anything about your thoughts..."}
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
                
                <View style={styles.inputButtons}>
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={handleVoiceInput}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isRecording ? ['#FF8C42', AuraColors.accentOrange] : ['rgba(255, 140, 66, 0.3)', 'rgba(255, 107, 0, 0.3)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      <Mic color={isRecording ? AuraColors.white : AuraColors.accentOrange} size={20} />
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSend}
                    activeOpacity={0.7}
                    disabled={!query.trim() || isLoading}
                  >
                    <LinearGradient
                      colors={query.trim() ? [AuraColors.accentOrange, '#FF8C42'] : ['#666', '#555']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      <ArrowUp color={AuraColors.white} size={20} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </View>
      
      {showHistory && (
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={toggleHistory}
        >
          <View style={styles.historyOverlay} />
        </TouchableOpacity>
      )}
      
      <Animated.View style={[styles.historyPanel, { transform: [{ translateX: historyAnim }] }]}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.historyGradient}
        >
          <View style={[styles.historyContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.historyHeader}>
              <History color={AuraColors.accentOrange} size={24} />
              <Text style={styles.historyTitle}>History</Text>
            </View>
            
            <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <Text style={styles.historyEmpty}>No search history yet</Text>
              ) : (
                history.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.historyItem}
                    onPress={() => selectHistoryItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.historyItemText} numberOfLines={2}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </LinearGradient>
      </Animated.View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 200,
    height: 80,
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  messageCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: AuraColors.accentOrange,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '500' as const,
  },
  loader: {
    marginVertical: 8,
  },
  inputContainer: {
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  searchBarWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  searchBarGradient: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  searchBarGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: AuraColors.accentOrange,
    opacity: 0.4,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500' as const,
    maxHeight: 100,
    paddingTop: 4,
    paddingBottom: 4,
  },
  inputButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyButton: {
    padding: 8,
  },
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  historyPanel: {
    position: 'absolute',
    left: -300,
    top: 0,
    bottom: 0,
    width: 300,
    zIndex: 1000,
  },
  historyGradient: {
    flex: 1,
  },
  historyContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  historyScroll: {
    flex: 1,
  },
  historyEmpty: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  historyItemText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 20,
  },
});

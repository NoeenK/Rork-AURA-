import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, ArrowUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { generateText } from '@rork/toolkit-sdk';

export default function AskAuraScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSend = async () => {
    if (!query.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userQuery = query.trim();
    setQuery('');
    
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

  const handleVoiceInput = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('Voice input feature coming soon!');
  };

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const logoOpacity = logoAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  const styles = createStyles(colors);

  return (
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
          <Text style={styles.title}>Ask AURA</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={28} />
          </TouchableOpacity>
        </View>
        
        {messages.length === 0 ? (
          <View style={styles.logoContainer}>
            <Animated.View 
              style={[
                styles.logoWrapper,
                {
                  transform: [{ scale: logoScale }],
                  opacity: logoOpacity,
                }
              ]}
            >
              <LinearGradient
                colors={[AuraColors.accentOrange, '#FF8C42', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>AURA</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={styles.welcomeText}>Ask me anything about your thoughts</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 140 }]}
            showsVerticalScrollIndicator={false}
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
        )}
        
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
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
                  style={styles.searchInput}
                  placeholder="Ask me anything about your thoughts..."
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                
                <View style={styles.inputButtons}>
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={handleVoiceInput}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#48DBFB', '#0ABDE3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      <Mic color={AuraColors.white} size={20} />
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
        </View>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 32,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  logoGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900' as const,
    color: AuraColors.white,
    letterSpacing: 4,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
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
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.card,
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
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
    shadowColor: '#48DBFB',
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
});

import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Keyboard, PanResponder, TouchableWithoutFeedback } from 'react-native';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, ArrowUp, History, FileText, Megaphone, List, CheckSquare, Mail, Pen, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { generateText } from '@rork/toolkit-sdk';
import { Audio } from 'expo-av';
import { transcribeAudioChunk } from '@/lib/soniox-transcription';

type Mode = 'ask' | 'create';

export default function AskAuraScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries } = useJournal();
  const [mode, setMode] = useState<Mode>('ask');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const historyAnim = useRef(new Animated.Value(-300)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const createAnim = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);
  
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

  const toggleMode = (newMode: Mode) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMode(newMode);
    if (newMode === 'create') {
      setShowCreateOptions(true);
      Animated.spring(createAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
      }).start();
    } else {
      Animated.spring(createAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
      }).start(() => setShowCreateOptions(false));
    }
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
    return () => {};
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

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
          });

          if (uri) {
            try {
              const transcript = await transcribeAudioChunk(uri);
              if (transcript) {
                setQuery(transcript);
                inputRef.current?.focus();
              }
            } catch (error) {
              console.error('Transcription failed:', error);
            }
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
          setIsRecording(false);
          setRecording(null);
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
          });
        }
      }
    } else {
      try {
        if (recording) {
          try {
            await recording.stopAndUnloadAsync();
          } catch (e) {
            console.log('Error stopping previous recording:', e);
          }
          setRecording(null);
        }

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
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }
    }
  };

  const handleCreateOption = (option: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(option);
    console.log('Selected create option:', option);
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleHistory} style={styles.historyButton}>
            <History color={colors.text} size={24} />
          </TouchableOpacity>
          
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'ask' && styles.modeButtonActive]}
              onPress={() => toggleMode('ask')}
            >
              <Text style={[styles.modeButtonText, mode === 'ask' && styles.modeButtonTextActive]}>
                Ask
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'create' && styles.modeButtonActive]}
              onPress={() => toggleMode('create')}
            >
              <Text style={[styles.modeButtonText, mode === 'create' && styles.modeButtonTextActive]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={28} />
          </TouchableOpacity>
        </View>
        
        {mode === 'ask' && messages.length === 0 ? (
          <View style={styles.logoContainer} {...panResponder.panHandlers}>
            <View style={styles.logoWrapper}>
              <Text style={[styles.logoText, fontLoaded && { fontFamily: 'Synthra' }]}>Aura</Text>
            </View>
            <Text style={styles.infoText}>
              Ask anything about your notes. Since October 21, 2025, you&apos;ve recorded a total of {entries.length} notes.
            </Text>
          </View>
        ) : mode === 'ask' ? (
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
                  <Text style={[styles.messageRole, fontLoaded && message.role === 'assistant' && { fontFamily: 'Synthra' }]}>
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
        ) : null}

        {showCreateOptions && (
          <Animated.View style={[styles.createOptionsContainer, { opacity: createAnim }]}>
            <ScrollView
              style={styles.createScroll}
              contentContainerStyle={[styles.createContent, { paddingBottom: insets.bottom + 140 }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.createTitle}>1. What do you want to create?</Text>
              
              <View style={styles.optionsGrid}>
                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'summary' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('summary')}
                  activeOpacity={0.7}
                >
                  <FileText color={selectedCategory === 'summary' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'summary' && styles.createOptionTextSelected
                  ]}>Summary</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'meeting' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('meeting')}
                  activeOpacity={0.7}
                >
                  <List color={selectedCategory === 'meeting' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'meeting' && styles.createOptionTextSelected
                  ]}>Meeting report</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'list' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('list')}
                  activeOpacity={0.7}
                >
                  <List color={selectedCategory === 'list' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'list' && styles.createOptionTextSelected
                  ]}>List points</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'todo' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('todo')}
                  activeOpacity={0.7}
                >
                  <CheckSquare color={selectedCategory === 'todo' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'todo' && styles.createOptionTextSelected
                  ]}>To-do list</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'tweet' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('tweet')}
                  activeOpacity={0.7}
                >
                  <Megaphone color={selectedCategory === 'tweet' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'tweet' && styles.createOptionTextSelected
                  ]}>Tweet</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'email' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('email')}
                  activeOpacity={0.7}
                >
                  <Mail color={selectedCategory === 'email' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'email' && styles.createOptionTextSelected
                  ]}>Email</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'blog' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('blog')}
                  activeOpacity={0.7}
                >
                  <Pen color={selectedCategory === 'blog' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'blog' && styles.createOptionTextSelected
                  ]}>Blog post</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    selectedCategory === 'cleanup' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('cleanup')}
                  activeOpacity={0.7}
                >
                  <Sparkles color={selectedCategory === 'cleanup' ? AuraColors.white : colors.text} size={20} />
                  <Text style={[
                    styles.createOptionText,
                    selectedCategory === 'cleanup' && styles.createOptionTextSelected
                  ]}>Cleanup</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.createOption,
                    styles.createOptionCustom,
                    selectedCategory === 'custom' && styles.createOptionSelected
                  ]} 
                  onPress={() => handleCreateOption('custom')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.createOptionCustomText,
                    selectedCategory === 'custom' && styles.createOptionTextSelected
                  ]}>+ Custom</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.createSubtitle}>2. Select the note</Text>
              
              {entries.slice(0, 5).map((entry) => (
                <TouchableOpacity key={entry.id} style={styles.noteOption}>
                  <View style={styles.noteOptionContent}>
                    <Text style={styles.noteTitle}>{entry.summary?.split('.')[0] || 'Untitled'}</Text>
                    <Text style={styles.notePreview} numberOfLines={2}>
                      {entry.transcript || entry.summary || 'No content'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
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
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder={mode === 'ask' ? "Ask a question" : "Type your content..."}
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
          </View>
        </View>
      </TouchableWithoutFeedback>
      
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.text,
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
    marginBottom: 24,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '400' as const,
    color: colors.text,
    letterSpacing: 2,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  createOptionsContainer: {
    flex: 1,
  },
  createScroll: {
    flex: 1,
  },
  createContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 20,
  },
  createSubtitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 24,
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  createOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createOptionSelected: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: AuraColors.accentOrange,
    borderWidth: 1.5,
  },
  createOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center',
  },
  createOptionTextSelected: {
    color: AuraColors.white,
    fontWeight: '700' as const,
  },
  createOptionCustom: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  createOptionCustomText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
    textAlign: 'center',
  },
  noteOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  noteOptionContent: {
    gap: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  notePreview: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    lineHeight: 20,
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

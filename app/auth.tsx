import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuraColors } from '@/constants/colors';
import { LogIn, X, Mail, Lock } from 'lucide-react-native';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleSignIn = () => {
    console.log('Google Sign In button pressed');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(tabs)');
  };

  const handleAppleSignIn = () => {
    console.log('Apple Sign In button pressed');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(tabs)');
  };

  const handleEmailSignIn = () => {
    console.log('Email Sign In button pressed');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowEmailAuth(false);
    setEmail('');
    setPassword('');
    router.push('/(tabs)');
  };

  const handleEmailSignUp = () => {
    console.log('Email Sign Up button pressed');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowEmailAuth(false);
    setEmail('');
    setPassword('');
    router.push('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#2D1F14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.header}>
          <Text style={styles.logo}>AURA</Text>
          <Text style={styles.tagline}>Human Memory. Reinvented</Text>
          <Text style={styles.subtitle}>Record. Reflect. Remember.</Text>
        </View>

        <View style={styles.authContainer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.buttonText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Text style={styles.appleIcon}></Text>
                </View>
                <Text style={styles.buttonText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Welcome</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.description}>
            Sign in to sync your memories across all devices and never lose a
            moment.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createAccountButton}
          onPress={() => {
            setShowEmailAuth(true);
            setIsSignUp(false);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.createAccountText}>Create account</Text>
        </TouchableOpacity>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 40 }]}>
          <LogIn color={AuraColors.accentOrange} size={20} />
          <Text style={styles.footerText}>
            Get started by signing in with your account
          </Text>
        </View>
      </View>

      <Modal
        visible={showEmailAuth}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailAuth(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowEmailAuth(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEmailAuth(false);
                  setEmail('');
                  setPassword('');
                }}
                style={styles.closeButton}
              >
                <X color={AuraColors.charcoal} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Mail color={AuraColors.accentOrange} size={20} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="rgba(59, 59, 59, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Lock color={AuraColors.accentOrange} size={20} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(59, 59, 59, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.switchButtonText}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    fontSize: 64,
    fontWeight: '900' as const,
    color: AuraColors.white,
    letterSpacing: 8,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: AuraColors.accentOrange,
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  googleButton: {
    backgroundColor: AuraColors.white,
    borderRadius: 14,
    padding: 18,
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  appleButton: {
    backgroundColor: AuraColors.darkCard,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: AuraColors.accentOrange,
  },
  appleIcon: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: AuraColors.white,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuraColors.charcoal,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  createAccountButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  createAccountText: {
    fontSize: 14,
    color: AuraColors.accentOrange,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: AuraColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: AuraColors.charcoal,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 152, 52, 0.2)',
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AuraColors.charcoal,
    paddingVertical: 14,
    fontWeight: '500' as const,
  },
  submitButton: {
    backgroundColor: AuraColors.accentOrange,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: AuraColors.white,
  },
  switchButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 14,
    color: AuraColors.charcoal,
    fontWeight: '500' as const,
  },
});

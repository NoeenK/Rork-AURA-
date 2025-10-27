import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { AuraColors } from '@/constants/colors';
import { LogIn } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'rork-app://auth/callback',
        },
      });

      if (error) {
        console.error('Google Sign In Error:', error);
        Alert.alert('Sign In Failed', error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'rork-app://auth/callback'
        );

        if (result.type === 'success') {
          const url = result.url;
          const params = new URL(url).searchParams;
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      Alert.alert('Error', 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (Platform.OS !== 'ios') {
        Alert.alert('Not Available', 'Apple Sign In is only available on iOS devices');
        setIsLoading(false);
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error('Apple Sign In Error:', error);
          Alert.alert('Sign In Failed', error.message);
          return;
        }

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled Apple Sign In');
      } else {
        console.error('Apple Sign In Error:', error);
        Alert.alert('Error', 'Failed to sign in with Apple');
      }
    } finally {
      setIsLoading(false);
    }
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
            disabled={isLoading}
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
              disabled={isLoading}
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

        <View style={[styles.footer, { paddingBottom: insets.bottom + 40 }]}>
          <LogIn color={AuraColors.accentOrange} size={20} />
          <Text style={styles.footerText}>
            Get started by signing in with your account
          </Text>
        </View>
      </View>
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
});

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Calendar } from 'lucide-react-native';
import GradientBackground from '@/components/GradientBackground';
import GlassCard from '@/components/GlassCard';
import { AuraColors } from '@/constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User color={AuraColors.white} size={48} />
              </View>
            </View>
            <Text style={styles.name}>Welcome to AURA</Text>
            <Text style={styles.email}>Sign in to sync your memories</Text>
          </GlassCard>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Mail color={AuraColors.white} size={20} />
              </View>
              <Text style={styles.menuText}>Sign in with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <User color={AuraColors.white} size={20} />
              </View>
              <Text style={styles.menuText}>Sign in with Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Calendar color={AuraColors.white} size={20} />
              </View>
              <Text style={styles.menuText}>Connect Calendar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AURA v1.0</Text>
            <Text style={styles.footerSubtext}>Human Memory. Reinvented</Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: AuraColors.white,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  profileCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: AuraColors.white,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: AuraColors.white,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: AuraColors.white,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
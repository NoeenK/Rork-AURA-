import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sun, Moon, ChevronRight, Bell, Lock, HelpCircle, User, Mic, Info, LogOut } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme, colors } = useTheme();
  const [audioQuality, setAudioQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [showAudioQualityModal, setShowAudioQualityModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTheme(newTheme);
  };

  const handleMenuPress = (action: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    switch (action) {
      case 'profile':
        console.log('Profile settings');
        break;
      case 'notifications':
        console.log('Notifications');
        break;
      case 'privacy':
        console.log('Privacy & Security');
        break;
      case 'help':
        console.log('Help & Support');
        break;
      case 'audioQuality':
        setShowAudioQualityModal(true);
        break;
      case 'about':
        setShowAboutModal(true);
        break;
      case 'logout':
        console.log('Logout');
        break;
    }
  };
  
  const handleAudioQualitySelect = (quality: 'low' | 'medium' | 'high') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAudioQuality(quality);
    setShowAudioQualityModal(false);
  };

  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={28} />
          </TouchableOpacity>
        </View>
      
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.themeContainer}>
            <TouchableOpacity
              style={[styles.themeOption, theme === 'light' && styles.themeOptionActive]}
              onPress={() => handleThemeChange('light')}
            >
              <View style={styles.themeIcon}>
                <Sun color={theme === 'light' ? AuraColors.accentOrange : colors.text} size={40} />
              </View>
              <Text style={[styles.themeLabel, theme === 'light' && styles.themeLabelActive]}>Light</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, theme === 'dark' && styles.themeOptionActive]}
              onPress={() => handleThemeChange('dark')}
            >
              <View style={styles.themeIcon}>
                <Moon color={theme === 'dark' ? AuraColors.accentOrange : colors.text} size={40} />
              </View>
              <Text style={[styles.themeLabel, theme === 'dark' && styles.themeLabelActive]}>Dark</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.menuList}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress('profile')}
            >
              <View style={styles.menuItemLeft}>
                <User color={colors.text} size={22} />
                <Text style={styles.menuText}>Profile Settings</Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress('notifications')}
            >
              <View style={styles.menuItemLeft}>
                <Bell color={colors.text} size={22} />
                <Text style={styles.menuText}>Notifications</Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress('privacy')}
            >
              <View style={styles.menuItemLeft}>
                <Lock color={colors.text} size={22} />
                <Text style={styles.menuText}>Privacy & Security</Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => handleMenuPress('help')}
            >
              <View style={styles.menuItemLeft}>
                <HelpCircle color={colors.text} size={22} />
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Audio & Recording</Text>
          
          <View style={styles.menuList}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => handleMenuPress('audioQuality')}
            >
              <View style={styles.menuItemLeft}>
                <Mic color={colors.text} size={22} />
                <View>
                  <Text style={styles.menuText}>Audio Quality</Text>
                  <Text style={styles.menuSubtext}>
                    {audioQuality === 'low' ? 'Low (32 kbps)' : audioQuality === 'medium' ? 'Medium (64 kbps)' : 'High (128 kbps)'}
                  </Text>
                </View>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Other</Text>
          
          <View style={styles.menuList}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress('about')}
            >
              <View style={styles.menuItemLeft}>
                <Info color={colors.text} size={22} />
                <Text style={styles.menuText}>About AURA</Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => handleMenuPress('logout')}
            >
              <View style={styles.menuItemLeft}>
                <LogOut color={colors.text} size={22} />
                <Text style={styles.menuText}>Sign Out</Text>
              </View>
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={showAudioQualityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAudioQualityModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAudioQualityModal(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Audio Quality</Text>
            <Text style={styles.modalSubtitle}>Choose recording quality</Text>
            
            <TouchableOpacity
              style={[styles.qualityOption, audioQuality === 'low' && styles.qualityOptionActive]}
              onPress={() => handleAudioQualitySelect('low')}
              activeOpacity={0.7}
            >
              <View style={styles.qualityOptionContent}>
                <Text style={[styles.qualityOptionTitle, audioQuality === 'low' && styles.qualityOptionTitleActive]}>Low</Text>
                <Text style={styles.qualityOptionSubtitle}>32 kbps • Saves storage</Text>
              </View>
              {audioQuality === 'low' && (
                <View style={styles.checkmark} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.qualityOption, audioQuality === 'medium' && styles.qualityOptionActive]}
              onPress={() => handleAudioQualitySelect('medium')}
              activeOpacity={0.7}
            >
              <View style={styles.qualityOptionContent}>
                <Text style={[styles.qualityOptionTitle, audioQuality === 'medium' && styles.qualityOptionTitleActive]}>Medium</Text>
                <Text style={styles.qualityOptionSubtitle}>64 kbps • Balanced</Text>
              </View>
              {audioQuality === 'medium' && (
                <View style={styles.checkmark} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.qualityOption, audioQuality === 'high' && styles.qualityOptionActive]}
              onPress={() => handleAudioQualitySelect('high')}
              activeOpacity={0.7}
            >
              <View style={styles.qualityOptionContent}>
                <Text style={[styles.qualityOptionTitle, audioQuality === 'high' && styles.qualityOptionTitleActive]}>High</Text>
                <Text style={styles.qualityOptionSubtitle}>128 kbps • Best quality</Text>
              </View>
              {audioQuality === 'high' && (
                <View style={styles.checkmark} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showAboutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAboutModal(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>About AURA</Text>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutText}>AURA is your intelligent voice journal assistant.</Text>
              <Text style={styles.aboutText}>Version 1.0.0</Text>
              <Text style={styles.aboutText}>© 2025 AURA</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 32,
    marginBottom: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    opacity: 0.7,
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
  },
  themeOption: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(237, 232, 220, 0.4)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 147, 77, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  themeOptionActive: {
    borderColor: AuraColors.accentOrange,
    backgroundColor: 'rgba(230, 147, 77, 0.08)',
    shadowColor: AuraColors.accentOrange,
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  themeIcon: {
    marginTop: 8,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  themeLabelActive: {
    color: colors.text,
    fontWeight: '700' as const,
  },
  menuList: {
    backgroundColor: 'rgba(237, 232, 220, 0.4)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 207, 195, 0.3)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
  },
  menuSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: 'rgba(237, 232, 220, 0.98)',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(230, 147, 77, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 241, 232, 0.5)',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 147, 77, 0.1)',
  },
  qualityOptionActive: {
    borderColor: AuraColors.accentOrange,
    backgroundColor: 'rgba(230, 147, 77, 0.08)',
  },
  qualityOptionContent: {
    flex: 1,
  },
  qualityOptionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  qualityOptionTitleActive: {
    color: AuraColors.accentOrange,
    fontWeight: '700' as const,
  },
  qualityOptionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AuraColors.accentOrange,
  },
  aboutContent: {
    paddingVertical: 16,
    gap: 12,
  },
  aboutText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
});

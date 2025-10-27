import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Moon, Smartphone, ChevronRight } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [selectedTheme, setSelectedTheme] = React.useState<'light' | 'auto' | 'dark'>('light');
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Theme</Text>
        
        <View style={styles.themeContainer}>
          <TouchableOpacity
            style={[styles.themeOption, selectedTheme === 'light' && styles.themeOptionActive]}
            onPress={() => {
              setSelectedTheme('light');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <View style={styles.themeIcon}>
              <Sun color={selectedTheme === 'light' ? AuraColors.accentOrange : AuraColors.white} size={32} />
            </View>
            <Text style={[styles.themeLabel, selectedTheme === 'light' && styles.themeLabelActive]}>Light</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeOption, selectedTheme === 'auto' && styles.themeOptionActive]}
            onPress={() => {
              setSelectedTheme('auto');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <View style={styles.themeIcon}>
              <Smartphone color={selectedTheme === 'auto' ? AuraColors.accentOrange : AuraColors.white} size={32} />
            </View>
            <Text style={[styles.themeLabel, selectedTheme === 'auto' && styles.themeLabelActive]}>Auto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeOption, selectedTheme === 'dark' && styles.themeOptionActive]}
            onPress={() => {
              setSelectedTheme('dark');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <View style={styles.themeIcon}>
              <Moon color={selectedTheme === 'dark' ? AuraColors.accentOrange : AuraColors.white} size={32} />
            </View>
            <Text style={[styles.themeLabel, selectedTheme === 'dark' && styles.themeLabelActive]}>Dark</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>General</Text>
        
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Text style={styles.menuText}>Account</Text>
            <ChevronRight color="rgba(255, 255, 255, 0.4)" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Text style={styles.menuText}>Notifications</Text>
            <ChevronRight color="rgba(255, 255, 255, 0.4)" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Text style={styles.menuText}>Privacy</Text>
            <ChevronRight color="rgba(255, 255, 255, 0.4)" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Text style={styles.menuText}>Help & Support</Text>
            <ChevronRight color="rgba(255, 255, 255, 0.4)" size={20} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuraColors.darkBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: AuraColors.white,
    letterSpacing: 0.5,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuraColors.accentOrange,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: AuraColors.white,
    marginTop: 24,
    marginBottom: 16,
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  themeOption: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: AuraColors.darkCard,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    borderColor: AuraColors.accentOrange,
  },
  themeIcon: {
    marginTop: 8,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  themeLabelActive: {
    color: AuraColors.white,
    fontWeight: '600' as const,
  },
  menuList: {
    backgroundColor: AuraColors.darkCard,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: AuraColors.white,
  },
});
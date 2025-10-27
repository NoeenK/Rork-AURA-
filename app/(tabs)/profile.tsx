import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Moon, ChevronRight } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme, colors } = useTheme();
  
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTheme(newTheme);
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
      
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>
      
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Theme</Text>
          
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
              <Text style={styles.menuText}>Profile Settings</Text>
              <ChevronRight color={colors.textSecondary} size={20} />
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
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <Text style={styles.menuText}>Privacy & Security</Text>
              <ChevronRight color={colors.textSecondary} size={20} />
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
              <ChevronRight color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.5,
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
    color: colors.text,
    marginTop: 24,
    marginBottom: 20,
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
    backgroundColor: colors.card,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  themeOptionActive: {
    borderColor: AuraColors.accentOrange,
    shadowColor: AuraColors.accentOrange,
    shadowOpacity: 0.3,
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
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
  },
});
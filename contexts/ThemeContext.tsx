import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, themes, ThemeColors } from '@/constants/colors';

const THEME_STORAGE_KEY = '@aura_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);

  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const saveTheme = useCallback(async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    saveTheme(newTheme);
  }, [theme, saveTheme]);

  const colors: ThemeColors = useMemo(() => themes[theme], [theme]);

  return useMemo(() => ({
    theme,
    colors,
    setTheme: saveTheme,
    toggleTheme,
    isLoading,
  }), [theme, colors, saveTheme, toggleTheme, isLoading]);
});

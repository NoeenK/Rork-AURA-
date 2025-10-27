export const AuraColors = {
  creamWhite: "#F2EFEB",
  charcoal: "#3B3B3B",
  accentOrange: "#EB9834",
  calmTeal: "#9CDADD",
  softRose: "#EFCBCB",
  
  white: "#FFFFFF",
  black: "#000000",
  
  darkBg: "#1A1A1A",
  darkCard: "#2A2A2A",
  darkBorder: "#3A3A3A",
  
  lightBg: "#FFFFFF",
  lightCard: "#F5F5F5",
  lightBorder: "#E0E0E0",
  
  glassLight: "rgba(255, 255, 255, 0.15)",
  glassDark: "rgba(0, 0, 0, 0.15)",
  
  statusUploading: "#4A9EFF",
  statusTranscribing: "#FFB340",
  statusFailed: "#FF4757",
  statusSuccess: "#2ED573",
  statusOnDevice: "#48DBFB",
} as const;

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  gradientStart: string;
  gradientEnd: string;
  tabBarTint: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

export const themes: Record<Theme, ThemeColors> = {
  light: {
    background: AuraColors.lightBg,
    card: AuraColors.lightCard,
    text: AuraColors.charcoal,
    textSecondary: "rgba(59, 59, 59, 0.6)",
    border: AuraColors.lightBorder,
    gradientStart: "#FFFFFF",
    gradientEnd: "#FFE5CC",
    tabBarTint: 'light' as const,
    tabIconDefault: "rgba(59, 59, 59, 0.5)",
    tabIconSelected: AuraColors.accentOrange,
  },
  dark: {
    background: AuraColors.darkBg,
    card: AuraColors.darkCard,
    text: AuraColors.white,
    textSecondary: "rgba(255, 255, 255, 0.6)",
    border: AuraColors.darkBorder,
    gradientStart: "#1A1A1A",
    gradientEnd: "#2D1F14",
    tabBarTint: 'dark' as const,
    tabIconDefault: "rgba(255, 255, 255, 0.4)",
    tabIconSelected: AuraColors.accentOrange,
  },
};

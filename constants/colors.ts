export const AuraColors = {
  creamWhite: "#F5F1E8",
  cream: "#F5F1E8",
  warmBrown: "#A8968D",
  darkBrown: "#4A4238",
  charcoal: "#2A2521",
  accentOrange: "#E6934D",
  softOrange: "#F4A460",
  white: "#FFFFFF",
  black: "#000000",
  
  darkBg: "#1A1714",
  darkCard: "#2A2521",
  darkBorder: "#3A3530",
  
  lightBg: "#F5F1E8",
  lightCard: "#EDE8DC",
  lightBorder: "#D4CFC3",
  
  glassLight: "rgba(237, 232, 220, 0.5)",
  glassDark: "rgba(42, 37, 33, 0.5)",
  
  statusUploading: "#E6934D",
  statusTranscribing: "#F4A460",
  statusFailed: "#D84315",
  statusSuccess: "#7CB342",
  statusOnDevice: "#E6934D",
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
    textSecondary: AuraColors.warmBrown,
    border: AuraColors.lightBorder,
    gradientStart: "#F5F1E8",
    gradientEnd: "#FCE4C8",
    tabBarTint: 'light' as const,
    tabIconDefault: AuraColors.warmBrown,
    tabIconSelected: AuraColors.accentOrange,
  },
  dark: {
    background: AuraColors.darkBg,
    card: AuraColors.darkCard,
    text: AuraColors.creamWhite,
    textSecondary: AuraColors.warmBrown,
    border: AuraColors.darkBorder,
    gradientStart: "#1A1714",
    gradientEnd: "#2D241A",
    tabBarTint: 'dark' as const,
    tabIconDefault: AuraColors.warmBrown,
    tabIconSelected: AuraColors.accentOrange,
  },
};

export const AuraColors = {
  creamWhite: "#F2EFEB",
  charcoal: "#3B3B3B",
  accentOrange: "#EB9834",
  calmTeal: "#9CDADD",
  softRose: "#EFCBCB",
  
  gradientStart: "#2A2BD6",
  gradientEnd: "#FF3366",
  
  white: "#FFFFFF",
  black: "#000000",
  
  darkBg: "#1A1A1A",
  darkCard: "#2A2A2A",
  darkBorder: "#3A3A3A",
  
  glassLight: "rgba(255, 255, 255, 0.15)",
  glassDark: "rgba(0, 0, 0, 0.15)",
  
  statusUploading: "#4A9EFF",
  statusTranscribing: "#FFB340",
  statusFailed: "#FF4757",
  statusSuccess: "#2ED573",
  statusOnDevice: "#48DBFB",
} as const;

export default {
  light: {
    text: AuraColors.white,
    background: AuraColors.charcoal,
    tint: AuraColors.accentOrange,
    tabIconDefault: "rgba(255, 255, 255, 0.5)",
    tabIconSelected: AuraColors.white,
  },
  dark: {
    text: AuraColors.white,
    background: AuraColors.darkBg,
    card: AuraColors.darkCard,
    border: AuraColors.darkBorder,
    tint: AuraColors.accentOrange,
    tabIconDefault: "rgba(255, 255, 255, 0.4)",
    tabIconSelected: AuraColors.accentOrange,
  },
};

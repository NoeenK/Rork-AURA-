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
  
  glassLight: "rgba(255, 255, 255, 0.15)",
  glassDark: "rgba(0, 0, 0, 0.15)",
} as const;

export default {
  light: {
    text: AuraColors.white,
    background: AuraColors.charcoal,
    tint: AuraColors.accentOrange,
    tabIconDefault: "rgba(255, 255, 255, 0.5)",
    tabIconSelected: AuraColors.white,
  },
};

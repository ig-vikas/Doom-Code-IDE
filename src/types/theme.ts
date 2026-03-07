export interface ThemeColors {
  bgDeepest: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgOverlay: string;
  bgHighlight: string;
  bgActive: string;
  bgIntense: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  accentGlow: string;
  accentBlue: string;
  accentGreen: string;
  accentRed: string;
  accentYellow: string;
  accentOrange: string;
  accentPurple: string;
  accentCyan: string;
  accentTeal: string;
  accentPink: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderAccent: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  scrollbarTrack: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
  monacoTheme?: MonacoThemeData;
}

export interface MonacoThemeData {
  base: 'vs-dark' | 'vs' | 'hc-black';
  inherit: boolean;
  rules: MonacoTokenRule[];
  colors: Record<string, string>;
}

export interface MonacoTokenRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

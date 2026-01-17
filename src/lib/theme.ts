import themeData from "../data/theme.json";

export type ThemeColors = {
  background: string;
  foreground: string;
  surface: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  warning: string;
  warningText: string;
  danger: string;
  dangerText: string;
};

export type ThemeTypography = {
  fontFamily: string;
  baseFontSize: string;
};

export type ThemeConfig = {
  colors: ThemeColors;
  typography: ThemeTypography;
};

type ThemeMap = Record<string, Partial<ThemeConfig>>;

const themeMap = themeData as ThemeMap;

export function getThemeForClient(clientId?: string): ThemeConfig {
  const base = themeMap.base as ThemeConfig;
  const override = (clientId && themeMap[clientId]) || {};

  return {
    colors: {
      ...base.colors,
      ...(override.colors ?? {}),
    },
    typography: {
      ...base.typography,
      ...(override.typography ?? {}),
    },
  };
}

export function themeToCssVars(theme: ThemeConfig): Record<string, string> {
  return {
    "--theme-bg": theme.colors.background,
    "--theme-fg": theme.colors.foreground,
    "--theme-surface": theme.colors.surface,
    "--theme-muted": theme.colors.muted,
    "--theme-accent": theme.colors.accent,
    "--theme-accent-text": theme.colors.accentText,
    "--theme-border": theme.colors.border,
    "--theme-warning": theme.colors.warning,
    "--theme-warning-text": theme.colors.warningText,
    "--theme-danger": theme.colors.danger,
    "--theme-danger-text": theme.colors.dangerText,
    "--theme-font-family": theme.typography.fontFamily,
    "--theme-font-size": theme.typography.baseFontSize,
    "--theme-surface-1": `color-mix(in srgb, ${theme.colors.surface} 85%, transparent)`,
    "--theme-surface-2": `color-mix(in srgb, ${theme.colors.surface} 75%, transparent)`,
    "--theme-surface-3": `color-mix(in srgb, ${theme.colors.surface} 65%, transparent)`,
    "--theme-border-weak": `color-mix(in srgb, ${theme.colors.border} 40%, transparent)`,
    "--theme-border-strong": `color-mix(in srgb, ${theme.colors.border} 70%, transparent)`,
    "--theme-warning-weak": `color-mix(in srgb, ${theme.colors.warning} 20%, transparent)`,
    "--theme-danger-weak": `color-mix(in srgb, ${theme.colors.danger} 20%, transparent)`,
  };
}

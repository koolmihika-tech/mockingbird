import { Platform } from "react-native";
import { MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from "react-native-paper";

/**
 * Mockingbird design system — Material Design 3.
 *
 * Clean, cool-toned palette: neutral cool-gray surfaces carry the layout, and
 * color shows up only as small "pops" (mostly icons and key CTAs). Typography
 * is Nunito — a soft, rounded, highly legible sans.
 */

// ─── Rounded typography ──────────────────────────────────────────────────────

const familyForVariant = (key: string) => {
  if (key.startsWith("display") || key.startsWith("headline")) return "Nunito_800ExtraBold";
  if (key.startsWith("title")) return "Nunito_700Bold";
  if (key.startsWith("label")) return "Nunito_600SemiBold";
  return "Nunito_400Regular"; // body* and default
};

const buildRoundedFonts = (base: MD3Theme["fonts"]) => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value && typeof value === "object" && "fontFamily" in (value as object)) {
      out[key] = { ...(value as object), fontFamily: familyForVariant(key), fontWeight: "normal" };
    } else {
      out[key] = value;
    }
  }
  return out as MD3Theme["fonts"];
};

const roundedFonts = buildRoundedFonts(MD3LightTheme.fonts);

// ─── Color helpers & cool accent pops ────────────────────────────────────────

/** Add an alpha channel to a #RRGGBB hex (e.g. for soft icon backgrounds). */
export const withAlpha = (hex: string, alpha: number) => {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};

// Extra brand tokens layered on top of the standard MD3 color roles.
type BrandColors = {
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;
  streak: string; // warm amber — the one intentional warm pop (streak/fire)
  onStreak: string;
  streakContainer: string;
  onStreakContainer: string;
  // Cool accent pops, used mainly to tint icons on otherwise-neutral cards.
  accentBlue: string;
  accentTeal: string;
  accentIndigo: string;
  accentSky: string;
};

export type AppTheme = MD3Theme & { colors: MD3Theme["colors"] & BrandColors };

export const MockingbirdLightTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: 4,
  fonts: roundedFonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6C5BC4",
    onPrimary: "#FFFFFF",
    primaryContainer: "#E6E1F5",
    onPrimaryContainer: "#241A4D",
    secondary: "#4E8D82",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#DAEAE5",
    onSecondaryContainer: "#10322C",
    tertiary: "#B36681",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#F3E2E8",
    onTertiaryContainer: "#3B1622",
    error: "#B3524F",
    onError: "#FFFFFF",
    errorContainer: "#F6DBD9",
    onErrorContainer: "#3F1512",
    background: "#FAF8FD",
    onBackground: "#1D1B22",
    surface: "#FFFFFF",
    onSurface: "#1D1B22",
    surfaceVariant: "#EAE6F1",
    onSurfaceVariant: "#4A4753",
    outline: "#7E7889",
    outlineVariant: "#DCD6E4",
    // Brand extras — muted
    success: "#4C9A6E",
    onSuccess: "#FFFFFF",
    successContainer: "#DBEEE2",
    onSuccessContainer: "#0C2A19",
    streak: "#D69A3C",
    onStreak: "#FFFFFF",
    streakContainer: "#F3E5CB",
    onStreakContainer: "#3A2A0C",
    accentBlue: "#5B6FC4",
    accentTeal: "#4E8D82",
    accentIndigo: "#7A6FC0",
    accentSky: "#5B93C4",
  },
};

export const MockingbirdDarkTheme: AppTheme = {
  ...MD3DarkTheme,
  roundness: 4,
  fonts: roundedFonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#C9BFF3",
    onPrimary: "#2E2258",
    primaryContainer: "#443873",
    onPrimaryContainer: "#E6E1F5",
    secondary: "#8FC7BC",
    onSecondary: "#063730",
    secondaryContainer: "#244942",
    onSecondaryContainer: "#DAEAE5",
    tertiary: "#E3A9BC",
    onTertiary: "#4A2130",
    tertiaryContainer: "#663B49",
    onTertiaryContainer: "#F3E2E8",
    error: "#F0B4B0",
    onError: "#5A1B19",
    errorContainer: "#7E322F",
    onErrorContainer: "#F6DBD9",
    background: "#141319",
    onBackground: "#E5E1EC",
    surface: "#1A1820",
    onSurface: "#E5E1EC",
    surfaceVariant: "#2A2733",
    onSurfaceVariant: "#C9C3D4",
    outline: "#6E6879",
    outlineVariant: "#332F3C",
    // Brand extras — muted
    success: "#7BD8A4",
    onSuccess: "#06301A",
    successContainer: "#14392A",
    onSuccessContainer: "#96F5BF",
    streak: "#E9B764",
    onStreak: "#3A2A0C",
    streakContainer: "#4A3818",
    onStreakContainer: "#F3E5CB",
    accentBlue: "#A9B4F0",
    accentTeal: "#8FC7BC",
    accentIndigo: "#BDB2F0",
    accentSky: "#A9C9EE",
  },
};

/** Typed access to the Mockingbird theme (includes brand color tokens). */
export const useAppTheme = () => useTheme<AppTheme>();

// ─── Legacy exports ──────────────────────────────────────────────────────────
// Kept for the (currently unused) Expo-template hooks/components that still
// import them. The live app uses the MD3 themes above.
const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

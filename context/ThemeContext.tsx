import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { adaptNavigationTheme, PaperProvider } from "react-native-paper";
import { MockingbirdDarkTheme, MockingbirdLightTheme, type AppTheme } from "../constants/theme";

type ThemeContextValue = {
  isDark: boolean;
  toggleTheme: () => void;
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Adapt React Navigation's themes to the Paper palette so screen backgrounds /
// back gestures match (fonts merged back in for React Navigation v7).
const { LightTheme: AdaptedNavLight, DarkTheme: AdaptedNavDark } = adaptNavigationTheme({
  reactNavigationLight: NavDefaultTheme,
  reactNavigationDark: NavDarkTheme,
  materialLight: MockingbirdLightTheme,
  materialDark: MockingbirdDarkTheme,
});

const NavLight = { ...AdaptedNavLight, fonts: NavDefaultTheme.fonts };
const NavDark = { ...AdaptedNavDark, fonts: NavDarkTheme.fonts };

const paperIconSettings = {
  icon: (props: any) => <MaterialCommunityIcons {...props} />,
};

/**
 * Owns light/dark selection (defaults to light — the toggle is manual and
 * independent of the OS scheme) and wires the Paper + React Navigation theme
 * providers so the whole app re-themes at once.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      toggleTheme: () => setIsDark((d) => !d),
      theme: isDark ? MockingbirdDarkTheme : MockingbirdLightTheme,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={value.theme} settings={paperIconSettings}>
        <NavThemeProvider value={isDark ? NavDark : NavLight}>{children}</NavThemeProvider>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeToggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeToggle must be used within AppThemeProvider");
  return ctx;
}

import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { Appbar } from "react-native-paper";
import { useAppTheme } from "../constants/theme";
import { useThemeToggle } from "../context/ThemeContext";
import { useDrawer } from "../context/DrawerContext";

/** Shared top app bar ("header") shown on every page. Detail pages pass
 *  `back`; top-level pages show the menu button that opens the drawer. The menu
 *  is always reachable, and the dark-mode toggle lives on every page.
 *  `reversed` mirrors the bar: title and menu sit on the right, the dark-mode
 *  toggle and `rightActions` on the left. */
export function AppHeader({
  title,
  back,
  onBack,
  rightActions,
  reversed,
}: {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  rightActions?: ReactNode;
  reversed?: boolean;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const { open } = useDrawer();
  const { isDark, toggleTheme } = useThemeToggle();

  const navAction = back ? (
    <Appbar.BackAction onPress={onBack ?? (() => router.back())} />
  ) : (
    <Appbar.Action icon="menu" onPress={open} accessibilityLabel="Open menu" />
  );
  const themeAction = (
    <Appbar.Action
      icon={isDark ? "white-balance-sunny" : "weather-night"}
      onPress={toggleTheme}
      accessibilityLabel="Toggle dark mode"
    />
  );

  if (reversed) {
    return (
      <Appbar.Header mode="small" style={{ backgroundColor: theme.colors.background }}>
        {themeAction}
        {rightActions}
        <Appbar.Content
          title={title ?? ""}
          style={{ alignItems: "flex-end" }}
          titleStyle={{ fontWeight: "800", textAlign: "right" }}
        />
        {back && <Appbar.Action icon="menu" onPress={open} accessibilityLabel="Open menu" />}
        {navAction}
      </Appbar.Header>
    );
  }

  return (
    <Appbar.Header mode="small" style={{ backgroundColor: theme.colors.background }}>
      {navAction}
      <Appbar.Content title={title ?? ""} titleStyle={{ fontWeight: "800" }} />
      {back && <Appbar.Action icon="menu" onPress={open} accessibilityLabel="Open menu" />}
      {rightActions}
      {themeAction}
    </Appbar.Header>
  );
}

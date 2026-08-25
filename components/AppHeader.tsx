import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Appbar } from "react-native-paper";
import { useAppTheme } from "../constants/theme";
import { useDrawer } from "../context/DrawerContext";
import { useThemeToggle } from "../context/ThemeContext";

/** Shared top app bar ("header") shown on every page. The Mockingbird logo sits
 *  in the left corner next to the page title and taps through to Home; the
 *  dark-mode toggle and the menu button always sit in the top-right corner.
 *  Detail pages pass `back` to get a back arrow at the far left. */
export function AppHeader({
  title,
  back,
  onBack,
  rightActions,
}: {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  rightActions?: ReactNode;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const { open } = useDrawer();
  const { isDark, toggleTheme } = useThemeToggle();

  return (
    <Appbar.Header mode="small" style={{ backgroundColor: theme.colors.background }}>
      {back && <Appbar.BackAction onPress={onBack ?? (() => router.back())} />}

      {/* Logo — always in the left corner, next to the title, taps to Home. */}
      <Pressable
        onPress={() => router.navigate("/")}
        accessibilityRole="button"
        accessibilityLabel="Go to Home"
        hitSlop={8}
        style={{ paddingLeft: back ? 0 : 12, paddingRight: 2 }}
      >
        <MaterialCommunityIcons name="bird" size={28} color={theme.colors.primary} />
      </Pressable>

      <Appbar.Content title={title ?? ""} titleStyle={{ fontWeight: "800" }} style={{ marginLeft: 4 }} />

      {/* Top-right corner: any page-specific actions, then the dark-mode toggle,
          then the menu button — in that order, on every page. */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {rightActions}
        <Appbar.Action
          icon={isDark ? "white-balance-sunny" : "weather-night"}
          onPress={toggleTheme}
          accessibilityLabel="Toggle dark mode"
        />
        <Appbar.Action icon="menu" onPress={open} accessibilityLabel="Open menu" />
      </View>
    </Appbar.Header>
  );
}

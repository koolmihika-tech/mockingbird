import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../constants/theme";
import { isRouteActive, NAV_ITEMS } from "./navItems";

/** Shared bottom navigation ("footer") shown on every page. Active tab is
 *  derived from the current route, so it works both inside the tabs group and
 *  on pushed detail screens. */
export function AppFooter() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const active = isRouteActive(pathname, item.route);
        const color = active ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant;
        return (
          <Pressable
            key={item.route}
            style={styles.item}
            onPress={() => router.navigate(item.route as any)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.pill, active && { backgroundColor: theme.colors.secondaryContainer }]}>
              <MaterialCommunityIcons name={active ? item.activeIcon : item.icon} size={24} color={color} />
            </View>
            <Text variant="labelMedium" style={{ color, marginTop: 2 }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  item: { flex: 1, alignItems: "center", gap: 0 },
  pill: {
    minWidth: 56,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

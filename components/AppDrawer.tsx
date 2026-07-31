import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Surface, Text } from "react-native-paper";
import { useAppTheme } from "../constants/theme";
import { useDrawer } from "../context/DrawerContext";
import { DRAWER_EXTRA_ITEMS, isRouteActive, NAV_ITEMS } from "./navItems";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 320);

/** App-wide navigation drawer, rendered once at the root so any page's header
 *  can open it. Its items mirror the footer's destinations. */
export function AppDrawer() {
  const theme = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, close } = useDrawer();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [mounted, setMounted] = useState(false);

  const prevOpen = useRef(false);
  if (isOpen !== prevOpen.current) {
    prevOpen.current = isOpen;
    if (isOpen) {
      setMounted(true);
      Animated.spring(slideAnim, { toValue: 0, friction: 20, tension: 120, useNativeDriver: true }).start();
    } else {
      Animated.spring(slideAnim, { toValue: -DRAWER_WIDTH, friction: 20, tension: 120, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        }
      );
    }
  }

  function navigate(route: string) {
    close();
    router.navigate(route as any);
  }

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={close} />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={3}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="bird" size={26} color={theme.colors.primary} />
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                Mockingbird
              </Text>
            </View>

            {NAV_ITEMS.map((item) => {
              const active = isRouteActive(pathname, item.route);
              return (
                <Item
                  key={item.route}
                  icon={active ? item.activeIcon : item.icon}
                  label={item.label}
                  active={active}
                  onPress={() => navigate(item.route)}
                />
              );
            })}

            <Divider style={styles.divider} />

            {DRAWER_EXTRA_ITEMS.map((item) => (
              <Item key={item.route} icon={item.icon} label={item.label} onPress={() => navigate(item.route)} />
            ))}
          </ScrollView>
        </Surface>
      </Animated.View>
    </View>
  );
}

function Item({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const color = active ? theme.colors.primary : theme.colors.onSurface;
  return (
    <Pressable
      style={[styles.item, active && { backgroundColor: theme.colors.secondaryContainer }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={22} color={active ? theme.colors.primary : theme.colors.onSurfaceVariant} />
      <Text variant="titleMedium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: { position: "absolute", top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH },
  surface: { flex: 1, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  content: { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, paddingHorizontal: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  divider: { marginVertical: 10 },
});

import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppDrawer } from "../components/AppDrawer";
import { DrawerProvider } from "../context/DrawerContext";
import { SupabaseAuthProvider } from "../context/SupabaseAuth";
import { AppThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <SupabaseAuthProvider>
          <DrawerProvider>
            <StatusBar style="auto" />
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
              {/* Global navigation drawer overlay — openable from any page's header */}
              <AppDrawer />
            </View>
          </DrawerProvider>
        </SupabaseAuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

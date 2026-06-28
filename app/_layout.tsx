import { Stack } from "expo-router";
import { SupabaseAuthProvider } from "../context/SupabaseAuth";

export default function RootLayout() {
  return (
    <SupabaseAuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SupabaseAuthProvider>
  );
}

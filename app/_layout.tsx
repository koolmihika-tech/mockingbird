import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SupabaseAuthProvider, useSupabaseAuth } from "../context/SupabaseAuth";
import { hasUserPrefs } from "../Supabase/services/preferences";

function RootNavigator() {
  const { user, isLoading } = useSupabaseAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading || !user) return;
    if (segments[0] === "preferences") return;

    let cancelled = false;
    hasUserPrefs(user.id).then((hasPrefs) => {
      if (!cancelled && !hasPrefs) {
        router.replace("/preferences");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, isLoading, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SupabaseAuthProvider>
      <RootNavigator />
    </SupabaseAuthProvider>
  );
}

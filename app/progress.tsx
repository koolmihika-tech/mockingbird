import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { getLoginStreak } from "../Supabase/services/streak";

export default function ProgressScreen() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getLoginStreak(user.id)
      .then(setStreak)
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = user?.user_metadata?.display_name ?? "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>{"‹ Back"}</Text>
        </Pressable>
        <Text style={styles.title}>Progress</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcome}>Welcome, {displayName}!</Text>

        <View style={styles.streakRow}>
          <Text style={styles.bolt}>⚡</Text>
          {loading ? (
            <ActivityIndicator color="#5C3D2E" />
          ) : (
            <Text style={styles.streakText}>{streak ?? 0} day streak</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDF6EC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    fontFamily: "Courier New",
    fontSize: 15,
    color: "#5C3D2E",
  },
  title: {
    fontFamily: "Courier New",
    fontSize: 22,
    fontWeight: "bold",
    color: "#5C3D2E",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  welcome: {
    fontFamily: "Courier New",
    fontSize: 20,
    fontWeight: "600",
    color: "#5C3D2E",
    marginBottom: 24,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bolt: {
    fontSize: 28,
  },
  streakText: {
    fontFamily: "Courier New",
    fontSize: 18,
    fontWeight: "600",
    color: "#5C3D2E",
  },
});

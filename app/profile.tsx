import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { fetchUserGenres, type Genre } from "../Supabase/services/genres";
import { fetchUserLevel, type Level } from "../Supabase/services/levels";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [level, setLevel] = useState<Level | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchUserLevel(user.id), fetchUserGenres(user.id)])
      .then(([levelData, genreData]) => {
        setLevel(levelData);
        setGenres(genreData);
      })
      .catch(() => Alert.alert("Error", "Could not load your profile."))
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = user?.user_metadata?.display_name ?? "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>{"‹ Back"}</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Profile</Text>
          <Pressable style={styles.editBtn} onPress={() => router.push("/preferences")}>
            <Text style={styles.editIcon}>✏️</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#5C3D2E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Name</Text>
            <Text style={styles.sectionValue}>{displayName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Level</Text>
            <Text style={styles.sectionValue}>
              {level ? `Level ${level.level_name}` : "Not set"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genre preferences</Text>
            {genres.length > 0 ? (
              <View style={styles.grid}>
                {genres.map((genre) => (
                  <View key={genre.genre_id} style={styles.chip}>
                    <Text style={styles.chipText}>{genre.genre_name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionValue}>Not set</Text>
            )}
          </View>
        </ScrollView>
      )}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "Courier New",
    fontSize: 22,
    fontWeight: "bold",
    color: "#5C3D2E",
  },
  editBtn: {
    padding: 4,
  },
  editIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#8B6347",
  },
  sectionValue: {
    fontFamily: "Courier New",
    fontSize: 18,
    fontWeight: "600",
    color: "#5C3D2E",
    marginTop: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 10,
  },
  chip: {
    backgroundColor: "#E8C5A0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
  },
});

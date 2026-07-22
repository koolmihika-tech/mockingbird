import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { SONGS } from "../../data/songs";
import { fetchAllLevelTopics, fetchUserLevel, type Level, type LevelTopic } from "../../Supabase/services/levels";

type PathBox = { key: string; label: string; topic?: LevelTopic };

export default function ReadingWritingScreen() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [levelTopics, setLevelTopics] = useState<LevelTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<Level | null>(null);

  useEffect(() => {
    fetchAllLevelTopics()
      .then(setLevelTopics)
      .catch((e) => {
        console.error("Failed to load levels:", e);
        setError("Could not load lessons.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUserLevel(user.id)
      .then(setUserLevel)
      .catch(() => setUserLevel(null));
  }, [user]);

  const levels = useMemo(() => {
    const byLevel = new Map<string, LevelTopic[]>();
    for (const row of levelTopics) {
      if (!byLevel.has(row.level_name)) byLevel.set(row.level_name, []);
      byLevel.get(row.level_name)!.push(row);
    }
    return Array.from(byLevel.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [levelTopics]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Reading &amp; Writing</Text>
        <Pressable style={styles.homeBtn} onPress={() => router.push("/")}>
          <Text style={styles.homeBtnText}>home</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#5C3D2E" style={styles.spinner} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.carouselSection}>
            <Text style={styles.carouselLabel}>Choose a song to begin</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {SONGS.map((song) => (
                <Pressable
                  key={song.id}
                  style={styles.songTile}
                  onPress={() => router.push(`/reading/${song.id}` as any)}
                >
                  <View style={[styles.songCover, { backgroundColor: song.coverColor }]}>
                    <Text style={styles.songCoverNote}>♪</Text>
                  </View>
                  <Text style={styles.songTileName} numberOfLines={1}>{song.displayName ?? song.name}</Text>
                  <Text style={styles.songTileArtist} numberOfLines={1}>{song.displayName ? "—" : song.artist}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {levels.map(([levelName, topics]) => {
            const boxes: PathBox[] = [
              ...topics.slice(0, 4).map((t) => ({ key: t.level_id, label: t.goal ?? t.topics, topic: t })),
              { key: `${levelName}-unit-test`, label: "Unit Test" },
            ];
            const isLocked = !!userLevel && Number(levelName) > Number(userLevel.level_name);
            return (
              <View key={levelName} style={styles.levelSection}>
                <Text style={[styles.levelHeading, isLocked && styles.lockedHeading]}>
                  Level {levelName}
                </Text>
                <View style={styles.path}>
                  {boxes.map((box, i) => {
                    const isUnitTest = !box.topic;
                    return (
                      <View key={box.key} style={styles.pathItem}>
                        <Pressable
                          style={[
                            styles.box,
                            isUnitTest && styles.unitTestBox,
                            isLocked && styles.lockedBox,
                          ]}
                          disabled={isUnitTest}
                          onPress={() =>
                            box.topic &&
                            router.push({
                              pathname: "/reading/topic/[levelId]",
                              params: { levelId: box.topic.level_id, topic: box.topic.topics, label: box.label },
                            } as any)
                          }
                        >
                          <Text
                            style={[
                              styles.boxText,
                              isUnitTest && styles.unitTestText,
                              isLocked && styles.lockedBoxText,
                            ]}
                          >
                            {box.label}
                          </Text>
                        </Pressable>
                        {i < boxes.length - 1 && <Text style={styles.arrow}>↓</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  homeBtn: {
    backgroundColor: "#E8C5A0",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  homeBtnText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
  },
  heading: {
    fontSize: 26,
    fontFamily: "Courier New",
    color: "#5C3D2E",
    fontWeight: "bold",
  },
  spinner: {
    marginTop: 40,
  },
  errorText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#B94A48",
    textAlign: "center",
    marginTop: 40,
  },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  carouselSection: {
    marginHorizontal: -24,
    paddingBottom: 8,
    marginBottom: 24,
  },
  carouselLabel: {
    fontFamily: "Courier New",
    fontSize: 16,
    fontWeight: "bold",
    color: "#5C3D2E",
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  carouselContent: {
    paddingHorizontal: 24,
    gap: 14,
  },
  songTile: {
    width: 110,
    alignItems: "center",
  },
  songCover: {
    width: 100,
    height: 100,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  songCoverNote: {
    fontSize: 36,
    color: "#5C3D2E",
  },
  songTileName: {
    fontFamily: "Courier New",
    fontSize: 12,
    fontWeight: "600",
    color: "#5C3D2E",
    textAlign: "center",
    width: 100,
  },
  songTileArtist: {
    fontFamily: "Courier New",
    fontSize: 11,
    color: "#8B6347",
    textAlign: "center",
    width: 100,
    marginTop: 2,
  },
  levelSection: {
    marginBottom: 32,
  },
  levelHeading: {
    fontFamily: "Courier New",
    fontSize: 18,
    fontWeight: "bold",
    color: "#5C3D2E",
    marginBottom: 16,
  },
  lockedHeading: {
    color: "#B0A99F",
  },
  path: {
    alignItems: "center",
  },
  pathItem: {
    alignItems: "center",
  },
  box: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#E8D5C0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 220,
    alignItems: "center",
  },
  boxText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
    textAlign: "center",
  },
  unitTestBox: {
    backgroundColor: "#E8C5A0",
    borderColor: "#5C3D2E",
    borderRadius: 20,
  },
  unitTestText: {
    fontWeight: "600",
  },
  lockedBox: {
    backgroundColor: "#EDEAE4",
    borderColor: "#D8D3CA",
  },
  lockedBoxText: {
    color: "#B0A99F",
  },
  arrow: {
    fontFamily: "Courier New",
    fontSize: 18,
    color: "#8B6347",
    paddingVertical: 4,
  },
});

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchAllLevelTopics, type LevelTopic } from "../../Supabase/services/levels";

type PathBox = { key: string; label: string; topic?: LevelTopic };

export default function ReadingWritingScreen() {
  const router = useRouter();
  const [levelTopics, setLevelTopics] = useState<LevelTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllLevelTopics()
      .then(setLevelTopics)
      .catch((e) => {
        console.error("Failed to load levels:", e);
        setError("Could not load lessons.");
      })
      .finally(() => setLoading(false));
  }, []);

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
          {levels.map(([levelName, topics]) => {
            const boxes: PathBox[] = [
              ...topics.slice(0, 4).map((t) => ({ key: t.level_id, label: t.goal ?? t.topics, topic: t })),
              { key: `${levelName}-unit-test`, label: "Unit Test" },
            ];
            return (
              <View key={levelName} style={styles.levelSection}>
                <Text style={styles.levelHeading}>Level {levelName}</Text>
                <View style={styles.path}>
                  {boxes.map((box, i) => {
                    const isUnitTest = !box.topic;
                    return (
                      <View key={box.key} style={styles.pathItem}>
                        <Pressable
                          style={[styles.box, isUnitTest && styles.unitTestBox]}
                          disabled={isUnitTest}
                          onPress={() =>
                            box.topic &&
                            router.push({
                              pathname: "/reading/topic/[levelId]",
                              params: { levelId: box.topic.level_id, topic: box.topic.topics, label: box.label },
                            } as any)
                          }
                        >
                          <Text style={[styles.boxText, isUnitTest && styles.unitTestText]}>{box.label}</Text>
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
  arrow: {
    fontFamily: "Courier New",
    fontSize: 18,
    color: "#8B6347",
    paddingVertical: 4,
  },
});

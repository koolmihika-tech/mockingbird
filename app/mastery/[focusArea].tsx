import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { MasteryDial } from "../../components/MasteryDial";
import { useAppTheme } from "../../constants/theme";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { fetchTopicMasteryDetail, type TopicMasteryDetail } from "../../Supabase/services/mastery";

export default function MasteryDetailScreen() {
  const { focusArea } = useLocalSearchParams<{ focusArea: string }>();
  const theme = useAppTheme();
  const { user } = useSupabaseAuth();
  const [detail, setDetail] = useState<TopicMasteryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !focusArea) {
      setDetail(null);
      setLoading(false);
      return;
    }
    fetchTopicMasteryDetail(user.id, focusArea)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [user, focusArea]);

  return (
    <AppScaffold title={focusArea ?? "Mastery"} back>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {detail && (
            <>
              <View style={styles.overall}>
                <MasteryDial topic="Overall" accuracy={detail.overall.accuracy} />
              </View>

              <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
                Subtopics
              </Text>
              <View style={styles.grid}>
                {detail.subtopics.map((subtopic) => (
                  <MasteryDial key={subtopic.levelId} topic={subtopic.topic} accuracy={subtopic.accuracy} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  overall: { alignItems: "center", marginTop: 8, marginBottom: 8 },
  sectionLabel: { marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
});

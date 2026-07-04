import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { SONGS } from "../../data/songs";

export default function ReadingWritingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Reading &amp; Writing</Text>
        <Pressable style={styles.homeBtn} onPress={() => router.push("/")}>
          <Text style={styles.homeBtnText}>home</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {SONGS.map((song) => (
          <Pressable
            key={song.id}
            style={styles.songRow}
            onPress={() => router.push(`/reading/${song.id}` as any)}
          >
            <View style={styles.songInfo}>
              <Text style={styles.songName}>{song.displayName ?? song.name}</Text>
              <Text style={styles.songArtist}>{song.displayName ? "—" : song.artist}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
  container: {
    padding: 24,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontFamily: "Courier New",
    fontSize: 15,
    color: "#5C3D2E",
    fontWeight: "600",
  },
  songArtist: {
    fontFamily: "Courier New",
    fontSize: 13,
    color: "#8B6347",
    marginTop: 2,
  },
});

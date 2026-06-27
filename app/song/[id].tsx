import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { getLyrics } from "../../api/lrclib";
import { SONGS } from "../../data/songs";
import vocab from "../../data/vocabulary.json";

// ─── YouTube player ──────────────────────────────────────────────────────────

type VideoStatus = "loading" | "playing" | "retrying" | "fallback";

function buildYouTubeHtml(query: string): string {
  const safe = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; background: #000; }
      #player { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      function post(msg) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }

      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);

      function onYouTubeIframeAPIReady() {
        new YT.Player('player', {
          playerVars: {
            listType: 'search',
            list: '${safe}',
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1
          },
          events: {
            onReady: function(e) {
              e.target.playVideo();
              post({ type: 'ready' });
            },
            onStateChange: function(e) {
              post({ type: 'state', state: e.data });
            },
            onError: function(e) {
              // error codes: 2=bad param, 5=html5 error, 100=not found/private,
              // 101=embed blocked, 150=embed blocked (same restriction, different check)
              post({ type: 'error', code: e.data });
            }
          }
        });
      }
    </script>
  </body>
</html>
`.trim();
}

interface VideoPlayerProps {
  queries: string[];
  songName: string;
}

function VideoPlayer({ queries, songName }: VideoPlayerProps) {
  const [queryIndex, setQueryIndex] = useState(0);
  const [status, setStatus] = useState<VideoStatus>("loading");
  const [statusMsg, setStatusMsg] = useState("");
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuery = queries[queryIndex];
  const allFailed = queryIndex >= queries.length;

  // Reset when song changes
  useEffect(() => {
    setQueryIndex(0);
    setStatus("loading");
    setStatusMsg("");
  }, [songName]);

  // Timeout: if no 'ready' or 'error' message arrives within 10 s, try next
  useEffect(() => {
    if (allFailed) return;
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    setStatus("loading");
    loadingTimer.current = setTimeout(() => {
      tryNext("Took too long to load");
    }, 10000);
    return () => { if (loadingTimer.current) clearTimeout(loadingTimer.current); };
  }, [queryIndex, songName]);

  const tryNext = useCallback((reason: string) => {
    setQueryIndex((i) => {
      const next = i + 1;
      if (next >= queries.length) {
        setStatus("fallback");
        setStatusMsg("");
      } else {
        setStatus("retrying");
        setStatusMsg(`Trying another version… (${reason})`);
      }
      return next;
    });
  }, [queries.length]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        if (loadingTimer.current) clearTimeout(loadingTimer.current);
        setStatus("playing");
        setStatusMsg("");
      } else if (msg.type === "error") {
        if (loadingTimer.current) clearTimeout(loadingTimer.current);
        tryNext(`error ${msg.code}`);
      }
    } catch {}
  }, [tryNext]);

  const openOnYouTube = () => {
    const q = encodeURIComponent(`${songName} letra`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
  };

  if (allFailed) {
    return (
      <View style={styles.fallbackBox}>
        <Text style={styles.fallbackIcon}>▷</Text>
        <Text style={styles.fallbackTitle}>Video unavailable in app</Text>
        <Text style={styles.fallbackSub}>
          YouTube blocked embedding for all available versions of this song.
        </Text>
        <Pressable style={styles.youtubeBtn} onPress={openOnYouTube}>
          <Text style={styles.youtubeBtnText}>Open on YouTube ↗</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      {/* Status overlay shown while loading or retrying */}
      {(status === "loading" || status === "retrying") && (
        <View style={styles.videoOverlay}>
          <ActivityIndicator color="#FDF6EC" size="large" />
          <Text style={styles.videoOverlayText}>
            {status === "retrying" ? statusMsg : "Loading video…"}
          </Text>
        </View>
      )}
      <WebView
        key={`${songName}-${queryIndex}`}
        style={styles.webview}
        source={{
          html: buildYouTubeHtml(currentQuery),
          baseUrl: "https://www.youtube.com",
        }}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
        onMessage={handleMessage}
      />
    </View>
  );
}

// ─── Flashcard carousel ───────────────────────────────────────────────────────

function FlashCardCarousel({ entries, color }: { entries: [string, string][]; color: string }) {
  const [index, setIndex] = useState(0);
  const [word, definition] = entries[index];

  return (
    <View style={styles.flashcardsSection}>
      <Text style={styles.sectionHeader}>Vocabulary</Text>
      <Text style={styles.sectionSubheader}>Tap a card to flip • {index + 1} of {entries.length}</Text>
      <View style={styles.carouselRow}>
        <Pressable
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
          disabled={index === 0}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <FlashCard key={word} word={word} definition={definition} color={color} />
        <Pressable
          onPress={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
          style={[styles.arrowBtn, index === entries.length - 1 && styles.arrowBtnDisabled]}
          disabled={index === entries.length - 1}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FlashCard({ word, definition, color }: { word: string; definition: string; color: string }) {
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function flip() {
    Animated.spring(anim, { toValue: flipped ? 0 : 1, friction: 8, useNativeDriver: true }).start();
    setFlipped(!flipped);
  }

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate  = anim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <Pressable onPress={flip} style={styles.cardWrapper}>
      <Animated.View style={[styles.flashCard, { backgroundColor: color, transform: [{ rotateY: frontRotate }] }]}>
        <Text style={styles.flashCardWord}>{word}</Text>
        <Text style={styles.flashCardHint}>tap to reveal</Text>
      </Animated.View>
      <Animated.View style={[styles.flashCard, styles.flashCardBack, { backgroundColor: color, transform: [{ rotateY: backRotate }] }]}>
        <Text style={styles.flashCardDefinition}>{definition}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SongPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = SONGS.find((s) => s.id === id);

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!song) return;
    setLoadingLyrics(true);
    setLyricsError(null);
    getLyrics(song.name, song.artist)
      .then((result) => setLyrics(result?.plainLyrics ?? "Lyrics not found for this track."))
      .catch(() => setLyricsError("Could not load lyrics."))
      .finally(() => setLoadingLyrics(false));
  }, [song?.id]);

  if (!song) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const songVocab = (vocab as Record<string, Record<string, string>>)[song.name] ?? {};
  const vocabEntries = Object.entries(songVocab);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Cover + title */}
        <View style={[styles.coverArt, { backgroundColor: song.coverColor }]}>
          <Text style={styles.coverNote}>♪</Text>
        </View>
        <Text style={styles.songName}>{song.name}</Text>
        <Text style={styles.songArtist}>{song.artist}</Text>

        {/* Video player with automatic fallback */}
        <VideoPlayer queries={song.videoQueries} songName={song.name} />

        {/* Lyrics */}
        <View style={styles.lyricsSection}>
          <Text style={styles.sectionHeader}>Lyrics</Text>
          {loadingLyrics ? (
            <ActivityIndicator color="#5C3D2E" style={{ marginTop: 12 }} />
          ) : lyricsError ? (
            <Text style={styles.errorText}>{lyricsError}</Text>
          ) : (
            <Text style={styles.lyricsText}>{lyrics}</Text>
          )}
        </View>

        {/* Flashcards */}
        {vocabEntries.length > 0 && (
          <FlashCardCarousel entries={vocabEntries} color={song.coverColor} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#FDF6EC" },
  topBar:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn:     { alignSelf: "flex-start", backgroundColor: "#E8C5A0", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  backBtnText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E" },
  container:   { padding: 24, paddingBottom: 48, alignItems: "center" },
  coverArt: {
    width: 160, height: 160, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  coverNote:   { fontSize: 60, color: "#5C3D2E" },
  songName:    { fontFamily: "Courier New", fontSize: 22, fontWeight: "bold", color: "#5C3D2E", textAlign: "center", marginBottom: 4 },
  songArtist:  { fontFamily: "Courier New", fontSize: 15, color: "#8B6347", textAlign: "center", marginBottom: 20 },

  // Video
  videoContainer: {
    width: "100%", aspectRatio: 16 / 9, borderRadius: 12,
    overflow: "hidden", backgroundColor: "#000", marginBottom: 28,
  },
  webview: { flex: 1 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
    alignItems: "center", justifyContent: "center",
    gap: 12, zIndex: 10,
  },
  videoOverlayText: { fontFamily: "Courier New", fontSize: 13, color: "#ccc", textAlign: "center", paddingHorizontal: 20 },

  // Fallback
  fallbackBox: {
    width: "100%", backgroundColor: "#FFF3E0", borderRadius: 12,
    padding: 24, alignItems: "center", marginBottom: 28, gap: 8,
  },
  fallbackIcon:  { fontSize: 36, color: "#8B6347" },
  fallbackTitle: { fontFamily: "Courier New", fontSize: 15, fontWeight: "bold", color: "#5C3D2E", textAlign: "center" },
  fallbackSub:   { fontFamily: "Courier New", fontSize: 12, color: "#8B6347", textAlign: "center", lineHeight: 18 },
  youtubeBtn: {
    marginTop: 8, backgroundColor: "#E8C5A0",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  youtubeBtnText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E", fontWeight: "600" },

  // Lyrics
  lyricsSection: { width: "100%", marginBottom: 28 },
  sectionHeader: { fontFamily: "Courier New", fontSize: 16, fontWeight: "bold", color: "#5C3D2E", marginBottom: 4 },
  lyricsText:    { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E", lineHeight: 24 },
  errorText:     { fontFamily: "Courier New", fontSize: 14, color: "#B94A48" },

  // Flashcards
  flashcardsSection: { width: "100%", marginBottom: 28 },
  sectionSubheader:  { fontFamily: "Courier New", fontSize: 12, color: "#8B6347", marginBottom: 16 },
  carouselRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  arrowBtn:          { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#E8C5A0", borderRadius: 18 },
  arrowBtnDisabled:  { opacity: 0.3 },
  arrowText:         { fontSize: 24, color: "#5C3D2E", lineHeight: 28 },
  cardWrapper:       { flex: 1, height: 140 },
  flashCard: {
    position: "absolute", width: "100%", height: "100%", borderRadius: 12,
    alignItems: "center", justifyContent: "center", backfaceVisibility: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2, padding: 12,
  },
  flashCardBack:       { position: "absolute" },
  flashCardWord:       { fontFamily: "Courier New", fontSize: 18, fontWeight: "bold", color: "#5C3D2E", textAlign: "center" },
  flashCardHint:       { fontFamily: "Courier New", fontSize: 10, color: "#8B6347", marginTop: 6 },
  flashCardDefinition: { fontFamily: "Courier New", fontSize: 15, color: "#5C3D2E", textAlign: "center", fontStyle: "italic" },

  notFound: { fontFamily: "Courier New", fontSize: 16, color: "#5C3D2E", padding: 24 },
});

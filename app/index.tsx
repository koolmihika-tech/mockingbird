import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { SONGS } from "../data/songs";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.58;

const SECTIONS = [
  { label: "Songs",     color: "#E8C5A0" },
  { label: "Reading/Writing",   color: "#D4A9A9" },
  { label: "Listening", color: "#B5C9A8" },
  { label: "Speaking",  color: "#A9BFD4" },
];

const PRACTICE_ITEMS = ["Reading/Writing", "Listening", "Speaking"];

function Drawer({ visible, onClose, router }: { visible: boolean; onClose: () => void; router: ReturnType<typeof useRouter> }) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [mounted, setMounted] = useState(false);
  const [songsOpen, setSongsOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);

  const prevVisible = useRef(false);
  if (visible !== prevVisible.current) {
    prevVisible.current = visible;
    if (visible) {
      setMounted(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 20,
        tension: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: -DRAWER_WIDTH,
        friction: 20,
        tension: 120,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }

  function navigate(route: string) {
    onClose();
    router.push(route as any);
  }

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.drawerContent}>
          <View style={styles.drawerTitleRow}>
            <View style={styles.drawerMenuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
            <Text style={styles.drawerTitle}>Menu</Text>
          </View>

          <Pressable style={styles.drawerItem} onPress={() => navigate("/")}>
            <Text style={styles.drawerItemText}>Home</Text>
          </Pressable>

          <Pressable style={styles.drawerItem} onPress={() => navigate("/songs")}>
            <Text style={styles.drawerItemText}>My Songs</Text>
          </Pressable>

          <Pressable style={styles.drawerItem} onPress={() => {}}>
            <Text style={styles.drawerItemText}>Progress</Text>
          </Pressable>

          {/* Songs dropdown */}
          <Pressable style={styles.drawerItem} onPress={() => setSongsOpen((o) => !o)}>
            <Text style={styles.drawerItemText}>Songs</Text>
            <Text style={styles.drawerChevron}>{songsOpen ? "▴" : "▾"}</Text>
          </Pressable>
          {songsOpen && SONGS.filter((s) => !s.displayName).map((song) => (
            <Pressable
              key={song.id}
              style={styles.drawerSubItem}
              onPress={() => navigate(`/song/${song.id}`)}
            >
              <Text style={styles.drawerSubItemText}>{song.name}</Text>
              <Text style={styles.drawerSubItemArtist}>{song.artist}</Text>
            </Pressable>
          ))}

          {/* Practice dropdown */}
          <Pressable style={styles.drawerItem} onPress={() => setPracticeOpen((o) => !o)}>
            <Text style={styles.drawerItemText}>Practice</Text>
            <Text style={styles.drawerChevron}>{practiceOpen ? "▴" : "▾"}</Text>
          </Pressable>
          {practiceOpen && PRACTICE_ITEMS.map((item) => (
            <Pressable
              key={item}
              style={styles.drawerSubItem}
              onPress={() => navigate(`/${item.toLowerCase()}`)}
            >
              <Text style={styles.drawerSubItemText}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, login, signup, logout, isLoading, error: authError } = useSupabaseAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function openModal(mode: "login" | "signup") {
    setEmail("");
    setPassword("");
    setModalMode(mode);
  }

  async function handleSubmit() {
    if (modalMode === "login") {
      await login(email, password);
    } else {
      await signup(email, password);
    }
    if (!authError) setModalMode(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.menuBtn} onPress={() => setDrawerOpen((o) => !o)}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </Pressable>
          <Text style={styles.logo}>Mockingbird</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#5C3D2E" />
        ) : user ? (
          <Pressable style={styles.loginBtn} onPress={logout}>
            <Text style={styles.loginText}>Log out</Text>
          </Pressable>
        ) : (
          <View style={styles.authBtns}>
            <Pressable style={styles.loginBtn} onPress={() => openModal("signup")}>
              <Text style={styles.loginText}>Sign up</Text>
            </Pressable>
            <Pressable style={styles.loginBtn} onPress={() => openModal("login")}>
              <Text style={styles.loginText}>Log in</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Song carousel */}
        <View style={styles.carouselSection}>
          <Text style={styles.carouselLabel}>Songs</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          >
            {SONGS.map((song) => (
              <Pressable
                key={song.id}
                style={styles.songTile}
                onPress={() => router.push(`/song/${song.id}` as any)}
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

        {/* Section buttons */}
        <View style={styles.grid}>
          {SECTIONS.map((section) => (
            <Pressable
              key={section.label}
              style={[styles.card, { backgroundColor: section.color }]}
              onPress={() => router.push(`/${section.label.toLowerCase()}`)}
            >
              <Text style={styles.cardText}>{section.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        {[
          { label: "home", route: null },
          { label: "my songs", route: "/songs" },
          { label: "progress", route: null },
        ].map((tab) => (
          <Pressable
            key={tab.label}
            style={styles.navBtn}
            onPress={() => tab.route && router.push(tab.route as any)}
          >
            <Text style={styles.navText}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Drawer (rendered last so it floats above everything) */}
      <Drawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} router={router} />

      {/* Login / Sign up modal */}
      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modalMode === "signup" ? "Sign up" : "Log in"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8B6347"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8B6347"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {authError && <Text style={styles.modalError}>{authError}</Text>}
            <Pressable style={styles.modalBtn} onPress={handleSubmit} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color="#5C3D2E" />
                : <Text style={styles.modalBtnText}>{modalMode === "signup" ? "Sign up" : "Log in"}</Text>}
            </Pressable>
            <Pressable onPress={() => setModalMode(null)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuBtn: {
    gap: 5,
    paddingVertical: 4,
    justifyContent: "center",
  },
  menuLine: {
    width: 22,
    height: 2,
    backgroundColor: "#5C3D2E",
    borderRadius: 2,
  },
  logo: {
    fontSize: 26,
    fontFamily: "Courier New",
    color: "#5C3D2E",
    fontWeight: "bold",
  },
  authBtns: {
    flexDirection: "row",
    gap: 8,
  },
  loginBtn: {
    backgroundColor: "#E8C5A0",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
  },
  scrollContent: {
    flexGrow: 1,
  },
  carouselSection: {
    paddingTop: 8,
    paddingBottom: 8,
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
  grid: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
    justifyContent: "space-evenly",
  },
  card: {
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardText: {
    fontFamily: "Courier New",
    fontSize: 20,
    color: "#5C3D2E",
    fontWeight: "600",
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E8D5C0",
    backgroundColor: "#FDF6EC",
    paddingBottom: 8,
    paddingTop: 8,
  },
  navBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  navText: {
    fontFamily: "Courier New",
    fontSize: 13,
    color: "#5C3D2E",
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    width: "82%",
    backgroundColor: "#FDF6EC",
    borderRadius: 20,
    padding: 28,
    gap: 14,
  },
  modalTitle: {
    fontFamily: "Courier New",
    fontSize: 20,
    fontWeight: "bold",
    color: "#5C3D2E",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8D5C0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
    backgroundColor: "#FFF8F0",
  },
  modalError: {
    fontFamily: "Courier New",
    fontSize: 12,
    color: "#B94A48",
  },
  modalBtn: {
    backgroundColor: "#E8C5A0",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalBtnText: {
    fontFamily: "Courier New",
    fontSize: 15,
    fontWeight: "600",
    color: "#5C3D2E",
  },
  modalCancel: {
    fontFamily: "Courier New",
    fontSize: 13,
    color: "#8B6347",
    textAlign: "center",
  },
  // Drawer
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#FDF6EC",
    borderRightWidth: 1,
    borderRightColor: "#E8D5C0",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
  drawerContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  drawerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  drawerMenuIcon: {
    gap: 5,
    justifyContent: "center",
  },
  drawerTitle: {
    fontFamily: "Courier New",
    fontSize: 20,
    fontWeight: "bold",
    color: "#5C3D2E",
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D5C0",
  },
  drawerItemText: {
    fontFamily: "Courier New",
    fontSize: 16,
    color: "#5C3D2E",
  },
  drawerChevron: {
    fontSize: 12,
    color: "#8B6347",
  },
  drawerSubItem: {
    paddingVertical: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E4D0",
  },
  drawerSubItemText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
  },
  drawerSubItemArtist: {
    fontFamily: "Courier New",
    fontSize: 11,
    color: "#8B6347",
    marginTop: 2,
  },
});

import { Stack } from "expo-router";
import { SpotifyAuthProvider } from "../context/SpotifyAuth";

export default function RootLayout() {
  return (
    <SpotifyAuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SpotifyAuthProvider>
  );
}

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "streaming",
  "user-read-email",
  "user-read-private",
].join(" ");

const discovery = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

interface SpotifyAuthContextType {
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const SpotifyAuthContext = createContext<SpotifyAuthContextType>({
  token: null,
  login: async () => {},
  logout: () => {},
  isLoading: false,
});

export function SpotifyAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "mockingbird" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES.split(" "),
      redirectUri,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      exchangeCode(code);
    }
  }, [response]);

  async function exchangeCode(code: string) {
    setIsLoading(true);
    try {
      const res = await fetch(discovery.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: CLIENT_ID,
          code_verifier: request!.codeVerifier!,
        }).toString(),
      });
      const json = await res.json();
      setToken(json.access_token);
    } catch (e) {
      console.error("Token exchange failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login() {
    await promptAsync();
  }

  function logout() {
    setToken(null);
  }

  return (
    <SpotifyAuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </SpotifyAuthContext.Provider>
  );
}

export function useSpotifyAuth() {
  return useContext(SpotifyAuthContext);
}

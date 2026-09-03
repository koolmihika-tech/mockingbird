import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "../Supabase/lib/supabase";
import { signIn, signInWithGoogle, signOut, signUp } from "../Supabase/services/authenticate";
import { DEFAULT_AVATAR, updateUserAvatar } from "../Supabase/services/avatars";

export type AuthResult = { ok: boolean; error?: string };

interface SupabaseAuthContextType {
  user: any | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  user: null,
  login: async () => ({ ok: false }),
  signup: async () => ({ ok: false }),
  loginWithGoogle: async () => ({ ok: false }),
  logout: async () => {},
  isLoading: false,
  error: null,
});

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session on app launch
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    setIsLoading(true);
    setError(null);
    try {
      const data = await signIn(email, password);
      setUser(data.user);
      return { ok: true };
    } catch (e: any) {
      const message = e.message ?? "Login failed";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }

  async function signup(email: string, password: string, displayName?: string): Promise<AuthResult> {
    setIsLoading(true);
    setError(null);
    try {
      const data = await signUp(email, password, displayName);
      // Give every new account the default avatar; they can change it in Profile.
      if (data.user) {
        try {
          await updateUserAvatar(data.user.id, DEFAULT_AVATAR);
        } catch (avatarError) {
          console.error("Failed to assign default avatar:", avatarError);
        }
      }
      return { ok: true };
    } catch (e: any) {
      const message = e.message ?? "Sign up failed";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }

  async function loginWithGoogle(): Promise<AuthResult> {
    setIsLoading(true);
    setError(null);
    try {
      const data = await signInWithGoogle();
      if (data?.user) setUser(data.user);
      return { ok: !!data?.user };
    } catch (e: any) {
      const message = e.message ?? "Google sign in failed";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await signOut();
    setUser(null);
  }

  return (
    <SupabaseAuthContext.Provider value={{ user, login, signup, loginWithGoogle, logout, isLoading, error }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}
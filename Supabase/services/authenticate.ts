import * as AuthSession from "expo-auth-session";
import { getQueryParams } from "expo-auth-session/build/QueryParams";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

// Set on sign-in, consumed on sign-out to close the matching user_sessions row
let currentUserId: string | null = null;
let currentAppSessionId: string | null = null;

async function logSessionStart(userId: string) {
  const appSessionId = Crypto.randomUUID();

  const { error } = await supabase
    .from("user_sessions")
    .insert({ user_id: userId, app_session_id: appSessionId, sign_in: new Date().toISOString() });

  if (error) {
    console.error("Failed to log session start:", error.message);
    return;
  }

  currentUserId = userId;
  currentAppSessionId = appSessionId;
}

async function logSessionEnd() {
  if (!currentUserId || !currentAppSessionId) return;

  const { error } = await supabase
    .from("user_sessions")
    .update({ sign_out: new Date().toISOString() })
    .eq("user_id", currentUserId)
    .eq("app_session_id", currentAppSessionId);

  if (error) {
    console.error("Failed to log session end:", error.message);
    return;
  }

  currentUserId = null;
  currentAppSessionId = null;
}

//Signing up with email, password
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    Alert.alert("Sign Up Failed", error.message);
    throw error;
  }

  // Supabase returns a user but no session when email confirmation is required
  if (data.user && !data.session) {
    Alert.alert("Check Your Email", "A confirmation link has been sent to " + email + ". Please verify your email before logging in.");
  } else {
    Alert.alert("Account Created", "Welcome! You have successfully signed up.");
  }

  return data;
}

//Signing in with email, password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    Alert.alert("Login Failed", "Invalid email or password.");
    throw error;
  }
  else {
    Alert.alert("Login Successful", "You have successfully logged in.");
  }

  if (data.user) {
    await logSessionStart(data.user.id);
  }

  return data;
}

//Signing in / up with Google
export async function signInWithGoogle() {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: "mockingbird" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) {
    Alert.alert("Google Sign In Failed", error.message);
    throw error;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") return null;

  console.log("Google OAuth redirect URL:", result.url);
  const { params, errorCode } = getQueryParams(result.url);
  const code = params.code;
  if (!code) {
    const description = params.error_description ?? errorCode ?? "No auth code was returned.";
    Alert.alert("Google Sign In Failed", description);
    throw new Error(description);
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) {
    Alert.alert("Google Sign In Failed", sessionError.message);
    throw sessionError;
  }

  Alert.alert("Success", "You have successfully signed in with Google.");

  if (sessionData.user) {
    await logSessionStart(sessionData.user.id);
  }

  return sessionData;
}

//Signing out
export async function signOut() {
    await logSessionEnd();
    const { error } = await supabase.auth.signOut();
    return { error };
}

//Setting the user's display name
export async function updateDisplayName(displayName: string) {
  const { data, error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (error) throw error;
  return data;
}
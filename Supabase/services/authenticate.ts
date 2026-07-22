import { Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

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
  const params = new URL(result.url).searchParams;
  const code = params.get("code");
  if (!code) {
    const description = params.get("error_description") ?? params.get("error") ?? "No auth code was returned.";
    Alert.alert("Google Sign In Failed", description);
    throw new Error(description);
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) {
    Alert.alert("Google Sign In Failed", sessionError.message);
    throw sessionError;
  }

  Alert.alert("Success", "You have successfully signed in with Google.");
  return sessionData;
}

//Signing out
export async function signOut() {
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
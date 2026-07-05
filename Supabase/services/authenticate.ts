import { Alert } from "react-native";
import { supabase } from "../lib/supabase";

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
import { Tabs } from "expo-router";

/**
 * The four primary routes live in this group. The visible bottom navigation is
 * rendered by the shared <AppFooter/> inside each page's <AppScaffold/> (so the
 * same footer appears on detail screens too), therefore the navigator's own tab
 * bar is disabled here to avoid a duplicate.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="songs" />
      <Tabs.Screen name="practice" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

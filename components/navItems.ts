import type { MaterialCommunityIcons } from "@expo/vector-icons";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

export type NavItem = {
  label: string;
  route: "/" | "/songs" | "/practice" | "/profile";
  icon: Icon; // inactive (outline)
  activeIcon: Icon; // active (filled)
};

/** The four primary destinations. The footer and the drawer menu both render
 *  from this list so they always stay in sync. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", route: "/", icon: "home-variant-outline", activeIcon: "home-variant" },
  { label: "Songs", route: "/songs", icon: "music-note-outline", activeIcon: "music-note" },
  { label: "Practice", route: "/practice", icon: "cards-outline", activeIcon: "cards" },
  { label: "Profile", route: "/profile", icon: "account-outline", activeIcon: "account" },
];

/** Secondary destinations shown below the primary ones in the drawer. */
export const DRAWER_EXTRA_ITEMS: { label: string; route: string; icon: Icon }[] = [
  { label: "Progress", route: "/progress", icon: "chart-line" },
  { label: "Resources", route: "/resources", icon: "book-open-page-variant" },
];

export function isRouteActive(pathname: string, route: string): boolean {
  return route === "/" ? pathname === "/" : pathname.startsWith(route);
}

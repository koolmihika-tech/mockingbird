import { type ReactNode } from "react";
import { View } from "react-native";
import { useAppTheme } from "../constants/theme";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";

/** Page chrome shared by every screen: a header on top, the page content in the
 *  middle, and the navigation footer at the bottom. */
export function AppScaffold({
  title,
  back,
  onBack,
  rightActions,
  reversedHeader,
  children,
}: {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  rightActions?: ReactNode;
  reversedHeader?: boolean;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={title} back={back} onBack={onBack} rightActions={rightActions} reversed={reversedHeader} />
      <View style={{ flex: 1 }}>{children}</View>
      <AppFooter />
    </View>
  );
}

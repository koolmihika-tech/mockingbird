import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Linking, StyleSheet, View } from "react-native";
import { List, Text } from "react-native-paper";
import { AppScaffold } from "../components/AppScaffold";
import { useAppTheme } from "../constants/theme";

export default function ResourcesScreen() {
  const theme = useAppTheme();

  return (
    <AppScaffold title="Helpful Resources" back>
      <View style={styles.container}>
        <List.Item
          title="English–Spanish Dictionary"
          description="SpanishDict.com"
          left={(props) => <MaterialCommunityIcons {...props} name="book-alphabet" size={26} color={theme.colors.primary} />}
          right={(props) => <MaterialCommunityIcons {...props} name="open-in-new" size={22} color={theme.colors.onSurfaceVariant} />}
          onPress={() => Linking.openURL("https://www.spanishdict.com/")}
          style={[styles.item, { backgroundColor: theme.colors.surfaceVariant }]}
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, paddingHorizontal: 4 }}>
          More resources coming soon.
        </Text>
      </View>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  item: { borderRadius: 16 },
});

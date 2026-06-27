import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

export default function ResourcesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Helpful Resources</Text>

      <Pressable onPress={() => Linking.openURL('https://www.spanishdict.com/')}>
        <Text style={styles.buttonText}>English-Spanish Dictionary</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#008000',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  text: {
    color: '#f1ee8e',
  },
  pressable: {
    color: '#ADD8E6',
  },
  buttonText: {
    color: '#000000',
  },
});

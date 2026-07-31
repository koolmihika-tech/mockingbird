import { useLocalSearchParams } from "expo-router";
import { SongPracticeScreen } from "../../../components/SongPracticeScreen";

export default function SongReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SongPracticeScreen songId={id} mode="reading" title="Reading" />;
}

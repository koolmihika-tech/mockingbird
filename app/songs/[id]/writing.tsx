import { useLocalSearchParams } from "expo-router";
import { SongPracticeScreen } from "../../../components/SongPracticeScreen";

export default function SongWritingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SongPracticeScreen songId={id} mode="writing" title="Writing" />;
}

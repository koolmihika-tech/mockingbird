import { SongPickerScreen } from "../components/SongPickerScreen";

export default function ListeningScreen() {
  return (
    <SongPickerScreen
      title="Listening"
      subtitle="Pick a song, listen to a lyric line, and type what you hear."
      route="listening"
      icon="headphones"
    />
  );
}

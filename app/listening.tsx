import { SongPickerScreen } from "../components/SongPickerScreen";

export default function ListeningScreen() {
  return (
    <SongPickerScreen
      title="Listening"
      subtitle="Pick a song, listen to a word or short phrase, and choose which of two options you heard."
      route="listening"
      icon="headphones"
    />
  );
}

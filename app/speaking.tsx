import { SongPickerScreen } from "../components/SongPickerScreen";

export default function SpeakingScreen() {
  return (
    <SongPickerScreen
      title="Speaking"
      subtitle="Pick a song, say a lyric line out loud, and check your pronunciation."
      route="speaking"
      icon="microphone-variant"
    />
  );
}

export interface Song {
  id: string;
  // Fixed UUID used as lesson_history.lesson_id when logging song-practice
  // sessions — deliberately not a real levels.level_id, so mastery.ts's
  // join-by-level_id excludes these rows from the profile's topic-mastery
  // dials while they remain fully visible to the ML feature pipeline, which
  // reads lesson_history directly.
  historyId: string;
  name: string;
  artist: string;
  coverColor: string;
  displayName?: string;
  level: string;
  videoQueries: string[];
  videoIds: string[];
}

export const SONGS: Song[] = [
  {
    id: "1",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a01",
    name: "Vivir Mi Vida",
    artist: "Marc Anthony",
    coverColor: "#E8C5A0",
    level: "1",
    videoQueries: [
      "vivir mi vida marc anthony",
      "vivir mi vida marc anthony letra",
      "vivir mi vida marc anthony lyric video",
      "vivir mi vida marc anthony karaoke",
      "vivir mi vida marc anthony cover",
    ],
    videoIds: ["YXnjy5YlDwk"],
  },
  {
    id: "2",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a02",
    name: "Me Gustas Tú",
    artist: "Mano Chao",
    coverColor: "#D4A9A9",
    level: "1",
    videoQueries: [
      "me gustas tu mano chao",
      "me gustas tu mano chao letra",
      "me gustas tu mano chao lyric video",
      "me gustas tu mano chao karaoke",
      "me gustas tu mano chao cover",
    ],
    videoIds: ["rs6Y4kZ8qtw"],
  },
  {
    id: "3",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a03",
    name: "Limón y Sal",
    artist: "Julieta Venegas",
    coverColor: "#B5C9A8",
    level: "2",
    videoQueries: [
      "limon y sal julieta venegas",
      "limon y sal julieta venegas letra",
      "limon y sal julieta venegas lyric video",
      "limon y sal julieta venegas karaoke",
      "limon y sal julieta venegas cover",
    ],
    videoIds: ["tIpzfs5tBJU"],
  },
  {
    id: "4",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a04",
    name: "Mejor Que Ayer",
    artist: "Diego Torres",
    coverColor: "#A9BFD4",
    level: "2",
    videoQueries: [
      "mejor que ayer diego torres",
      "mejor que ayer diego torres letra",
      "mejor que ayer diego torres lyric video",
      "mejor que ayer diego torres karaoke",
      "mejor que ayer diego torres cover",
    ],
    videoIds: ["9YfFaCxZnpM"],
  },
  {
    id: "5",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a05",
    name: "Robarte un Beso",
    artist: "Carlos Vives Sebastián Yatra",
    coverColor: "#C9B8D4",
    level: "2",
    videoQueries: [
      "robarte un beso carlos vives sebastian yatra",
      "robarte un beso carlos vives sebastian yatra letra",
      "robarte un beso lyric video",
      "robarte un beso karaoke",
      "robarte un beso cover",
    ],
    videoIds: ["Mtau4v6foHA"],
  },
  {
    id: "6",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a06",
    name: "La Libertad",
    artist: "Álvaro Soler",
    coverColor: "#A8C9C0",
    level: "1",
    videoQueries: [
      "la libertad alvaro soler",
      "la libertad alvaro soler letra",
      "la libertad alvaro soler lyric video",
      "la libertad alvaro soler karaoke",
      "la libertad alvaro soler cover",
    ],
    videoIds: ["okAqaED2w4g"],
  },
  {
    id: "7",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a07",
    name: "Me Gustas Tú",
    artist: "Mano Chao",
    coverColor: "#D4C9A8",
    level: "2",
    displayName: "Placeholder",
    videoQueries: [
      "me gustas tu mano chao letra",
      "me gustas tu mano chao lyric video",
      "me gustas tu mano chao karaoke",
      "me gustas tu mano chao cover",
    ],
    videoIds: ["YXnjy5YlDwk"],
  },
  {
    id: "8",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a08",
    name: "Despacito",
    artist: "Luis Fonsi",
    coverColor: "#C0A8C9",
    level: "2",
    displayName: "Placeholder",
    videoQueries: [
      "despacito luis fonsi",
      "despacito luis fonsi letra",
      "despacito luis fonsi lyric video",
      "despacito karaoke",
    ],
    videoIds: ["kJQP7kiw5Fk"],
  },
  {
    id: "9",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a09",
    name: "Bailando",
    artist: "Enrique Iglesias",
    coverColor: "#A8B5C9",
    level: "2",
    displayName: "Placeholder",
    videoQueries: [
      "bailando enrique iglesias",
      "bailando enrique iglesias letra",
      "bailando enrique iglesias lyric video",
      "bailando karaoke español",
    ],
    videoIds: ["b8I-7Wk_Vbc"],
  },
  {
    id: "10",
    historyId: "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a0a",
    name: "La Bicicleta",
    artist: "Carlos Vives Shakira",
    coverColor: "#C9A8A8",
    level: "2",
    displayName: "Placeholder",
    videoQueries: [
      "la bicicleta carlos vives shakira",
      "la bicicleta carlos vives shakira letra",
      "la bicicleta lyric video",
      "la bicicleta karaoke",
    ],
    videoIds: ["-UV0QGLmYys"],
  },
];

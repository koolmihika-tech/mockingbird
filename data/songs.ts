export interface Song {
  id: string;
  name: string;
  artist: string;
  coverColor: string;
  displayName?: string;
  videoQueries: string[];
}

export const SONGS: Song[] = [
  {
    id: "1",
    name: "Vivir Mi Vida",
    artist: "Marc Anthony",
    coverColor: "#E8C5A0",
    videoQueries: [
      "vivir mi vida marc anthony letra",
      "vivir mi vida marc anthony lyric video",
      "vivir mi vida marc anthony karaoke",
      "vivir mi vida marc anthony cover",
    ],
  },
  {
    id: "2",
    name: "Me Gustas Tú",
    artist: "Mano Chao",
    coverColor: "#D4A9A9",
    videoQueries: [
      "me gustas tu mano chao letra",
      "me gustas tu mano chao lyric video",
      "me gustas tu mano chao karaoke",
      "me gustas tu mano chao cover",
    ],
  },
  {
    id: "3",
    name: "Limón y Sal",
    artist: "Julieta Venegas",
    coverColor: "#B5C9A8",
    videoQueries: [
      "limon y sal julieta venegas letra",
      "limon y sal julieta venegas lyric video",
      "limon y sal julieta venegas karaoke",
      "limon y sal julieta venegas cover",
    ],
  },
  {
    id: "4",
    name: "Mejor Que Ayer",
    artist: "Diego Torres",
    coverColor: "#A9BFD4",
    videoQueries: [
      "mejor que ayer diego torres letra",
      "mejor que ayer diego torres lyric video",
      "mejor que ayer diego torres karaoke",
      "mejor que ayer diego torres cover",
    ],
  },
  {
    id: "5",
    name: "Robarte un Beso",
    artist: "Carlos Vives Sebastián Yatra",
    coverColor: "#C9B8D4",
    videoQueries: [
      "robarte un beso carlos vives sebastian yatra letra",
      "robarte un beso lyric video",
      "robarte un beso karaoke",
      "robarte un beso cover",
    ],
  },
  {
    id: "6",
    name: "La Libertad",
    artist: "Álvaro Soler",
    coverColor: "#A8C9C0",
    videoQueries: [
      "la libertad alvaro soler letra",
      "la libertad alvaro soler lyric video",
      "la libertad alvaro soler karaoke",
      "la libertad alvaro soler cover",
    ],
  },
  {
    id: "7",
    name: "Fin de Semana",
    artist: "Sam Vasquez",
    coverColor: "#D4C9A8",
    videoQueries: [
      "fin de semana sam vasquez letra",
      "fin de semana sam vasquez lyric video",
      "fin de semana sam vasquez karaoke",
      "fin de semana cover español",
    ],
  },
  {
    id: "8",
    name: "Despacito",
    artist: "Luis Fonsi",
    coverColor: "#C0A8C9",
    displayName: "Placeholder",
    videoQueries: [
      "despacito luis fonsi letra",
      "despacito luis fonsi lyric video",
      "despacito karaoke",
    ],
  },
  {
    id: "9",
    name: "Bailando",
    artist: "Enrique Iglesias",
    coverColor: "#A8B5C9",
    displayName: "Placeholder",
    videoQueries: [
      "bailando enrique iglesias letra",
      "bailando enrique iglesias lyric video",
      "bailando karaoke español",
    ],
  },
  {
    id: "10",
    name: "La Bicicleta",
    artist: "Carlos Vives Shakira",
    coverColor: "#C9A8A8",
    displayName: "Placeholder",
    videoQueries: [
      "la bicicleta carlos vives shakira letra",
      "la bicicleta lyric video",
      "la bicicleta karaoke",
    ],
  },
];

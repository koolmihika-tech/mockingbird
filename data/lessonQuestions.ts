import type { Question } from "../Supabase/services/questions";

// Static, hand-authored practice questions for the reading/writing pathway's
// topic lessons (independent of songs). No API call — same questions for
// every user. Organized by subcategory (levels.focus_area), then by topic
// (levels.topics), matching the "levels" table in Supabase. Each topic has 4
// questions that step the learner from recognition to free production:
// 1) multiple_choice recall, 2) fill_blank pattern practice,
// 3) short_answer guided production, 4) short_answer free production.

export interface TopicLesson {
  lessonId: string; 
  levelId: string; // levels.level_id — unique per topic row
  topic: string; // levels.topics
  goal: string; // levels.goal (path box label)
  questions: Question[];
}

export interface Subcategory {
  focusArea: string; // levels.focus_area
  levelName: string; // levels.level_name
  topics: TopicLesson[];
}

export const LESSON_SUBCATEGORIES: Subcategory[] = [
  {
    focusArea: "Survival Spanish",
    levelName: "1",
    topics: [
      {
        lessonId: '1',
        levelId: "1fc0959d-fa09-4a24-88eb-5fcf0043b454",
        topic: "Hola, adiós, gracias",
        goal: "Introductions",
        questions: [
          {
            type: "multiple_choice",
            prompt: "Ana dice: «¡Hola! ¿Cómo estás?» ¿Qué significa 'Hola'?",
            targetWord: "hola",
            options: ["Hello", "Goodbye", "Thank you", "Please"],
            answer: "Hello",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: Al despedirte de un amigo, dices: '____, nos vemos mañana.'",
            targetWord: "adiós",
            answer: "Adiós",
          },
          {
            type: "short_answer",
            prompt: "Write one sentence in Spanish thanking someone for a gift, using 'gracias.'",
            targetWord: "gracias",
            answer: "Gracias por el regalo.",
          },
          {
            type: "short_answer",
            prompt:
              "Write a short two-sentence exchange in Spanish: greet someone, then say goodbye, using at least two of: hola, adiós, gracias.",
            targetWord: "hola / adiós / gracias",
            answer: "¡Hola! ¿Cómo estás? Adiós, nos vemos pronto.",
          },
        ],
      },
      {
        lessonId: '2',
        levelId: "ddb968e1-510e-479b-bfcd-59e2aa0ae52d",
        topic: "Subject Pronouns",
        goal: "Greetings",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Nosotros vamos a la fiesta.' ¿A quién se refiere 'nosotros'?",
            targetWord: "nosotros",
            options: ["We", "I", "You", "They"],
            answer: "We",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: '____ soy estudiante.'",
            targetWord: "yo",
            answer: "Yo",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence using 'ella' as the subject.",
            targetWord: "ella",
            answer: "Ella es mi amiga.",
          },
          {
            type: "short_answer",
            prompt: "Introduce yourself and one other person in two sentences, using 'yo' and 'él' or 'ella'.",
            targetWord: "yo / él / ella",
            answer: "Yo soy Carlos. Él es mi amigo Luis.",
          },
        ],
      },
      {
        lessonId: '3',
        levelId: "c221219d-ef77-4e77-90d6-95139a84a3dd",
        topic: "Ser (soy, eres, es)",
        goal: "Basic Courtesy",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Tú eres muy amable.' ¿Qué significa 'eres'?",
            targetWord: "eres",
            options: ["You are", "I am", "He is", "We are"],
            answer: "You are",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Yo ____ de México.'",
            targetWord: "soy",
            answer: "soy",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence using 'es' to describe a friend's personality.",
            targetWord: "es",
            answer: "Ella es simpática.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences describing yourself and one other person, using 'soy' and 'es'.",
            targetWord: "soy / es",
            answer: "Soy amable. Mi hermano es inteligente.",
          },
        ],
      },
      {
        lessonId: '4',
        levelId: "bd1700a1-f4ac-45a8-9559-0563bd120bf7",
        topic: "Numbers 1-20",
        goal: "Numbers",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Tengo quince años.' ¿Qué número es 'quince'?",
            targetWord: "quince",
            options: ["15", "5", "10", "20"],
            answer: "15",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Hay ____ (7) días en una semana.'",
            targetWord: "siete",
            answer: "siete",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence stating your age using a number word (not digits).",
            targetWord: "número",
            answer: "Tengo veinte años.",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence counting three objects you see, using number words.",
            targetWord: "tres / dos",
            answer: "Veo tres libros y dos lápices.",
          },
        ],
      },
    ],
  },
  {
    focusArea: "Personal Information",
    levelName: "2",
    topics: [
      {
        lessonId: '5',
        levelId: "c17a82aa-d203-4d0a-8e5a-d020d8c29ee3",
        topic: "Me llamo, tengo años",
        goal: "Name and Age",
        questions: [
          {
            type: "multiple_choice",
            prompt: "¿Qué significa '¿Cómo te llamas?'?",
            targetWord: "cómo te llamas",
            options: ["What's your name?", "How are you?", "Where are you from?", "How old are you?"],
            answer: "What's your name?",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: '____ Ana.' (My name is Ana)",
            targetWord: "me llamo",
            answer: "Me llamo",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence giving your name using 'me llamo'.",
            targetWord: "me llamo",
            answer: "Me llamo Daniela.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences: state your name and your age using 'me llamo' and 'tengo... años'.",
            targetWord: "me llamo / tengo años",
            answer: "Me llamo Pedro. Tengo catorce años.",
          },
        ],
      },
      {
        lessonId: '6',
        levelId: "b091a0ef-2fa7-4800-aab4-0c79f1afb2c6",
        topic: "Country and nationality vocabulary",
        goal: "Nationality",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Ella es mexicana.' ¿De dónde es ella?",
            targetWord: "mexicana",
            options: ["Mexico", "Spain", "Colombia", "Peru"],
            answer: "Mexico",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Soy de Estados Unidos, soy ____.'",
            targetWord: "estadounidense",
            answer: "estadounidense",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence stating your nationality.",
            targetWord: "nacionalidad",
            answer: "Soy canadiense.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences naming your nationality and one country you'd like to visit.",
            targetWord: "nacionalidad / país",
            answer: "Soy chilena. Quiero visitar España.",
          },
        ],
      },
      {
        lessonId: '7',
        levelId: "93613e0e-fa4f-464b-bfbf-c307a671f9a4",
        topic: "Common jobs and occupations",
        goal: "Profession",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Mi papá es doctor.' ¿Qué hace un doctor?",
            targetWord: "doctor",
            options: ["Heals people", "Teaches students", "Cooks food", "Drives a bus"],
            answer: "Heals people",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Mi mamá trabaja en un hospital; ella es ____.'",
            targetWord: "doctora / enfermera",
            answer: "doctora",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence stating your profession or the job you want.",
            targetWord: "profesión",
            answer: "Quiero ser maestra.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences describing the jobs of two people you know.",
            targetWord: "profesiones",
            answer: "Mi hermano es ingeniero. Mi tía es abogada.",
          },
        ],
      },
      {
        lessonId: '8',
        levelId: "787f1a76-ee0d-44dc-bbca-8c86346255ba",
        topic: "Days and months",
        goal: "Dates",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Mi cumpleaños es en marzo.' ¿Qué es 'marzo'?",
            targetWord: "marzo",
            options: ["A month", "A day", "A season", "A number"],
            answer: "A month",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Hoy es ____ (Monday).'",
            targetWord: "lunes",
            answer: "lunes",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence stating what day of the week it is today.",
            targetWord: "día",
            answer: "Hoy es viernes.",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence stating the month and day of your birthday.",
            targetWord: "fecha",
            answer: "Mi cumpleaños es el diez de julio.",
          },
        ],
      },
    ],
  },
  {
    focusArea: "Everyday Objects",
    levelName: "3",
    topics: [
      {
        lessonId: '9',
        levelId: "43bcf084-c464-4dfe-8aa6-cb4e56863aa5",
        topic: "Common color vocabulary",
        goal: "Colors",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'El cielo es azul.' ¿Qué color es 'azul'?",
            targetWord: "azul",
            options: ["Blue", "Red", "Green", "Yellow"],
            answer: "Blue",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'La manzana es ____ (red).'",
            targetWord: "roja",
            answer: "roja",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence describing the color of your favorite object.",
            targetWord: "color",
            answer: "Mi mochila es verde.",
          },
          {
            type: "short_answer",
            prompt: "Describe two objects and their colors in one or two sentences.",
            targetWord: "colores",
            answer: "Mi carro es negro y mi casa es blanca.",
          },
        ],
      },
      {
        lessonId: '10',
        levelId: "637c5fd2-fb15-4ac6-944f-7551101e9d63",
        topic: "Objects around the house",
        goal: "Household Items",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Duermo en la cama.' ¿Qué es 'la cama'?",
            targetWord: "la cama",
            options: ["The bed", "The table", "The chair", "The door"],
            answer: "The bed",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Como en la ____ (table).'",
            targetWord: "mesa",
            answer: "mesa",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence naming an object in your kitchen.",
            targetWord: "cocina",
            answer: "Hay un refrigerador en la cocina.",
          },
          {
            type: "short_answer",
            prompt: "Describe two items in your bedroom using 'hay'.",
            targetWord: "hay",
            answer: "Hay una cama y una lámpara en mi cuarto.",
          },
        ],
      },
      {
        lessonId: '11',
        levelId: "4a09444a-bdb9-4ca8-9f63-c5ac26747896",
        topic: "School and learning vocabulary",
        goal: "Classroom Items",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Escribo con un lápiz.' ¿Qué es 'un lápiz'?",
            targetWord: "un lápiz",
            options: ["A pencil", "A book", "A backpack", "A desk"],
            answer: "A pencil",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Leo el ____ (book) en clase.'",
            targetWord: "libro",
            answer: "libro",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence naming something in your backpack.",
            targetWord: "mochila",
            answer: "Tengo un cuaderno y una pluma.",
          },
          {
            type: "short_answer",
            prompt: "Describe your classroom using two school items and 'hay'.",
            targetWord: "salón de clases",
            answer: "Hay una pizarra y muchos escritorios.",
          },
        ],
      },
      {
        lessonId: '12',
        levelId: "7daad5b4-63a7-4086-9bc4-2519f4f822ae",
        topic: "Adjective agreement, hay",
        goal: "Descriptions",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Hay dos sillas rojas.' ¿Por qué 'rojas' termina en -as?",
            targetWord: "rojas",
            options: [
              "It agrees with a plural feminine noun",
              "It's a verb form",
              "It agrees with a masculine noun",
              "It's random",
            ],
            answer: "It agrees with a plural feminine noun",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Hay una casa ____ (bonito).'",
            targetWord: "bonita",
            answer: "bonita",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence with 'hay' and a correctly agreeing adjective describing objects in a room.",
            targetWord: "hay + adjetivo",
            answer: "Hay dos ventanas pequeñas.",
          },
          {
            type: "short_answer",
            prompt: "Describe a room with two objects and matching adjectives.",
            targetWord: "concordancia",
            answer: "Hay tres libros interesantes y una mesa vieja.",
          },
        ],
      },
    ],
  },
  {
    focusArea: "Family and Relationships",
    levelName: "4",
    topics: [
      {
        lessonId: '13',
        levelId: "3a0655b5-4a34-44b3-a227-c915c8711877",
        topic: "Parents, siblings, and relatives",
        goal: "Family Members",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Mi abuela es la madre de mi papá.' ¿Quién es 'mi abuela'?",
            targetWord: "abuela",
            options: ["My grandmother", "My aunt", "My cousin", "My sister"],
            answer: "My grandmother",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'El hijo de mis padres es mi ____.'",
            targetWord: "hermano",
            answer: "hermano",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence naming one family member and their relation to you.",
            targetWord: "familia",
            answer: "Mi tía se llama Rosa.",
          },
          {
            type: "short_answer",
            prompt: "Describe your family, naming at least two relatives.",
            targetWord: "familia",
            answer: "Tengo dos hermanos y una hermana. Mi abuelo vive con nosotros.",
          },
        ],
      },
      {
        lessonId: '14',
        levelId: "9cd63d75-0f74-4962-8bf9-e3a7e71ab870",
        topic: "Friends and common relationships",
        goal: "Relationships",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Ella es mi mejor amiga.' ¿Qué significa 'mejor amiga'?",
            targetWord: "mejor amiga",
            options: ["Best friend", "Neighbor", "Cousin", "Teacher"],
            answer: "Best friend",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Mi vecino es un buen ____ (friend).'",
            targetWord: "amigo",
            answer: "amigo",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence describing your relationship with a friend.",
            targetWord: "amistad",
            answer: "Mi amigo Carlos es muy divertido.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences about a friend, naming them and why they matter to you.",
            targetWord: "amistad",
            answer: "Mi amiga Laura es muy leal. Somos amigas desde la escuela primaria.",
          },
        ],
      },
      {
        lessonId: '15',
        levelId: "912d5f15-444d-412c-a808-c5eec6d9af93",
        topic: "Mi, tu, su, nuestro",
        goal: "Possession",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Nuestra casa es grande.' ¿A quién pertenece la casa?",
            targetWord: "nuestra",
            options: ["To us", "To me", "To you", "To them"],
            answer: "To us",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: '____ (your, informal) perro es bonito.'",
            targetWord: "tu",
            answer: "Tu",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence using 'su' to describe someone else's belongings.",
            targetWord: "su",
            answer: "Su carro es nuevo.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences using two different possessive adjectives (mi, tu, su, nuestro).",
            targetWord: "posesivos",
            answer: "Mi mamá y mi papá son mis padres. Nuestra familia es grande.",
          },
        ],
      },
      {
        lessonId: '16',
        levelId: "4996d033-f22f-4269-849e-798ef4dd21ed",
        topic: "Tener, possessives",
        goal: "Having and Describing",
        questions: [
          {
            type: "multiple_choice",
            prompt: "'Ellos tienen un perro.' ¿Qué significa 'tienen'?",
            targetWord: "tienen",
            options: ["They have", "They are", "They want", "They see"],
            answer: "They have",
          },
          {
            type: "fill_blank",
            prompt: "Completa la oración: 'Yo ____ (tener) dos hermanas.'",
            targetWord: "tengo",
            answer: "tengo",
          },
          {
            type: "short_answer",
            prompt: "Write a sentence using 'tener' plus a possessive adjective to describe a family member's belongings.",
            targetWord: "tener + posesivo",
            answer: "Mi hermana tiene su propio cuarto.",
          },
          {
            type: "short_answer",
            prompt: "Write two sentences combining 'tener' and family vocabulary.",
            targetWord: "tener",
            answer: "Tengo tres primos. Mi prima tiene un gato.",
          },
        ],
      },
    ],
  },
];

const LESSON_QUESTIONS_BY_LEVEL_ID: Record<string, Question[]> = Object.fromEntries(
  LESSON_SUBCATEGORIES.flatMap((subcategory) =>
    subcategory.topics.map((topic) => [topic.levelId, topic.questions])
  )
);

const LESSON_ID_BY_LEVEL_ID: Record<string, string> = Object.fromEntries(
  LESSON_SUBCATEGORIES.flatMap((subcategory) =>
    subcategory.topics.map((topic) => [topic.levelId, topic.lessonId])
  )
);

export function getLessonQuestions(levelId: string): Question[] | undefined {
  return LESSON_QUESTIONS_BY_LEVEL_ID[levelId];
}

export function getLessonId(levelId: string): string | undefined {
  return LESSON_ID_BY_LEVEL_ID[levelId];
}

import type { Question } from "../Supabase/services/questions";

// Static, hand-authored practice questions for the lessons pathway's
// topic lessons (independent of songs). No API call — same questions for
// every user. Organized by subcategory (levels.focus_area), then by topic
// (levels.topics), matching the "levels" table in Supabase.
// (The original question set is archived in data/archive/lessonQuestionsV1.ts.)
//
// Each topic has 8 questions — 4 vocab and 4 grammar — interleaved:
// - vocab: a Spanish sentence using a word from the topic, with a
//   multiple-choice question on what the word means.
// - grammar: one conjugation per topic (present tense for levels 1–2,
//   preterite for levels 3–4), taught as a single pattern-recognition
//   question (three example sentences, then conjugate a new verb the same
//   way) followed by three fill-in-the-blank practices of that conjugation.
//   Every sentence shows its English translation underneath (on vocab
//   questions the word's meaning is blanked out until answered).
// Each level ends with an "Irregulars" topic that applies the same structure
// to a family of irregular verbs in that level's tense (present -go and
// e → ie verbs for levels 1–2, u-stem and j-stem preterites for levels 3–4).
// Every question also has an `explanation`, shown after the learner answers.

export type LessonQuestion = Question & { explanation: string };

export interface TopicLesson {
  lessonId: string;
  levelId: string; // levels.level_id — unique per topic row
  topic: string; // levels.topics
  goal: string; // levels.goal (path box label)
  grammarFocus: string; // the conjugation this topic's grammar questions practice
  questions: LessonQuestion[];
}

export interface Subcategory {
  focusArea: string; // levels.focus_area
  levelName: string; // levels.level_name
  topics: TopicLesson[];
}

/** Vocab in context: what does `word` (bolded in `sentence`) mean? The
 *  English `translation` bolds the word's meaning, which stays blanked out
 *  until the learner answers. */
function vocab(
  word: string,
  sentence: string,
  translation: string,
  options: string[],
  answer: string,
  explanation: string
): LessonQuestion {
  return { type: "multiple_choice", prompt: `What does '${word}' mean?`, sentence, translation, targetWord: word, options, answer, category: "vocab", explanation };
}

type Example = [spanish: string, english: string];

/** Pattern recognition: three examples of one conjugation, then the same form
 *  of a new verb in `sentence`. Every Spanish sentence carries its English
 *  translation. */
function pattern(
  hint: string,
  examples: Example[],
  verb: string,
  sentence: string,
  translation: string,
  answer: string,
  explanation: string
): LessonQuestion {
  return {
    type: "fill_blank",
    prompt: `${hint} Conjugate '${verb}' the same way.`,
    examples: examples.map(([text, english]) => ({ text, translation: english })),
    sentence,
    translation,
    targetWord: answer,
    answer,
    category: "grammar",
    accentSensitive: true,
    explanation,
  };
}

/** Fill in the blank with the conjugated form of the verb given in parentheses. */
function conjugate(sentence: string, translation: string, answer: string, explanation: string): LessonQuestion {
  return {
    type: "fill_blank",
    prompt: "Fill in the blank with the right form of the verb in parentheses.",
    sentence,
    translation,
    targetWord: answer,
    answer,
    category: "grammar",
    accentSensitive: true,
    explanation,
  };
}

export const LESSON_SUBCATEGORIES: Subcategory[] = [
  {
    focusArea: "Survival Spanish",
    levelName: "1",
    topics: [
      {
        lessonId: "1",
        levelId: "1fc0959d-fa09-4a24-88eb-5fcf0043b454",
        topic: "Hola, adiós, gracias",
        goal: "Introductions",
        grammarFocus: "Present tense · -ar verbs · yo",
        questions: [
          vocab("hola", "¡**Hola**! Me llamo Ana.", "**Hello**! My name is Ana.", ["Hello", "Goodbye", "Thank you", "Please"], "Hello",
            "'Hola' means hello and works any time of day, formal or casual."),
          pattern(
            "These all use the yo form of an -ar verb.",
            [
              ["Yo **hablo** español.", "I speak Spanish."],
              ["Yo **saludo** a mi vecino.", "I greet my neighbor."],
              ["Yo **estudio** en casa.", "I study at home."],
            ],
            "cantar",
            "Yo ____ en la ducha.",
            "I sing in the shower.",
            "canto",
            "Regular -ar verbs in the present: drop -ar and add -o for yo. hablar → hablo, cantar → canto."),
          conjugate("Yo ____ (trabajar) en una tienda.", "I work in a store.", "trabajo",
            "trabajar → trabaj- + -o = trabajo (I work)."),
          vocab("adiós", "**Adiós**, nos vemos mañana.", "**Goodbye**, see you tomorrow.", ["Hello", "Please", "Goodbye", "Sorry"], "Goodbye",
            "'Adiós' means goodbye. 'Nos vemos mañana' means see you tomorrow."),
          conjugate("Yo ____ (necesitar) un café, por favor.", "I need a coffee, please.", "necesito",
            "necesitar → necesit- + -o = necesito (I need)."),
          vocab("gracias", "Muchas **gracias** por la ayuda.", "**Thank you** so much for the help.", ["You're welcome", "Thank you", "Excuse me", "Good night"], "Thank you",
            "'Gracias' means thank you; 'muchas gracias' is thank you very much. The reply is 'de nada' (you're welcome)."),
          conjugate("Yo ____ (llegar) a la escuela temprano.", "I get to school early.", "llego",
            "llegar → lleg- + -o = llego (I arrive)."),
          vocab("por favor", "Un vaso de agua, **por favor**.", "A glass of water, **please**.", ["Thank you", "Goodbye", "Hello", "Please"], "Please",
            "'Por favor' means please. It can go at the start or the end of a request."),
        ],
      },
      {
        lessonId: "2",
        levelId: "ddb968e1-510e-479b-bfcd-59e2aa0ae52d",
        topic: "Subject Pronouns",
        goal: "Greetings",
        grammarFocus: "Present tense · -ar verbs · tú",
        questions: [
          vocab("buenos días", "**Buenos días**, señora López.", "**Good morning**, Mrs. López.", ["Good morning", "Good night", "See you later", "How are you?"], "Good morning",
            "'Buenos días' is good morning. Later in the day you say 'buenas tardes' (afternoon) and 'buenas noches' (evening/night)."),
          pattern(
            "These all use the tú form of an -ar verb.",
            [
              ["Tú **hablas** muy bien.", "You speak very well."],
              ["Tú **escuchas** música.", "You listen to music."],
              ["Tú **caminas** al parque.", "You walk to the park."],
            ],
            "bailar",
            "Tú ____ salsa los sábados.",
            "You dance salsa on Saturdays.",
            "bailas",
            "Regular -ar verbs in the present: drop -ar and add -as for tú. hablar → hablas, bailar → bailas."),
          conjugate("¿Tú ____ (estudiar) inglés?", "Do you study English?", "estudias",
            "estudiar → estudi- + -as = estudias (you study)."),
          vocab("qué tal", "¡Hola, Marta! ¿**Qué tal**?", "Hi, Marta! **How's it going?**", ["What time is it?", "How's it going?", "Where are you?", "What's your name?"], "How's it going?",
            "'¿Qué tal?' is a casual 'How's it going?' or 'How are you?'. A common answer is 'Bien, gracias.'"),
          conjugate("Tú ____ (llamar) a tu mamá todos los días.", "You call your mom every day.", "llamas",
            "llamar → llam- + -as = llamas (you call)."),
          vocab("nosotros", "**Nosotros** estudiamos juntos.", "**We** study together.", ["They", "You all", "We", "I"], "We",
            "'Nosotros' means we ('nosotras' if the group is all female). 'Ellos' is they and 'ustedes' is you all."),
          conjugate("¿Tú ____ (trabajar) hoy?", "Are you working today?", "trabajas",
            "trabajar → trabaj- + -as = trabajas (you work)."),
          vocab("ella", "**Ella** se llama Sofía.", "**She** is called Sofía.", ["She", "He", "You", "They"], "She",
            "'Ella' means she and 'él' (with an accent) means he. Without the accent, 'el' is the word 'the'."),
        ],
      },
      {
        lessonId: "3",
        levelId: "c221219d-ef77-4e77-90d6-95139a84a3dd",
        topic: "Ser (soy, eres, es)",
        goal: "Basic Courtesy",
        grammarFocus: "Present tense · -ar verbs · él / ella / usted",
        questions: [
          vocab("perdón", "**Perdón**, ¿es usted la profesora?", "**Excuse me**, are you the teacher?", ["Thank you", "Excuse me", "Welcome", "Goodbye"], "Excuse me",
            "'Perdón' is excuse me or pardon — to get someone's attention or apologize for a small slip."),
          pattern(
            "These all use the él/ella/usted form of an -ar verb.",
            [
              ["Ella **habla** con el profesor.", "She talks with the teacher."],
              ["Él **saluda** a todos.", "He greets everyone."],
              ["Usted **trabaja** mucho.", "You (formal) work a lot."],
            ],
            "escuchar",
            "Él ____ con atención.",
            "He listens carefully.",
            "escucha",
            "Regular -ar verbs in the present: drop -ar and add -a for él, ella and usted. hablar → habla, escuchar → escucha."),
          conjugate("Mi amiga ____ (ayudar) a su vecina.", "My friend helps her neighbor.", "ayuda",
            "'Mi amiga' is ella, so ayudar → ayud- + -a = ayuda (she helps)."),
          vocab("de nada", "—Gracias por todo. —**De nada**.", "—Thanks for everything. —**You're welcome**.", ["I'm sorry", "No thanks", "You're welcome", "Of course"], "You're welcome",
            "'De nada' (literally 'of nothing') is the usual reply to 'gracias'."),
          conjugate("¿Usted ____ (necesitar) ayuda?", "Do you (formal) need help?", "necesita",
            "Usted uses the same form as él/ella: necesitar → necesit- + -a = necesita."),
          vocab("lo siento", "**Lo siento**, llego tarde.", "**I'm sorry**, I'm late.", ["I'm sorry", "Excuse me", "Nice to meet you", "Thank you"], "I'm sorry",
            "'Lo siento' means I'm sorry — a real apology. For bumping past someone, 'perdón' or 'con permiso' is more common."),
          conjugate("El señor García ____ (preguntar) con cortesía.", "Mr. García asks politely.", "pregunta",
            "'El señor García' is él, so preguntar → pregunt- + -a = pregunta (he asks)."),
          vocab("mucho gusto", "**Mucho gusto**, soy Daniel.", "**Nice to meet you**, I'm Daniel.", ["Good luck", "Welcome", "See you soon", "Nice to meet you"], "Nice to meet you",
            "'Mucho gusto' (literally 'much pleasure') is what you say when meeting someone. 'Encantado/a' means the same."),
        ],
      },
      {
        lessonId: "4",
        levelId: "bd1700a1-f4ac-45a8-9559-0563bd120bf7",
        topic: "Numbers 1-20",
        goal: "Numbers",
        grammarFocus: "Present tense · -ar verbs · nosotros",
        questions: [
          vocab("cinco", "Tengo **cinco** primos.", "I have **five** cousins.", ["Fifteen", "Five", "Four", "Fifty"], "Five",
            "'Cinco' is 5. Don't mix it up with 'quince' (15) or 'cincuenta' (50)."),
          pattern(
            "These all use the nosotros form of an -ar verb.",
            [
              ["Nosotros **contamos** hasta diez.", "We count to ten."],
              ["Nosotros **compramos** dos libros.", "We buy two books."],
              ["Nosotros **cantamos** juntos.", "We sing together."],
            ],
            "tomar",
            "Nosotros ____ tres cafés.",
            "We drink three coffees.",
            "tomamos",
            "Regular -ar verbs in the present: drop -ar and add -amos for nosotros. contar → contamos, tomar → tomamos."),
          conjugate("Nosotros ____ (estudiar) doce palabras nuevas.", "We study twelve new words.", "estudiamos",
            "estudiar → estudi- + -amos = estudiamos (we study)."),
          vocab("doce", "Hay **doce** meses en un año.", "There are **twelve** months in a year.", ["Two", "Twenty", "Twelve", "Eleven"], "Twelve",
            "'Doce' is 12. 'Dos' is 2, 'once' is 11 and 'veinte' is 20."),
          conjugate("Mi hermano y yo ____ (pagar) quince dólares.", "My brother and I pay fifteen dollars.", "pagamos",
            "'Mi hermano y yo' (my brother and I) is nosotros, so pagar → pag- + -amos = pagamos."),
          vocab("diecisiete", "Mi prima tiene **diecisiete** años.", "My cousin is **seventeen** years old.", ["Seventeen", "Seventy", "Sixteen", "Seven"], "Seventeen",
            "'Diecisiete' is 17 — literally 'ten and seven' (diez y siete) written as one word."),
          conjugate("Nosotros ____ (llegar) a las ocho.", "We arrive at eight.", "llegamos",
            "llegar → lleg- + -amos = llegamos (we arrive)."),
          vocab("veinte", "La clase tiene **veinte** estudiantes.", "The class has **twenty** students.", ["Twelve", "Two", "Thirty", "Twenty"], "Twenty",
            "'Veinte' is 20. 'Treinta' is 30."),
        ],
      },
      {
        lessonId: "17",
        levelId: "8a97129b-72cf-4a8c-b34a-91900c21e6fc",
        topic: "Irregular verbs: soy, voy, tengo, hago",
        goal: "Irregulars",
        grammarFocus: "Present tense · irregular yo forms (-go verbs)",
        questions: [
          vocab("soy", "**Soy** estudiante.", "**I am** a student.", ["I have", "I am", "I go", "I give"], "I am",
            "'Soy' is the yo form of ser (to be): soy, eres, es, somos, son. Use ser for who or what you are: a name, a job, where you're from."),
          pattern(
            "These verbs all add a g in the yo form.",
            [
              ["Yo **tengo** un perro.", "I have a dog."],
              ["Yo **pongo** la mesa.", "I set the table."],
              ["Yo **salgo** a las ocho.", "I leave at eight."],
            ],
            "hacer",
            "Yo ____ la tarea.",
            "I do my homework.",
            "hago",
            "Some common verbs end in -go in the yo form only: tener → tengo, poner → pongo, salir → salgo, hacer → hago. The other forms stay close to regular (haces, hace, hacemos)."),
          conjugate("Yo ____ (traer) el almuerzo.", "I bring lunch.", "traigo",
            "traer adds -ig- in the yo form: traigo. Everywhere else it's regular: traes, trae, traemos."),
          vocab("estoy", "**Estoy** muy cansado hoy.", "**I am** very tired today.", ["I am", "I have", "I want", "I go"], "I am",
            "'Estoy' is the yo form of estar (also 'to be'). Use estar for how you feel and where you are: estoy cansado, estoy en casa. Like voy and doy, it ends in -oy."),
          conjugate("Yo ____ (decir) la verdad.", "I tell the truth.", "digo",
            "decir is a -go verb that also changes e to i: digo. Its other forms keep the i: dices, dice, dicen (but decimos)."),
          vocab("voy", "**Voy** a la playa con mis amigos.", "**I go** to the beach with my friends.", ["I come", "I leave", "I go", "I give"], "I go",
            "'Voy' is the yo form of ir (to go): voy, vas, va, vamos, van. 'Voy a' + a verb also means 'I'm going to': voy a comer."),
          conjugate("Yo ____ (venir) a la escuela en autobús.", "I come to school by bus.", "vengo",
            "venir is a -go verb: vengo. The other forms change e to ie: vienes, viene, vienen (but venimos)."),
          vocab("doy", "Le **doy** un regalo a mi mamá.", "**I give** my mom a present.", ["I give", "I say", "I bring", "I put"], "I give",
            "'Doy' is the yo form of dar (to give). Like soy, estoy and voy, its yo form ends in -oy."),
        ],
      },
    ],
  },
  {
    focusArea: "Personal Information",
    levelName: "2",
    topics: [
      {
        lessonId: "5",
        levelId: "c17a82aa-d203-4d0a-8e5a-d020d8c29ee3",
        topic: "Me llamo, tengo años",
        goal: "Name and Age",
        grammarFocus: "Present tense · -er verbs · tú",
        questions: [
          vocab("me llamo", "**Me llamo** Lucía.", "**My name is** Lucía.", ["My name is", "I live in", "I am from", "I like"], "My name is",
            "'Me llamo' (literally 'I call myself') is how you say your name. To ask someone's: '¿Cómo te llamas?'"),
          pattern(
            "These all use the tú form of an -er verb.",
            [
              ["Tú **comes** pizza.", "You eat pizza."],
              ["Tú **lees** un libro.", "You read a book."],
              ["Tú **bebes** agua.", "You drink water."],
            ],
            "aprender",
            "Tú ____ español.",
            "You learn Spanish.",
            "aprendes",
            "Regular -er verbs in the present: drop -er and add -es for tú. comer → comes, aprender → aprendes."),
          conjugate("¿Tú ____ (comprender) la pregunta?", "Do you understand the question?", "comprendes",
            "comprender → comprend- + -es = comprendes (you understand)."),
          vocab("años", "Tengo quince **años**.", "I am fifteen **years** old.", ["Months", "Years", "Days", "Names"], "Years",
            "Spanish gives age with tener: 'Tengo quince años' is literally 'I have fifteen years'. Keep the ñ — 'anos' is a very different word!"),
          conjugate("Tú ____ (correr) en el parque.", "You run in the park.", "corres",
            "correr → corr- + -es = corres (you run)."),
          vocab("cumpleaños", "Mi **cumpleaños** es en mayo.", "My **birthday** is in May.", ["Party", "Birthday", "Age", "Name"], "Birthday",
            "'Cumpleaños' (cumplir + años, 'completing years') means birthday. It ends in -s even when singular."),
          conjugate("Tú ____ (vender) libros viejos.", "You sell old books.", "vendes",
            "vender → vend- + -es = vendes (you sell)."),
          vocab("apellido", "Mi **apellido** es Romero.", "My **last name** is Romero.", ["First name", "Nickname", "Last name", "Address"], "Last name",
            "'Apellido' is a last name or surname; 'nombre' is a first name. Many Spanish speakers use two apellidos."),
        ],
      },
      {
        lessonId: "6",
        levelId: "b091a0ef-2fa7-4800-aab4-0c79f1afb2c6",
        topic: "Country and nationality vocabulary",
        goal: "Nationality",
        grammarFocus: "Present tense · -ir verbs · él / ella / usted",
        questions: [
          vocab("mexicano", "Carlos es **mexicano**.", "Carlos is **Mexican**.", ["Spanish", "Mexican", "American", "Colombian"], "Mexican",
            "'Mexicano' is Mexican. Nationalities aren't capitalized in Spanish, and they change for gender: Carlos es mexicano, Ana es mexicana."),
          pattern(
            "These all use the él/ella form of an -ir verb.",
            [
              ["Ella **vive** en Madrid.", "She lives in Madrid."],
              ["Él **escribe** en inglés.", "He writes in English."],
              ["Mi amigo **abre** la puerta.", "My friend opens the door."],
            ],
            "recibir",
            "Ella ____ cartas de Perú.",
            "She gets letters from Peru.",
            "recibe",
            "Regular -ir verbs in the present: drop -ir and add -e for él, ella and usted. vivir → vive, recibir → recibe."),
          conjugate("Mi profesor ____ (vivir) en Argentina.", "My teacher lives in Argentina.", "vive",
            "'Mi profesor' is él, so vivir → viv- + -e = vive (he lives)."),
          vocab("país", "Mi abuela es de un **país** pequeño.", "My grandmother is from a small **country**.", ["City", "Language", "Country", "Flag"], "Country",
            "'País' means country. 'Ciudad' is city and 'idioma' is language."),
          conjugate("Sofía ____ (escribir) en español y en francés.", "Sofía writes in Spanish and in French.", "escribe",
            "'Sofía' is ella, so escribir → escrib- + -e = escribe (she writes)."),
          vocab("idioma", "El **idioma** de Brasil es el portugués.", "The **language** of Brazil is Portuguese.", ["Language", "Country", "Flag", "Capital"], "Language",
            "'Idioma' means language. It ends in -a but is masculine: el idioma."),
          conjugate("Mi vecino ____ (compartir) comida colombiana.", "My neighbor shares Colombian food.", "comparte",
            "'Mi vecino' is él, so compartir → compart- + -e = comparte (he shares)."),
          vocab("española", "Ana es **española**.", "Ana is **Spanish**.", ["Mexican", "English", "Portuguese", "Spanish"], "Spanish",
            "'Española' is Spanish (from Spain), in the feminine form because Ana is a woman. A man is 'español'."),
        ],
      },
      {
        lessonId: "7",
        levelId: "93613e0e-fa4f-464b-bfbf-c307a671f9a4",
        topic: "Common jobs and occupations",
        goal: "Profession",
        grammarFocus: "Present tense · -ar verbs · ellos / ellas / ustedes",
        questions: [
          vocab("médico", "El **médico** trabaja en el hospital.", "The **doctor** works at the hospital.", ["Doctor", "Teacher", "Lawyer", "Cook"], "Doctor",
            "'Médico' (or 'doctor') is a doctor; a woman is 'médica'."),
          pattern(
            "These all use the ellos/ellas form of an -ar verb.",
            [
              ["Ellos **trabajan** en una oficina.", "They work in an office."],
              ["Ellas **enseñan** matemáticas.", "They teach math."],
              ["Los cocineros **preparan** la cena.", "The cooks make dinner."],
            ],
            "manejar",
            "Los taxistas ____ todo el día.",
            "The taxi drivers drive all day.",
            "manejan",
            "Regular -ar verbs in the present: drop -ar and add -an for ellos, ellas and ustedes. trabajar → trabajan, manejar → manejan."),
          conjugate("Las enfermeras ____ (ayudar) a los pacientes.", "The nurses help the patients.", "ayudan",
            "'Las enfermeras' is ellas, so ayudar → ayud- + -an = ayudan (they help)."),
          vocab("maestra", "La **maestra** enseña a los niños.", "The **teacher** teaches the children.", ["Nurse", "Student", "Teacher", "Boss"], "Teacher",
            "'Maestra' (a woman) or 'maestro' (a man) is a teacher, especially in a primary school. 'Profesor/a' is also used."),
          conjugate("Mis padres ____ (trabajar) en un banco.", "My parents work at a bank.", "trabajan",
            "'Mis padres' is ellos, so trabajar → trabaj- + -an = trabajan (they work)."),
          vocab("abogado", "Mi tío es **abogado**.", "My uncle is a **lawyer**.", ["Mechanic", "Lawyer", "Farmer", "Dentist"], "Lawyer",
            "'Abogado' is a lawyer. Note there's no 'un': with jobs after ser, Spanish usually drops the article (Es abogado)."),
          conjugate("Ellos ____ (cocinar) en un restaurante.", "They cook in a restaurant.", "cocinan",
            "cocinar → cocin- + -an = cocinan (they cook)."),
          vocab("enfermera", "La **enfermera** cuida a los pacientes.", "The **nurse** takes care of the patients.", ["Waitress", "Engineer", "Firefighter", "Nurse"], "Nurse",
            "'Enfermera' (a woman) or 'enfermero' (a man) is a nurse — someone who cares for the 'enfermos' (sick)."),
        ],
      },
      {
        lessonId: "8",
        levelId: "787f1a76-ee0d-44dc-bbca-8c86346255ba",
        topic: "Days and months",
        goal: "Dates",
        grammarFocus: "Present tense · -ir verbs · nosotros",
        questions: [
          vocab("lunes", "Hoy es **lunes**.", "Today is **Monday**.", ["Monday", "Tuesday", "Sunday", "Friday"], "Monday",
            "'Lunes' is Monday. Days of the week aren't capitalized in Spanish, and the week starts on lunes."),
          pattern(
            "These all use the nosotros form of an -ir verb.",
            [
              ["Nosotros **vivimos** cerca.", "We live nearby."],
              ["Nosotros **escribimos** la fecha.", "We write the date."],
              ["Nosotros **abrimos** la tienda el sábado.", "We open the store on Saturday."],
            ],
            "decidir",
            "Nosotros ____ la fecha de la fiesta.",
            "We decide the date of the party.",
            "decidimos",
            "Regular -ir verbs in the present: drop -ir and add -imos for nosotros. vivir → vivimos, decidir → decidimos."),
          conjugate("Nosotros ____ (escribir) en el calendario cada domingo.", "We write on the calendar every Sunday.", "escribimos",
            "escribir → escrib- + -imos = escribimos (we write)."),
          vocab("enero", "Mi cumpleaños es en **enero**.", "My birthday is in **January**.", ["June", "January", "July", "March"], "January",
            "'Enero' is January. Like days, months aren't capitalized in Spanish."),
          conjugate("Mi familia y yo ____ (vivir) en la misma casa.", "My family and I live in the same house.", "vivimos",
            "'Mi familia y yo' is nosotros, so vivir → viv- + -imos = vivimos (we live)."),
          vocab("miércoles", "Tenemos clase el **miércoles**.", "We have class on **Wednesday**.", ["Thursday", "Monday", "Wednesday", "Saturday"], "Wednesday",
            "'Miércoles' is Wednesday. 'El miércoles' means on Wednesday — no word for 'on' needed."),
          conjugate("Nosotros ____ (recibir) regalos en diciembre.", "We get presents in December.", "recibimos",
            "recibir → recib- + -imos = recibimos (we receive)."),
          vocab("agosto", "Vamos a la playa en **agosto**.", "We go to the beach in **August**.", ["April", "October", "Autumn", "August"], "August",
            "'Agosto' is August. 'Abril' is April and 'octubre' is October."),
        ],
      },
      {
        lessonId: "18",
        levelId: "10bbf11d-e65f-43f3-a0b4-65a204f7953e",
        topic: "Stem-changing verbs: quiero, puedo, duermo",
        goal: "Irregulars",
        grammarFocus: "Present tense · stem-changing verbs (e → ie)",
        questions: [
          vocab("quiero", "**Quiero** un helado de chocolate.", "**I want** a chocolate ice cream.", ["I want", "I can", "I eat", "I order"], "I want",
            "'Quiero' is the yo form of querer (to want). Its stem changes e → ie: quiero, quieres, quiere, queremos."),
          pattern(
            "In these verbs the e in the stem becomes ie.",
            [
              ["Yo **quiero** un café.", "I want a coffee."],
              ["Tú **piensas** mucho.", "You think a lot."],
              ["Ella **prefiere** el té.", "She prefers tea."],
            ],
            "empezar",
            "La clase ____ a las nueve.",
            "Class starts at nine.",
            "empieza",
            "e → ie verbs change the stem's e to ie, then take regular endings: empezar → empieza. The change skips nosotros: empezamos."),
          conjugate("Mis padres ____ (querer) un coche nuevo.", "My parents want a new car.", "quieren",
            "'Mis padres' is ellos: querer → quier- + -en = quieren."),
          vocab("puedo", "¿**Puedo** ir al baño?", "**Can I** go to the bathroom?", ["Do I have to", "Can I", "Should I", "Do I want to"], "Can I",
            "'Puedo' is the yo form of poder (can, to be able to). Its stem changes o → ue: puedo, puedes, puede, podemos."),
          conjugate("¿Tú ____ (entender) la pregunta?", "Do you understand the question?", "entiendes",
            "entender is an e → ie verb: entiend- + -es = entiendes."),
          vocab("duermo", "**Duermo** ocho horas cada noche.", "**I sleep** eight hours every night.", ["I sleep", "I eat", "I work", "I dream"], "I sleep",
            "'Duermo' is the yo form of dormir (to sleep), an o → ue verb: duermo, duermes, duerme, dormimos."),
          conjugate("Yo ____ (cerrar) la puerta.", "I close the door.", "cierro",
            "cerrar is an e → ie verb: cierr- + -o = cierro."),
          vocab("pido", "Siempre **pido** tacos en este restaurante.", "**I** always **order** tacos at this restaurant.", ["I cook", "I pay for", "I order", "I share"], "I order",
            "'Pido' is the yo form of pedir (to ask for, to order), an e → i verb: pido, pides, pide, pedimos."),
        ],
      },
    ],
  },
  {
    focusArea: "Everyday Objects",
    levelName: "3",
    topics: [
      {
        lessonId: "9",
        levelId: "43bcf084-c464-4dfe-8aa6-cb4e56863aa5",
        topic: "Common color vocabulary",
        goal: "Colors",
        grammarFocus: "Past tense (preterite) · -ar verbs · yo",
        questions: [
          vocab("roja", "Compré una camisa **roja**.", "I bought a **red** shirt.", ["Red", "Blue", "Pink", "Brown"], "Red",
            "'Rojo/roja' is red. Colors come after the noun and match it: una camisa roja, un coche rojo."),
          pattern(
            "These all use the past-tense yo form of an -ar verb.",
            [
              ["Ayer yo **pinté** la puerta.", "Yesterday I painted the door."],
              ["Ayer yo **compré** un vestido azul.", "Yesterday I bought a blue dress."],
              ["Ayer yo **miré** el cielo gris.", "Yesterday I looked at the gray sky."],
            ],
            "usar",
            "Ayer yo ____ mi suéter verde.",
            "Yesterday I wore my green sweater.",
            "usé",
            "Preterite -ar verbs: drop -ar and add -é for yo. pintar → pinté, usar → usé. The accent matters — 'uso' is present (I use), 'usé' is past (I used)."),
          conjugate("El sábado yo ____ (pintar) mi cuarto de amarillo.", "On Saturday I painted my room yellow.", "pinté",
            "pintar → pint- + -é = pinté (I painted). Without the accent, 'pinte' is a different form."),
          vocab("azul", "El cielo está muy **azul** hoy.", "The sky is very **blue** today.", ["Gray", "Green", "Blue", "White"], "Blue",
            "'Azul' is blue. Colors ending in -l or -e (azul, verde) are the same for masculine and feminine."),
          conjugate("Anoche yo ____ (dibujar) un árbol verde.", "Last night I drew a green tree.", "dibujé",
            "dibujar → dibuj- + -é = dibujé (I drew)."),
          vocab("amarillo", "Me gusta el color **amarillo**.", "I like the color **yellow**.", ["Yellow", "Orange", "Purple", "Black"], "Yellow",
            "'Amarillo' is yellow. 'Anaranjado' is orange and 'morado' is purple."),
          conjugate("La semana pasada yo ____ (comprar) zapatos negros.", "Last week I bought black shoes.", "compré",
            "comprar → compr- + -é = compré (I bought)."),
          vocab("verdes", "Las hojas son **verdes**.", "The leaves are **green**.", ["Red", "Green", "Brown", "White"], "Green",
            "'Verde' is green; here it's plural (verdes) to match 'las hojas' (the leaves)."),
        ],
      },
      {
        lessonId: "10",
        levelId: "637c5fd2-fb15-4ac6-944f-7551101e9d63",
        topic: "Objects around the house",
        goal: "Household Items",
        grammarFocus: "Past tense (preterite) · -ar verbs · él / ella / usted",
        questions: [
          vocab("cocina", "Mi papá limpió la **cocina**.", "My dad cleaned the **kitchen**.", ["Bathroom", "Kitchen", "Bedroom", "Garage"], "Kitchen",
            "'Cocina' is the kitchen (and also the stove). The verb 'cocinar' means to cook."),
          pattern(
            "These all use the past-tense él/ella form of an -ar verb.",
            [
              ["Ayer mi mamá **lavó** los platos.", "Yesterday my mom washed the dishes."],
              ["Ayer mi hermano **limpió** el baño.", "Yesterday my brother cleaned the bathroom."],
              ["Ayer la abuela **cocinó** la cena.", "Yesterday Grandma cooked dinner."],
            ],
            "arreglar",
            "Ayer mi tío ____ la lámpara.",
            "Yesterday my uncle fixed the lamp.",
            "arregló",
            "Preterite -ar verbs: drop -ar and add -ó for él, ella and usted. lavar → lavó, arreglar → arregló. Without the accent, 'arreglo' means I fix (present)."),
          conjugate("Anoche mi hermana ____ (preparar) la mesa.", "Last night my sister set the table.", "preparó",
            "'Mi hermana' is ella, so preparar → prepar- + -ó = preparó (she prepared)."),
          vocab("sofá", "El gato duerme en el **sofá**.", "The cat sleeps on the **couch**.", ["Bed", "Chair", "Couch", "Rug"], "Couch",
            "'Sofá' is a couch or sofa. It ends in -á but is masculine: el sofá."),
          conjugate("Esta mañana mi papá ____ (lavar) las ventanas.", "This morning my dad washed the windows.", "lavó",
            "'Mi papá' is él, so lavar → lav- + -ó = lavó (he washed)."),
          vocab("cama", "Hay una **cama** grande en mi cuarto.", "There is a big **bed** in my room.", ["Bed", "Table", "Closet", "Mirror"], "Bed",
            "'Cama' is bed. 'Hacer la cama' means to make the bed."),
          conjugate("El lunes Pedro ____ (sacar) la basura.", "On Monday Pedro took out the trash.", "sacó",
            "'Pedro' is él, so sacar → sac- + -ó = sacó (he took out)."),
          vocab("mesa", "Los libros están en la **mesa**.", "The books are on the **table**.", ["Shelf", "Floor", "Door", "Table"], "Table",
            "'Mesa' is table. 'Poner la mesa' means to set the table."),
        ],
      },
      {
        lessonId: "11",
        levelId: "4a09444a-bdb9-4ca8-9f63-c5ac26747896",
        topic: "School and learning vocabulary",
        goal: "Classroom Items",
        grammarFocus: "Past tense (preterite) · -er / -ir verbs · yo",
        questions: [
          vocab("lápiz", "Necesito un **lápiz** para el examen.", "I need a **pencil** for the test.", ["Pen", "Pencil", "Eraser", "Notebook"], "Pencil",
            "'Lápiz' is pencil; the plural is 'lápices'. A pen is 'bolígrafo' or 'pluma'."),
          pattern(
            "These all use the past-tense yo form of an -er or -ir verb.",
            [
              ["Ayer yo **aprendí** diez palabras.", "Yesterday I learned ten words."],
              ["Ayer yo **escribí** un ensayo.", "Yesterday I wrote an essay."],
              ["Ayer yo **comí** en la cafetería.", "Yesterday I ate in the cafeteria."],
            ],
            "abrir",
            "Ayer yo ____ mi libro de historia.",
            "Yesterday I opened my history book.",
            "abrí",
            "Preterite -er and -ir verbs share endings: drop -er/-ir and add -í for yo. aprender → aprendí, abrir → abrí."),
          conjugate("El lunes yo ____ (escribir) la tarea en mi cuaderno.", "On Monday I wrote my homework in my notebook.", "escribí",
            "escribir → escrib- + -í = escribí (I wrote)."),
          vocab("cuaderno", "Escribo las respuestas en mi **cuaderno**.", "I write the answers in my **notebook**.", ["Backpack", "Desk", "Notebook", "Book"], "Notebook",
            "'Cuaderno' is a notebook. A book is 'libro'."),
          conjugate("Ayer yo ____ (comprender) la lección.", "Yesterday I understood the lesson.", "comprendí",
            "comprender → comprend- + -í = comprendí (I understood)."),
          vocab("pizarra", "La profesora escribe en la **pizarra**.", "The teacher writes on the **board**.", ["Board", "Screen", "Wall", "Window"], "Board",
            "'Pizarra' is the board at the front of a classroom (chalkboard or whiteboard)."),
          conjugate("Esta mañana yo ____ (perder) mi borrador.", "This morning I lost my eraser.", "perdí",
            "perder → perd- + -í = perdí (I lost). 'Borrador' is an eraser."),
          vocab("mochila", "Mis libros están en la **mochila**.", "My books are in the **backpack**.", ["Locker", "Desk", "Bookshelf", "Backpack"], "Backpack",
            "'Mochila' is a backpack."),
        ],
      },
      {
        lessonId: "12",
        levelId: "7daad5b4-63a7-4086-9bc4-2519f4f822ae",
        topic: "Adjective agreement, hay",
        goal: "Descriptions",
        grammarFocus: "Past tense (preterite) · -er / -ir verbs · él / ella / usted",
        questions: [
          vocab("grande", "Hay una casa **grande** en mi calle.", "There is a **big** house on my street.", ["Big", "Small", "Old", "Pretty"], "Big",
            "'Grande' is big. Adjectives ending in -e don't change for gender: una casa grande, un perro grande."),
          pattern(
            "These all use the past-tense él/ella form of an -er or -ir verb.",
            [
              ["Mi abuelo **vivió** en una casa vieja.", "My grandfather lived in an old house."],
              ["Ella **escribió** una carta bonita.", "She wrote a lovely letter."],
              ["El niño **comió** una manzana roja.", "The boy ate a red apple."],
            ],
            "recibir",
            "Ayer ella ____ un regalo pequeño.",
            "Yesterday she got a small present.",
            "recibió",
            "Preterite -er and -ir verbs: drop -er/-ir and add -ió for él, ella and usted. vivir → vivió, recibir → recibió."),
          conjugate("Mi hermana ____ (escribir) un cuento divertido.", "My sister wrote a funny story.", "escribió",
            "'Mi hermana' is ella, so escribir → escrib- + -ió = escribió (she wrote)."),
          vocab("pequeño", "Mi perro es muy **pequeño**.", "My dog is very **small**.", ["Tall", "Small", "Fast", "Old"], "Small",
            "'Pequeño' is small. For a feminine noun it becomes 'pequeña': una casa pequeña."),
          conjugate("El año pasado mi tío ____ (vender) su coche viejo.", "Last year my uncle sold his old car.", "vendió",
            "'Mi tío' is él, so vender → vend- + -ió = vendió (he sold)."),
          vocab("bonita", "Es una ciudad muy **bonita**.", "It's a very **pretty** city.", ["Ugly", "Quiet", "Pretty", "Large"], "Pretty",
            "'Bonita' is pretty; it ends in -a to match 'la ciudad'. For a masculine noun: un pueblo bonito."),
          conjugate("Anoche Marta ____ (abrir) una botella de agua fría.", "Last night Marta opened a bottle of cold water.", "abrió",
            "'Marta' is ella, so abrir → abr- + -ió = abrió (she opened)."),
          vocab("hay", "**Hay** tres sillas en la sala.", "**There are** three chairs in the living room.", ["They have", "It is", "There are", "There was"], "There are",
            "'Hay' means there is or there are — the same word for singular and plural: hay una silla, hay tres sillas."),
        ],
      },
      {
        lessonId: "19",
        levelId: "f8b8a408-be32-4b3c-820f-304d8a1840b0",
        topic: "Irregular preterite: fui, tuve, hice",
        goal: "Irregulars",
        grammarFocus: "Past tense (preterite) · u-stem irregulars",
        questions: [
          vocab("fui", "Ayer **fui** al cine con mi hermana.", "Yesterday **I went** to the movies with my sister.", ["I saw", "I went", "I was", "I left"], "I went",
            "'Fui' is the preterite yo form of ir (to go). Ser has the exact same preterite, so 'fui' can also mean 'I was' — context tells you which."),
          pattern(
            "In the past tense these verbs switch to a stem with u and end in -e, with no accent.",
            [
              ["Ayer yo **tuve** un examen.", "Yesterday I had a test."],
              ["Yo **estuve** en casa todo el día.", "I was at home all day."],
              ["Anoche yo no **pude** dormir.", "Last night I couldn't sleep."],
            ],
            "poner",
            "Anoche yo ____ las llaves en la mesa.",
            "Last night I put the keys on the table.",
            "puse",
            "u-stem preterites: tener → tuv-, estar → estuv-, poder → pud-, poner → pus-. They take the endings -e, -iste, -o, -imos, -ieron, with no accents: puse, pusiste, puso."),
          conjugate("De niña, ella ____ (tener) un perro.", "As a girl, she had a dog.", "tuvo",
            "tener → tuv- + -o = tuvo. Irregular preterites end in a plain -o for él/ella, not -ó."),
          vocab("hice", "**Hice** la tarea anoche.", "**I did** the homework last night.", ["I did", "I had", "I wanted", "I said"], "I did",
            "'Hice' is the preterite yo form of hacer (to do, to make). Its stem changes to hic-, and to hiz- for él/ella: hizo."),
          conjugate("El verano pasado nosotros ____ (estar) en la playa.", "Last summer we were at the beach.", "estuvimos",
            "estar → estuv- + -imos = estuvimos."),
          vocab("fue", "La fiesta **fue** muy divertida.", "The party **was** really fun.", ["Is", "Went", "Was", "Will be"], "Was",
            "'Fue' is the preterite él/ella form of ser (and of ir). Here it means 'was': the party was fun."),
          conjugate("¿Tú ____ (poder) terminar el proyecto?", "Were you able to finish the project?", "pudiste",
            "poder → pud- + -iste = pudiste."),
          vocab("vi", "Anoche **vi** una película de terror.", "Last night **I saw** a horror movie.", ["I saw", "I went", "I made", "I wanted"], "I saw",
            "'Vi' is the preterite yo form of ver (to see). It's short and has no accent: vi, viste, vio."),
        ],
      },
    ],
  },
  {
    focusArea: "Family and Relationships",
    levelName: "4",
    topics: [
      {
        lessonId: "13",
        levelId: "3a0655b5-4a34-44b3-a227-c915c8711877",
        topic: "Parents, siblings, and relatives",
        goal: "Family Members",
        grammarFocus: "Past tense (preterite) · -ar verbs · nosotros",
        questions: [
          vocab("abuela", "Mi **abuela** tiene ochenta años.", "My **grandmother** is eighty years old.", ["Aunt", "Grandmother", "Mother", "Cousin"], "Grandmother",
            "'Abuela' is grandmother and 'abuelo' is grandfather. 'Los abuelos' means the grandparents."),
          pattern(
            "These all use the past-tense nosotros form of an -ar verb.",
            [
              ["Ayer nosotros **visitamos** a los abuelos.", "Yesterday we visited our grandparents."],
              ["El domingo nosotros **cenamos** con mis tíos.", "On Sunday we had dinner with my aunt and uncle."],
              ["Anoche nosotros **hablamos** con mi prima.", "Last night we talked with my cousin."],
            ],
            "celebrar",
            "El sábado nosotros ____ el cumpleaños de mamá.",
            "On Saturday we celebrated Mom's birthday.",
            "celebramos",
            "Preterite -ar verbs: drop -ar and add -amos for nosotros. This is the same as the present form, so words like 'ayer' or 'el sábado' tell you it's past."),
          conjugate("El verano pasado mi hermano y yo ____ (viajar) con nuestros padres.", "Last summer my brother and I traveled with our parents.", "viajamos",
            "'Mi hermano y yo' is nosotros, so viajar → viaj- + -amos = viajamos (we traveled)."),
          vocab("hermano", "Mi **hermano** mayor estudia en la universidad.", "My older **brother** studies at the university.", ["Father", "Uncle", "Son", "Brother"], "Brother",
            "'Hermano' is brother and 'hermana' is sister. 'Mayor' means older; 'menor' means younger."),
          conjugate("Anoche nosotros ____ (llamar) a nuestra tía.", "Last night we called our aunt.", "llamamos",
            "llamar → llam- + -amos = llamamos (we called)."),
          vocab("tío", "Mi **tío** vive en Chile.", "My **uncle** lives in Chile.", ["Uncle", "Grandfather", "Nephew", "Cousin"], "Uncle",
            "'Tío' is uncle and 'tía' is aunt. In Spain, 'tío' is also slang for 'dude'."),
          conjugate("Ayer mis primos y yo ____ (cocinar) una paella.", "Yesterday my cousins and I cooked a paella.", "cocinamos",
            "'Mis primos y yo' is nosotros, so cocinar → cocin- + -amos = cocinamos (we cooked)."),
          vocab("primos", "Mis **primos** vienen a la fiesta.", "My **cousins** are coming to the party.", ["Siblings", "Parents", "Cousins", "Grandchildren"], "Cousins",
            "'Primo' (male) and 'prima' (female) mean cousin. The plural 'primos' covers a mixed group."),
        ],
      },
      {
        lessonId: "14",
        levelId: "9cd63d75-0f74-4962-8bf9-e3a7e71ab870",
        topic: "Friends and common relationships",
        goal: "Relationships",
        grammarFocus: "Past tense (preterite) · -ar verbs · tú",
        questions: [
          vocab("mejor amiga", "Mi **mejor amiga** se llama Elena.", "My **best friend** is named Elena.", ["Girlfriend", "Best friend", "Neighbor", "Classmate"], "Best friend",
            "'Mejor amiga' (or 'mejor amigo' for a man) is a best friend. 'Mejor' means best or better."),
          pattern(
            "These all use the past-tense tú form of an -ar verb.",
            [
              ["¿Tú **llamaste** a tu novio?", "Did you call your boyfriend?"],
              ["Tú **ayudaste** a tu vecina.", "You helped your neighbor."],
              ["Ayer tú **hablaste** con tu compañero.", "Yesterday you talked with your classmate."],
            ],
            "invitar",
            "¿Tú ____ a tus amigos a la fiesta?",
            "Did you invite your friends to the party?",
            "invitaste",
            "Preterite -ar verbs: drop -ar and add -aste for tú. llamar → llamaste, invitar → invitaste. No -s at the end — 'invitastes' is a common mistake."),
          conjugate("Ayer tú ____ (escuchar) a tu amigo.", "Yesterday you listened to your friend.", "escuchaste",
            "escuchar → escuch- + -aste = escuchaste (you listened)."),
          vocab("vecino", "Mi **vecino** tiene un perro grande.", "My **neighbor** has a big dog.", ["Neighbor", "Roommate", "Boss", "Partner"], "Neighbor",
            "'Vecino/vecina' is a neighbor. 'El vecindario' is the neighborhood."),
          conjugate("¿Tú ____ (visitar) a tu novia el sábado?", "Did you visit your girlfriend on Saturday?", "visitaste",
            "visitar → visit- + -aste = visitaste (you visited)."),
          vocab("compañero de clase", "Mi **compañero de clase** me ayuda con la tarea.", "My **classmate** helps me with the homework.", ["Teacher", "Coworker", "Classmate", "Roommate"], "Classmate",
            "'Compañero de clase' is a classmate. 'Compañero de trabajo' is a coworker and 'compañero de cuarto' a roommate."),
          conjugate("Anoche tú ____ (mandar) un mensaje a tu mejor amigo.", "Last night you sent a message to your best friend.", "mandaste",
            "mandar → mand- + -aste = mandaste (you sent)."),
          vocab("novios", "Ana y Luis son **novios**.", "Ana and Luis are **boyfriend and girlfriend**.", ["Brother and sister", "Boyfriend and girlfriend", "Neighbors", "Coworkers"], "Boyfriend and girlfriend",
            "'Novio' is boyfriend and 'novia' is girlfriend (or groom and bride at a wedding). 'Son novios' means they're a couple."),
        ],
      },
      {
        lessonId: "15",
        levelId: "912d5f15-444d-412c-a808-c5eec6d9af93",
        topic: "Mi, tu, su, nuestro",
        goal: "Possession",
        grammarFocus: "Past tense (preterite) · -er / -ir verbs · ellos / ellas / ustedes",
        questions: [
          vocab("mi", "**Mi** casa es azul.", "**My** house is blue.", ["Your", "His", "My", "Our"], "My",
            "'Mi' means my, with no accent. 'Mí' with an accent means me (para mí, for me)."),
          pattern(
            "These all use the past-tense ellos form of an -er or -ir verb.",
            [
              ["Ellos **vivieron** en nuestra casa.", "They lived in our house."],
              ["Mis padres **vendieron** su coche.", "My parents sold their car."],
              ["Mis amigos **escribieron** sus nombres.", "My friends wrote their names."],
            ],
            "comer",
            "Ellos ____ nuestra pizza.",
            "They ate our pizza.",
            "comieron",
            "Preterite -er and -ir verbs: drop -er/-ir and add -ieron for ellos, ellas and ustedes. vivir → vivieron, comer → comieron."),
          conjugate("Mis abuelos ____ (recibir) nuestra carta.", "My grandparents got our letter.", "recibieron",
            "'Mis abuelos' is ellos, so recibir → recib- + -ieron = recibieron (they received)."),
          vocab("tu", "¿Dónde está **tu** mochila?", "Where is **your** backpack?", ["Your", "My", "His", "Our"], "Your",
            "'Tu' (no accent) means your, for someone you'd call tú. 'Tú' with an accent means you."),
          conjugate("Los estudiantes ____ (aprender) sus lecciones.", "The students learned their lessons.", "aprendieron",
            "'Los estudiantes' is ellos, so aprender → aprend- + -ieron = aprendieron (they learned)."),
          vocab("su", "Ella busca **su** libro.", "She is looking for **her** book.", ["Your", "My", "Her", "Their"], "Her",
            "'Su' can mean his, her, its, their or your (usted). Here the owner is 'ella', so it's her."),
          conjugate("Mis primos ____ (subir) sus maletas.", "My cousins carried their suitcases upstairs.", "subieron",
            "'Mis primos' is ellos, so subir → sub- + -ieron = subieron (they carried up)."),
          vocab("nuestro", "**Nuestro** perro se llama Toby.", "**Our** dog is named Toby.", ["Their", "Our", "My", "Your"], "Our",
            "'Nuestro' means our. It matches the thing owned: nuestro perro, nuestra casa, nuestros libros."),
        ],
      },
      {
        lessonId: "16",
        levelId: "4996d033-f22f-4269-849e-798ef4dd21ed",
        topic: "Tener, possessives",
        goal: "Having and Describing",
        grammarFocus: "Past tense (preterite) · -ar verbs · ellos / ellas / ustedes",
        questions: [
          vocab("pelo", "Mi hermana tiene el **pelo** largo.", "My sister has long **hair**.", ["Eyes", "Hair", "Face", "Hands"], "Hair",
            "'Pelo' is hair. Spanish describes it with tener: 'Tiene el pelo largo' = she has long hair."),
          pattern(
            "These all use the past-tense ellos form of an -ar verb.",
            [
              ["Ellos **compraron** una casa.", "They bought a house."],
              ["Mis tíos **pasaron** el verano aquí.", "My aunt and uncle spent the summer here."],
              ["Ellas **ganaron** el partido.", "They won the game."],
            ],
            "regalar",
            "Mis padres me ____ un gato.",
            "My parents gave me a cat.",
            "regalaron",
            "Preterite -ar verbs: drop -ar and add -aron for ellos, ellas and ustedes. comprar → compraron, regalar → regalaron."),
          conjugate("Mis amigos ____ (tomar) muchas fotos.", "My friends took lots of photos.", "tomaron",
            "'Mis amigos' is ellos, so tomar → tom- + -aron = tomaron (they took)."),
          vocab("ojos", "Tiene los **ojos** verdes.", "He has green **eyes**.", ["Ears", "Lips", "Eyes", "Glasses"], "Eyes",
            "'Ojos' means eyes. Like hair, eye color uses tener: 'Tengo los ojos marrones.'"),
          conjugate("Ayer mis hermanos ____ (limpiar) su cuarto.", "Yesterday my brothers cleaned their room.", "limpiaron",
            "'Mis hermanos' is ellos, so limpiar → limpi- + -aron = limpiaron (they cleaned)."),
          vocab("simpático", "Mi papá es muy **simpático**.", "My dad is very **nice**.", ["Nice", "Funny", "Serious", "Shy"], "Nice",
            "'Simpático' means nice or friendly — not sympathetic. Funny is 'gracioso' and shy is 'tímido'."),
          conjugate("El año pasado mis vecinos ____ (pintar) su casa.", "Last year my neighbors painted their house.", "pintaron",
            "'Mis vecinos' is ellos, so pintar → pint- + -aron = pintaron (they painted)."),
          vocab("tengo hambre", "**Tengo hambre**, ¿comemos?", "**I'm hungry**, shall we eat?", ["I'm thirsty", "I'm tired", "I'm cold", "I'm hungry"], "I'm hungry",
            "Spanish uses tener for many feelings: tengo hambre (I'm hungry), tengo sed (thirsty), tengo frío (cold), tengo sueño (sleepy)."),
        ],
      },
      {
        lessonId: "20",
        levelId: "dbd3e2b8-6830-4d63-b747-dada5aa68f39",
        topic: "Irregular preterite: dije, traje, vine",
        goal: "Irregulars",
        grammarFocus: "Past tense (preterite) · j-stem irregulars",
        questions: [
          vocab("dijo", "Mi abuela **dijo** que sí.", "My grandmother **said** yes.", ["Asked", "Said", "Wanted", "Came"], "Said",
            "'Dijo' is the preterite él/ella form of decir (to say, to tell): dije, dijiste, dijo, dijimos, dijeron."),
          pattern(
            "In the past tense these verbs have a j in the stem and end in -e, with no accent.",
            [
              ["Yo **dije** la verdad.", "I told the truth."],
              ["Yo **traje** el pastel.", "I brought the cake."],
              ["Yo **conduje** a la casa de mis abuelos.", "I drove to my grandparents' house."],
            ],
            "traducir",
            "Yo ____ la carta para mi abuela.",
            "I translated the letter for my grandmother.",
            "traduje",
            "j-stem preterites: decir → dij-, traer → traj-, conducir → conduj-, traducir → traduj-. They take -e, -iste, -o, -imos and -eron, with no accents."),
          conjugate("Mi primo ____ (decir) que viene mañana.", "My cousin said he's coming tomorrow.", "dijo",
            "decir → dij- + -o = dijo, with a plain -o (no accent)."),
          vocab("vino", "Mi tío **vino** a la fiesta.", "My uncle **came** to the party.", ["Came", "Saw", "Went", "Brought"], "Came",
            "'Vino' is the preterite él/ella form of venir (to come), which has an i stem: vine, viniste, vino. (It's also the word for wine!)"),
          conjugate("Mis tíos ____ (traer) regalos para todos.", "My aunt and uncle brought presents for everyone.", "trajeron",
            "With a j-stem, ellos takes -eron, not -ieron: traj- + -eron = trajeron."),
          vocab("trajeron", "Los invitados **trajeron** flores.", "The guests **brought** flowers.", ["Bought", "Brought", "Sent", "Wanted"], "Brought",
            "'Trajeron' is the preterite ellos form of traer (to bring)."),
          conjugate("¿Qué le ____ (decir) tú a tu hermana?", "What did you say to your sister?", "dijiste",
            "decir → dij- + -iste = dijiste."),
          vocab("hubo", "Ayer **hubo** una fiesta en mi casa.", "Yesterday **there was** a party at my house.", ["There is", "There was", "They had", "It will be"], "There was",
            "'Hubo' is the preterite of hay: there was, or there were. Like hay, it never changes for plural: hubo dos fiestas."),
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

const GRAMMAR_FOCUS_BY_LEVEL_ID: Record<string, string> = Object.fromEntries(
  LESSON_SUBCATEGORIES.flatMap((subcategory) =>
    subcategory.topics.map((topic) => [topic.levelId, topic.grammarFocus])
  )
);

export function getLessonQuestions(levelId: string): Question[] | undefined {
  return LESSON_QUESTIONS_BY_LEVEL_ID[levelId];
}

export function getLessonId(levelId: string): string | undefined {
  return LESSON_ID_BY_LEVEL_ID[levelId];
}

export function getGrammarFocus(levelId: string): string | undefined {
  return GRAMMAR_FOCUS_BY_LEVEL_ID[levelId];
}

/** Every vocab word taught in a level's lessons, as [word, meaning] pairs for
 *  a flashcard deck — taken from the vocab questions' targetWord and answer. */
export function getLevelVocab(levelName: string): [string, string][] {
  const seen = new Set<string>();
  const entries: [string, string][] = [];
  for (const topic of LESSON_SUBCATEGORIES.find((s) => s.levelName === levelName)?.topics ?? []) {
    for (const q of topic.questions) {
      if (q.category !== "vocab" || seen.has(q.targetWord)) continue;
      seen.add(q.targetWord);
      entries.push([q.targetWord, q.answer]);
    }
  }
  return entries;
}

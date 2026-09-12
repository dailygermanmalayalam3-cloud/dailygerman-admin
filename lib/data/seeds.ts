import { VocabularyItem, GrammarTopic, GoetheMaterial } from "@/types";

export const initialVocabulary: VocabularyItem[] = [
  {
    id: "c1111111-1111-4111-8111-111111111101",
    level: "A1",
    category: "Vocabulary",
    title: "Guten Tag & Die Begrüßungen (Greetings)",
    slug: "guten-tag-begruessungen",
    german_content: "Guten Tag! Wie geht es Ihnen?",
    english_meaning: "Good day! How are you?",
    malayalam_meaning: "ശുഭദിനം! നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്?",
    content: "German greetings change depending on the time of day and the level of formality. 'Guten Tag' is universally accepted during daytime.",
    order_index: 1,
    examples: [
      {
        german: "Guten Morgen, Herr Müller!",
        english: "Good morning, Mr. Müller!",
        malayalam: "സുപ്രഭാതം, മിസ്റ്റർ മുള്ളർ!"
      },
      {
        german: "Wie geht es dir? - Mir geht es gut, danke!",
        english: "How are you? - I am doing well, thank you!",
        malayalam: "നിനക്ക് എങ്ങനെയുണ്ട്? - എനിക്ക് സുഖമാണ്, നന്ദി!"
      }
    ]
  },
  {
    id: "c1111111-1111-4111-8111-111111111102",
    level: "A1",
    category: "Speaking",
    title: "Sich Vorstellen (Self Introduction)",
    slug: "sich-vorstellen-a1",
    german_content: "Ich heiße Rahul und ich komme aus Indien.",
    english_meaning: "My name is Rahul and I come from India.",
    malayalam_meaning: "എന്റെ പേര് രാഹുൽ എന്നാണ്, ഞാൻ ഇന്ത്യയിൽ നിന്നാണ് വരുന്നത്.",
    content: "Essential phrases for introducing yourself in German for A1 speaking exams and daily life.",
    order_index: 1,
    examples: [
      {
        german: "Woher kommen Sie?",
        english: "Where do you come from?",
        malayalam: "നിങ്ങൾ എവിടെ നിന്നാണ് വരുന്നത്?"
      },
      {
        german: "Ich wohne in Berlin.",
        english: "I live in Berlin.",
        malayalam: "ഞാൻ ബെർലിനിൽ താമസിക്കുന്നു."
      }
    ]
  },
  {
    id: "c1111111-1111-4111-8111-111111111103",
    level: "A1",
    category: "Vocabulary",
    title: "Die Familie (Family Members)",
    slug: "die-familie-a1",
    german_content: "die Mutter, der Vater, die Eltern",
    english_meaning: "Mother, Father, Parents",
    malayalam_meaning: "അമ്മ, അച്ഛൻ, മാതാപിതാക്കൾ",
    content: "Learn essential family vocabulary in German with correct articles (der, die, das).",
    order_index: 2,
    examples: [
      {
        german: "Das ist meine Mutter.",
        english: "This is my mother.",
        malayalam: "ഇത് എന്റെ അമ്മയാണ്."
      },
      {
        german: "Meine Eltern leben in Kerala.",
        english: "My parents live in Kerala.",
        malayalam: "എന്റെ മാതാപിതാക്കൾ കേരളത്തിലാണ് ജീവിക്കുന്നത്."
      }
    ]
  },
  {
    id: "c1111111-1111-4111-8111-111111111104",
    level: "A2",
    category: "Vocabulary",
    title: "Beim Einkaufen (Shopping & Groceries)",
    slug: "beim-einkaufen-a2",
    german_content: "Was darf es sein? Ich hätte gern ein Kilo Äpfel.",
    english_meaning: "What can I get you? I would like one kilogram of apples.",
    malayalam_meaning: "എന്താണ് വേണ്ടത്? എനിക്ക് ഒരു കിലോ ആപ്പിൾ വേണമായിരുന്നു.",
    content: "Polite expressions with 'hätte gern' and 'möchte' used at the supermarket and bakery.",
    order_index: 1,
    examples: [
      {
        german: "Wie viel kostet das?",
        english: "How much does that cost?",
        malayalam: "ഇതിന് എത്ര വിലയാകും?"
      },
      {
        german: "Haben Sie noch frisches Brot?",
        english: "Do you still have fresh bread?",
        malayalam: "നിങ്ങളുടെ പക്കൽ ഇനിയും ഫ്രഷ് ബ്രെഡ് ഉണ്ടോ?"
      }
    ]
  },
  {
    id: "c1111111-1111-4111-8111-111111111105",
    level: "B1",
    category: "Speaking",
    title: "Meinung Äußern (Expressing Opinions)",
    slug: "meinung-aeussern-b1",
    german_content: "Meiner Meinung nach ist Umweltschutz sehr wichtig.",
    english_meaning: "In my opinion, environmental protection is very important.",
    malayalam_meaning: "എന്റെ അഭിപ്രായത്തിൽ പരിസ്ഥിതി സംരക്ഷണം വളരെ പ്രധാനമാണ്.",
    content: "Key phrases to introduce arguments and opinions during B1 presentations and discussions.",
    order_index: 1,
    examples: [
      {
        german: "Ich bin der Ansicht, dass wir mehr Deutsch üben sollten.",
        english: "I am of the opinion that we should practice more German.",
        malayalam: "നമ്മൾ കൂടുതൽ ജർമ്മൻ പരിശീലിക്കണം എന്നാണ് എന്റെ വീക്ഷണം."
      }
    ]
  },
  {
    id: "c1111111-1111-4111-8111-111111111106",
    level: "B2",
    category: "Writing",
    title: "Beschwerdebrief formulieren (Writing a Complaint)",
    slug: "beschwerdebrief-b2",
    german_content: "Hiermit möchte ich mich über den mangelhaften Service beschweren.",
    english_meaning: "I would hereby like to complain about the deficient service.",
    malayalam_meaning: "മോശമായ സേവനത്തെക്കുറിച്ച് ഇതിനാൽ ഞാൻ പരാതിപ്പെടാൻ ആഗ്രഹിക്കുന്നു.",
    content: "Formal complaint structures and connectors used in Goethe B2 writing modules.",
    order_index: 1,
    examples: [
      {
        german: "Aus diesem Grund fordere ich eine angemessene Rückerstattung.",
        english: "For this reason, I demand an appropriate refund.",
        malayalam: "ഇക്കാരണത്താൽ ഞാൻ ഉചിതമായ റീഫണ്ട് ആവശ്യപ്പെടുന്നു."
      }
    ]
  }
];

export const initialGrammarTopics: GrammarTopic[] = [
  {
    id: "c2222222-2222-4222-8222-222222222201",
    level: "A1",
    title: "Bestimmte & Unbestimmte Artikel (der, die, das)",
    slug: "artikel-der-die-das",
    short_description: "Definite and indefinite articles in German nominative case.",
    explanation_malayalam: "ജർമ്മൻ ഭാഷയിലെ നാമപദങ്ങൾക്ക് മൂന്ന് ലിംഗഭേദങ്ങളുണ്ട്: പുല്ലിംഗം (der), സ്ത്രീലിംഗം (die), നപുംസകലിംഗം (das). ഇംഗ്ലീഷിലെ 'the' എന്നതിന് തുല്യമാണിത്.",
    content: "In German, every noun has a gender:\n- Maskulin: **der** Mann (the man)\n- Feminin: **die** Frau (the woman)\n- Neutral: **das** Kind (the child)\n- Plural: **die** Kinder (the children)\n\nIndefinite articles (a / an):\n- Maskulin: **ein** Mann\n- Feminin: **eine** Frau\n- Neutral: **ein** Kind",
    examples: [
      {
        german: "Der Tisch ist neu.",
        english: "The table is new.",
        malayalam: "മേശ പുതിയതാണ് (der Tisch - പുല്ലിംഗം)."
      },
      {
        german: "Eine Katze schläft hier.",
        english: "A cat is sleeping here.",
        malayalam: "ഒരു പൂച്ച ഇവിടെ ഉറങ്ങുന്നു."
      }
    ],
    order_index: 1
  },
  {
    id: "c2222222-2222-4222-8222-222222222202",
    level: "A1",
    title: "Der Akkusativ (The Direct Object Case)",
    slug: "akkusativ-a1",
    short_description: "How articles change when a noun becomes a direct object.",
    explanation_malayalam: "ഒരു വാക്യത്തിൽ പ്രവൃത്തി ഏൽക്കുന്ന വസ്തു അല്ലെങ്കിൽ വ്യക്തിയെ Akkusativ എന്ന് പറയുന്നു. പുല്ലിംഗത്തിൽ 'der' എന്നത് 'den' ആയും 'ein' എന്നത് 'einen' ആയും മാറും. മറ്റുള്ളവയിൽ മാറ്റമില്ല.",
    content: "In Akkusativ:\n- **der** becomes **den** (ein -> einen)\n- **die** stays **die** (eine -> eine)\n- **das** stays **das** (ein -> ein)\n- **die (Plural)** stays **die**",
    examples: [
      {
        german: "Ich habe einen Apfel.",
        english: "I have an apple.",
        malayalam: "എന്റെ പക്കൽ ഒരു ആപ്പിൾ ഉണ്ട് (der Apfel -> einen Apfel)."
      },
      {
        german: "Er kauft das Auto.",
        english: "He buys the car.",
        malayalam: "അവൻ കാർ വാങ്ങുന്നു."
      }
    ],
    order_index: 2
  },
  {
    id: "c2222222-2222-4222-8222-222222222203",
    level: "A2",
    title: "Das Perfekt (Past Tense with haben / sein)",
    slug: "perfekt-haben-sein",
    short_description: "Forming conversational past tense in German.",
    explanation_malayalam: "ദൈനംദിന സംസാരത്തിൽ ഭൂതകാലം പറയാൻ Perfekt ഉപയോഗിക്കുന്നു. 'haben' അല്ലെങ്കിൽ 'sein' സഹായക്രിയകളായി ഉപയോഗിച്ച് പ്രധാന ക്രിയയെ 'Partizip II' (ge-...) രൂപത്തിലാക്കുന്നു.",
    content: "Structure: Subject + haben/sein (conjugated) + ... + Partizip II (at the end).\n- Movement / change of state uses **sein** (gehen, fahren, aufstehen).\n- Most other verbs use **haben** (kaufen, essen, lernen).",
    examples: [
      {
        german: "Ich habe Deutsch gelernt.",
        english: "I have learned German.",
        malayalam: "ഞാൻ ജർമ്മൻ പഠിച്ചു."
      },
      {
        german: "Wir sind nach Deutschland gereist.",
        english: "We traveled to Germany.",
        malayalam: "ഞങ്ങൾ ജർമ്മനിയിലേക്ക് യാത്ര ചെയ്തു (sein)."
      }
    ],
    order_index: 3
  },
  {
    id: "c2222222-2222-4222-8222-222222222204",
    level: "B1",
    title: "Konjunktiv II (Wishes, Politeness & Hypotheticals)",
    slug: "konjunktiv-ii-b1",
    short_description: "Expressing polite requests and hypothetical dreams.",
    explanation_malayalam: "വിനീതമായ അഭ്യർത്ഥനകൾ, സങ്കൽപ്പങ്ങൾ അല്ലെങ്കിൽ ആഗ്രഹങ്ങൾ പ്രകടിപ്പിക്കാൻ Konjunktiv II ഉപയോഗിക്കുന്നു. 'würde + Infinitiv' അല്ലെങ്കിൽ 'hätte' / 'wäre'.",
    content: "Konjunktiv II is essential for polite German conversation.\n- 'Ich möchte...' (I would like...)\n- 'Wenn ich Zeit hätte, würde ich mehr reisen.' (If I had time, I would travel more.)",
    examples: [
      {
        german: "Könnten Sie mir bitte helfen?",
        english: "Could you please help me?",
        malayalam: "ദയവായി എന്നെ സഹായിക്കാമോ?"
      }
    ],
    order_index: 4
  }
];

export const initialGoetheMaterials: GoetheMaterial[] = [
  {
    id: "c3333333-3333-4333-8333-333333333301",
    level: "A1",
    section: "Sprechen",
    title: "Teil 1: Sich vorstellen & Buchstabieren",
    slug: "a1-goethe-sprechen-teil-1",
    description: "Introducing yourself, spelling your name, and saying telephone numbers.",
    content: "In Teil 1 of the A1 speaking exam, you present yourself using 7 key points: Name, Alter, Land, Wohnort, Sprachen, Beruf, Hobby. The examiner will then ask you to spell a word and say a number.",
    tips: "Always practice spelling difficult Malayalam names using the German alphabet (e.g., J = Jot, V = Fau, W = We, Z = Tsett)."
  },
  {
    id: "c3333333-3333-4333-8333-333333333302",
    level: "A1",
    section: "Lesen",
    title: "Teil 1: Kurze E-Mails & Notizen verstehen",
    slug: "a1-goethe-lesen-teil-1",
    description: "Reading short personal messages, invitations, and notices.",
    content: "Read short texts like informal emails from friends about meeting up, birthdays, or office appointments. Answer True/False (Richtig/Falsch) questions.",
    tips: "Watch out for signal words like 'nicht', 'kein', 'leider', and exact times (um 14 Uhr vs. ab 14 Uhr)."
  },
  {
    id: "c3333333-3333-4333-8333-333333333303",
    level: "A1",
    section: "Schreiben",
    title: "Teil 2: Eine kurze persönliche E-Mail schreiben",
    slug: "a1-goethe-schreiben-teil-2",
    description: "Writing approximately 30 words addressing 3 given bullet points.",
    content: "You will be given a scenario (e.g. You cannot come to the German class). You must address all 3 bullet points, include greeting ('Liebe Maria,' or 'Lieber Peter,') and farewell ('Herzliche Grüße').",
    tips: "Never skip any bullet point. Each point carries marks for grammar, vocabulary, and relevance."
  },
  {
    id: "c3333333-3333-4333-8333-333333333304",
    level: "A1",
    section: "Hören",
    title: "Teil 1 & 2: Alltagsgespräche & Durchsagen",
    slug: "a1-goethe-hoeren-teil-1",
    description: "Listening to short conversations and public station announcements.",
    content: "Part 1 conversations are played twice. Part 2 train station / airport announcements are played only ONCE.",
    tips: "Always read the questions during the pause before the audio plays so you know what key numbers, platforms, or times to listen for."
  },
  {
    id: "c3333333-3333-4333-8333-333333333305",
    level: "B1",
    section: "Sprechen",
    title: "Teil 2 & 3: Präsentation & Diskussion",
    slug: "b1-goethe-sprechen-teil-2",
    description: "Structuring a 3-4 minute presentation on a topic with pros and cons.",
    content: "Follow the 5-step presentation structure:\n1. Thema vorstellen & Struktur\n2. Eigene Erfahrung\n3. Situation im Heimatland (Indien / Kerala)\n4. Vor- und Nachteile\n5. Eigene Meinung & Abschluss",
    tips: "Use clear transitions like 'Ein weiterer Vorteil ist...', 'In meinem Heimatland Indien ist das anders...'."
  }
];

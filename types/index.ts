export type Level = "A1" | "A2" | "B1" | "B2";

export type Category = string;

export interface VocabularyCategory {
  id: string;
  name: string;
  order_index: number;
  created_at?: string;
}

export type GoetheSection = "Sprechen" | "Lesen" | "Schreiben" | "Hören";

export interface Example {
  german: string;
  english: string;
  malayalam: string;
}

export interface VocabularyItem {
  id: string;
  level: Level;
  category: string;
  title: string;
  slug: string;
  german_content: string;
  english_meaning: string;
  malayalam_meaning: string;
  content?: string;
  examples?: Example[];
  audio_url?: string;
  sentence_audio_url?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GrammarVideo {
  id: string;
  topic_id: string;
  title?: string;
  video_url: string;
  description?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GrammarExercise {
  id: string;
  topic_id: string;
  title?: string;
  content: string;
  solution?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GrammarTopic {
  id: string;
  level: Level;
  title: string;
  slug: string;
  short_description?: string;
  explanation_malayalam?: string;
  content?: string;
  examples?: Example[];
  order_index?: number;
  videos?: GrammarVideo[];
  exercises?: GrammarExercise[];
  created_at?: string;
  updated_at?: string;
}

export interface GoetheMaterial {
  id: string;
  level: Level;
  section: GoetheSection;
  title: string;
  slug: string;
  description: string;
  content: string;
  tips?: string;
  audio_url?: string;
  created_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "user";
}

export interface CategoryParagraph {
  id: string;
  category_name: string;
  level: Level;
  title?: string;
  order_index?: number;
  paragraph_german: string;
  paragraph_english?: string;
  paragraph_malayalam?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryQuestion {
  id: string;
  category_name: string;
  level: Level;
  paragraph_id?: string | null;
  question_german: string;
  question_english?: string;
  question_malayalam?: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

// Unified Structured Conversations
export interface DialogueTurn {
  id: string;
  speaker: string;
  speaker_role?: string;
  gender?: "male" | "female";
  german: string;
  english?: string;
  malayalam?: string;
  audio_url?: string;
}

export interface Conversation {
  id: string;
  topic_id: string;
  title: string;
  order_index?: number;
  turns: DialogueTurn[];
  created_at?: string;
  updated_at?: string;
}

export interface ConversationTopic {
  id: string;
  module: "speaking" | "medical" | string;
  level?: Level | null;
  title: string;
  slug: string;
  icon?: string;
  description?: string;
  order_index?: number;
  conversations?: Conversation[];
  created_at?: string;
  updated_at?: string;
}

// Speaking Module Aliases (mapped to unified structured conversation models)
export type SpeakingTopic = ConversationTopic;
export type SpeakingConversation = Conversation;

// Reading
export interface ReadingText {
  id: string;
  topic_id: string;
  title?: string;
  content_german: string;
  content_english?: string;
  content_malayalam?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReadingQuestion {
  id: string;
  topic_id: string;
  question: string;
  question_english?: string;
  question_malayalam?: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReadingTopic {
  id: string;
  level: Level;
  title: string;
  slug: string;
  description?: string;
  order_index?: number;
  texts?: ReadingText[];
  questions?: ReadingQuestion[];
  created_at?: string;
  updated_at?: string;
}

// Writing
export interface WritingSection {
  id: string;
  topic_id: string;
  title?: string;
  section_type: "task" | "example" | "phrases" | "instructions" | "general";
  content: string;
  explanation_malayalam?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WritingTopic {
  id: string;
  level: Level;
  title: string;
  slug: string;
  description?: string;
  order_index?: number;
  sections?: WritingSection[];
  created_at?: string;
  updated_at?: string;
}

// Medical German
export interface MedicalCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface MedicalWord {
  id: string;
  category_id: string;
  german: string;
  english: string;
  malayalam?: string;
  article?: string;
  plural?: string;
  example_german?: string;
  example_english?: string;
  example_malayalam?: string;
  order_index?: number;
  audio_url?: string;
  sentence_audio_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Medical Conversations Aliases (mapped to unified structured conversation models)
export type MedicalConversation = Conversation;
export type MedicalConversationTopic = ConversationTopic;

// User Suggestions & Feedback
export type SuggestionStatus = "unread" | "read" | "in_progress" | "resolved" | "archived";

export interface Suggestion {
  id: string;
  name: string;
  email: string;
  subject?: string;
  suggestion: string;
  ip_address?: string;
  device_fingerprint?: string;
  user_agent?: string;
  ip_country?: string;
  ip_region?: string;
  ip_city?: string;
  isp_asn?: string;
  isp_name?: string;
  forensic_data?: Record<string, any>;
  status: SuggestionStatus;
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlacklistedUser {
  id: string;
  user_name?: string;
  email?: string;
  ip_address?: string;
  device_fingerprint?: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

// Verbs Module (Infinitiv, Präteritum, Perfekt)
export interface VerbCategory {
  id: string;
  name: string;
  order_index: number;
  created_at?: string;
}

export interface VerbItem {
  id: string;
  level: Level;
  category_id: string;
  category_name?: string;
  // Infinitiv
  infinitive_de: string;
  infinitive_en: string;
  infinitive_ml: string;
  infinitive_audio_url?: string;
  // Präteritum
  praeteritum_de: string;
  praeteritum_en: string;
  praeteritum_ml: string;
  praeteritum_audio_url?: string;
  // Perfekt
  perfekt_de: string;
  perfekt_en: string;
  perfekt_ml: string;
  perfekt_audio_url?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}


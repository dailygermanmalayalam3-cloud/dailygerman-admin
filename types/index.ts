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
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GrammarTopic {
  id: string;
  level: Level;
  title: string;
  slug: string;
  short_description: string;
  explanation_malayalam: string;
  content: string;
  examples?: Example[];
  order_index?: number;
  created_at?: string;
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

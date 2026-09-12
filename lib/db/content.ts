import {
  initialVocabulary,
  initialGrammarTopics,
  initialGoetheMaterials,
} from "@/lib/data/seeds";
import {
  VocabularyItem,
  VocabularyCategory,
  GrammarTopic,
  GrammarVideo,
  GrammarExercise,
  GoetheMaterial,
  Level,
  Category,
  GoetheSection,
  CategoryParagraph,
  CategoryQuestion,
} from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const initialCategories: VocabularyCategory[] = [
  { id: "c4444444-4444-4444-8444-444444444401", name: "Greetings", order_index: 1 },
  { id: "c4444444-4444-4444-8444-444444444402", name: "Personal Info", order_index: 2 },
  { id: "c4444444-4444-4444-8444-444444444403", name: "Language and Communication", order_index: 3 },
  { id: "c4444444-4444-4444-8444-444444444404", name: "Family & Friends", order_index: 4 },
  { id: "c4444444-4444-4444-8444-444444444405", name: "Food & Dining", order_index: 5 },
  { id: "c4444444-4444-4444-8444-444444444406", name: "Shopping & Groceries", order_index: 6 },
  { id: "c4444444-4444-4444-8444-444444444407", name: "Daily Routine & Time", order_index: 7 },
  { id: "c4444444-4444-4444-8444-444444444408", name: "Housing & Living", order_index: 8 },
  { id: "c4444444-4444-4444-8444-444444444409", name: "Work & Career", order_index: 9 },
  { id: "c4444444-4444-4444-8444-444444444410", name: "Travel & Directions", order_index: 10 },
  { id: "c4444444-4444-4444-8444-444444444411", name: "Medical German", order_index: 11 },
];

// Fallback in-memory cache ONLY when Supabase credentials are not configured in .env.local
let memoryVocab = [...initialVocabulary];
let memoryGrammar = [...initialGrammarTopics];
let memoryGrammarVideos: GrammarVideo[] = [];
let memoryGrammarExercises: GrammarExercise[] = [];
let memoryGoethe = [...initialGoetheMaterials];
let memoryCategories = [...initialCategories];

// ----------------- VOCABULARY -----------------
export async function getVocabulary(level?: Level, category?: Category): Promise<VocabularyItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("vocabulary").select("*").order("order_index", { ascending: true }).order("created_at", { ascending: false });
      if (level) query = query.eq("level", level);
      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (!error && data) {
        return data as VocabularyItem[];
      }
      if (error) {
        console.error("Supabase error fetching vocabulary:", error.message);
      }
    }
  } catch (err) {
    console.warn("Supabase connection unavailable, using fallback:", err);
  }

  return memoryVocab
    .filter((item) => {
      if (level && item.level !== level) return false;
      if (category && item.category !== category) return false;
      return true;
    })
    .sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1));
}

export async function getVocabularyBySlug(slug: string): Promise<VocabularyItem | null> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("vocabulary").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as VocabularyItem;
      if (error) console.error("Supabase error fetching vocabulary by slug:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryVocab.find((item) => item.slug === slug) || null;
}

// ----------------- GRAMMAR TOPICS -----------------
export async function getGrammarTopics(level?: Level): Promise<GrammarTopic[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("grammar_topics").select("*").order("order_index", { ascending: true });
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (!error && data) return data as GrammarTopic[];
      if (error) console.error("Supabase error fetching grammar:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryGrammar.filter((item) => (!level ? true : item.level === level));
}

export async function getGrammarTopicBySlug(slug: string): Promise<GrammarTopic | null> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("grammar_topics").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as GrammarTopic;
      if (error) console.error("Supabase error fetching grammar by slug:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryGrammar.find((item) => item.slug === slug) || null;
}

// ----------------- GOETHE MATERIALS -----------------
export async function getGoetheMaterials(level?: Level, section?: GoetheSection): Promise<GoetheMaterial[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("goethe_materials").select("*").order("created_at", { ascending: false });
      if (level) query = query.eq("level", level);
      if (section) query = query.eq("section", section);
      const { data, error } = await query;
      if (!error && data) return data as GoetheMaterial[];
      if (error) console.error("Supabase error fetching goethe:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryGoethe.filter((item) => {
    if (level && item.level !== level) return false;
    if (section && item.section !== section) return false;
    return true;
  });
}

// ----------------- CATEGORIES -----------------
export async function getVocabularyCategories(): Promise<VocabularyCategory[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("vocabulary_categories")
        .select("*")
        .order("order_index", { ascending: true });
      if (!error && data) return data as VocabularyCategory[];
      if (error) console.error("Supabase error fetching categories:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable, using fallback:", err);
  }

  return [...memoryCategories].sort((a, b) => a.order_index - b.order_index);
}

export async function mutateVocabularyCategory(cat: { id?: string; name: string; order_index: number }): Promise<VocabularyCategory> {
  const payload: VocabularyCategory = {
    id: cat.id || `cat-${Date.now()}`,
    name: cat.name.trim(),
    order_index: Number(cat.order_index) || 1,
    created_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("vocabulary_categories")
      .upsert(payload, { onConflict: "name" })
      .select()
      .single();
    if (error) {
      console.error("Supabase category upsert error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as VocabularyCategory;
  }

  const idx = memoryCategories.findIndex((c) => c.name.toLowerCase() === payload.name.toLowerCase());
  if (idx >= 0) {
    memoryCategories[idx] = { ...memoryCategories[idx], ...payload };
  } else {
    memoryCategories.push(payload);
  }
  return payload;
}

export async function deleteVocabularyCategory(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("vocabulary_categories").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete category error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
  }

  memoryCategories = memoryCategories.filter((c) => c.id !== id);
  return true;
}

// ----------------- ADMIN MUTATIONS -----------------
export async function mutateVocabulary(item: Partial<VocabularyItem> & { level: Level; category: Category }): Promise<VocabularyItem> {
  const german = item.german_content?.trim() || "";
  const title = item.title?.trim() || german || "Vocabulary Word";
  const slug = item.slug || `${german || title}-${item.level}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const payload: VocabularyItem = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    category: item.category,
    title,
    slug,
    german_content: german,
    english_meaning: item.english_meaning || "",
    malayalam_meaning: item.malayalam_meaning || "",
    content: item.content || "",
    examples: item.examples || [],
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("vocabulary").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as VocabularyItem;
  }

  const index = memoryVocab.findIndex((v) => v.id === payload.id);
  if (index >= 0) {
    memoryVocab[index] = payload;
  } else {
    memoryVocab.unshift(payload);
  }
  return payload;
}

export async function batchMutateVocabulary(words: (Partial<VocabularyItem> & { level: Level; category: Category; german_content: string; english_meaning: string; malayalam_meaning: string })[]): Promise<VocabularyItem[]> {
  const payloads: VocabularyItem[] = words.map((item, idx) => {
    const german = item.german_content.trim();
    const title = item.title?.trim() || german;
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = item.slug || `${german}-${item.level}-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id: item.id || crypto.randomUUID(),
      level: item.level,
      category: item.category,
      title,
      slug,
      german_content: german,
      english_meaning: item.english_meaning || "",
      malayalam_meaning: item.malayalam_meaning || "",
      content: item.content || "",
      examples: item.examples || [],
      order_index: item.order_index !== undefined ? Number(item.order_index) : (idx + 1),
      created_at: item.created_at || new Date().toISOString(),
    };
  });

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("vocabulary").upsert(payloads).select();
    if (error) {
      console.error("Supabase batch upsert error:", error.message);
      throw new Error(`Supabase batch error: ${error.message}`);
    }
    if (data) return data as VocabularyItem[];
  }

  payloads.forEach((p) => {
    const idx = memoryVocab.findIndex((v) => v.id === p.id);
    if (idx >= 0) memoryVocab[idx] = p;
    else memoryVocab.unshift(p);
  });
  return payloads;
}

export async function deleteVocabularyItem(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("vocabulary").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  memoryVocab = memoryVocab.filter((v) => v.id !== id);
  return true;
}

export async function mutateGrammarTopic(item: Partial<GrammarTopic> & { title: string; level: Level }): Promise<GrammarTopic> {
  const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const payload: GrammarTopic = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    title: item.title,
    slug,
    short_description: item.short_description || "",
    explanation_malayalam: item.explanation_malayalam || "",
    content: item.content || "",
    examples: item.examples || [],
    order_index: item.order_index ?? memoryGrammar.length + 1,
    created_at: item.created_at || new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("grammar_topics").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert grammar error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as GrammarTopic;
  }

  const idx = memoryGrammar.findIndex((g) => g.id === payload.id);
  if (idx >= 0) memoryGrammar[idx] = payload;
  else memoryGrammar.push(payload);
  return payload;
}

export async function deleteGrammarTopicItem(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("grammar_topics").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete grammar error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  memoryGrammar = memoryGrammar.filter((g) => g.id !== id);
  return true;
}

// ----------------- GRAMMAR VIDEOS -----------------
export async function getGrammarVideos(topicId?: string): Promise<GrammarVideo[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("grammar_videos").select("*").order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as GrammarVideo[];
      if (error) console.error("Supabase error fetching grammar videos:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryGrammarVideos
    .filter((v) => (!topicId ? true : v.topic_id === topicId))
    .sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1));
}

export async function mutateGrammarVideo(item: Partial<GrammarVideo> & { topic_id: string; video_url: string }): Promise<GrammarVideo> {
  const payload: GrammarVideo = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    title: item.title || "",
    video_url: item.video_url.trim(),
    description: item.description || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("grammar_videos").upsert(payload).select().single();
    if (error) {
      console.error("Supabase error upserting grammar video:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as GrammarVideo;
  }

  const idx = memoryGrammarVideos.findIndex((v) => v.id === payload.id);
  if (idx >= 0) memoryGrammarVideos[idx] = payload;
  else memoryGrammarVideos.push(payload);
  return payload;
}

export async function deleteGrammarVideo(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("grammar_videos").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete grammar video error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  memoryGrammarVideos = memoryGrammarVideos.filter((v) => v.id !== id);
  return true;
}

// ----------------- GRAMMAR EXERCISES -----------------
export async function getGrammarExercises(topicId?: string): Promise<GrammarExercise[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("grammar_exercises").select("*").order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as GrammarExercise[];
      if (error) console.error("Supabase error fetching grammar exercises:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryGrammarExercises
    .filter((e) => (!topicId ? true : e.topic_id === topicId))
    .sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1));
}

export async function mutateGrammarExercise(item: Partial<GrammarExercise> & { topic_id: string; content: string }): Promise<GrammarExercise> {
  const payload: GrammarExercise = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    title: item.title || "",
    content: item.content.trim(),
    solution: item.solution || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("grammar_exercises").upsert(payload).select().single();
    if (error) {
      console.error("Supabase error upserting grammar exercise:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as GrammarExercise;
  }

  const idx = memoryGrammarExercises.findIndex((e) => e.id === payload.id);
  if (idx >= 0) memoryGrammarExercises[idx] = payload;
  else memoryGrammarExercises.push(payload);
  return payload;
}

export async function deleteGrammarExercise(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("grammar_exercises").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete grammar exercise error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  memoryGrammarExercises = memoryGrammarExercises.filter((e) => e.id !== id);
  return true;
}

export async function mutateGoetheMaterial(item: Partial<GoetheMaterial> & { title: string; level: Level; section: GoetheSection }): Promise<GoetheMaterial> {
  const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const payload: GoetheMaterial = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    section: item.section,
    title: item.title,
    slug,
    description: item.description || "",
    content: item.content || "",
    tips: item.tips || "",
    audio_url: item.audio_url || "",
    created_at: item.created_at || new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("goethe_materials").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert goethe error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as GoetheMaterial;
  }

  const idx = memoryGoethe.findIndex((m) => m.id === payload.id);
  if (idx >= 0) memoryGoethe[idx] = payload;
  else memoryGoethe.unshift(payload);
  return payload;
}

export async function deleteGoetheMaterialItem(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("goethe_materials").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete goethe error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  memoryGoethe = memoryGoethe.filter((m) => m.id !== id);
  return true;
}

// ----------------- CATEGORY PARAGRAPHS -----------------
export async function getCategoryParagraphs(
  level?: Level,
  categoryName?: string
): Promise<CategoryParagraph[]> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    let query = supabase
      .from("category_paragraphs")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (level) query = query.eq("level", level);
    if (categoryName) query = query.eq("category_name", categoryName);
    const { data, error } = await query;
    if (!error && data) return data as CategoryParagraph[];
    if (error) console.error("Supabase getCategoryParagraphs error:", error.message);
  }
  return [];
}

export async function mutateCategoryParagraph(
  item: Partial<CategoryParagraph> & { category_name: string; level: Level; paragraph_german: string }
): Promise<CategoryParagraph> {
  const payload: CategoryParagraph = {
    id: item.id || crypto.randomUUID(),
    category_name: item.category_name,
    level: item.level,
    title: item.title || "",
    order_index: item.order_index ?? 1,
    paragraph_german: item.paragraph_german,
    paragraph_english: item.paragraph_english || "",
    paragraph_malayalam: item.paragraph_malayalam || "",
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("category_paragraphs")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.error("Supabase upsert category_paragraphs error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as CategoryParagraph;
  }
  return payload;
}

export async function deleteCategoryParagraph(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("category_paragraphs").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete category_paragraphs error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// ----------------- CATEGORY QUESTIONS -----------------
export async function getCategoryQuestions(
  level?: Level,
  categoryName?: string,
  paragraphId?: string | null
): Promise<CategoryQuestion[]> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    let query = supabase
      .from("category_questions")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (level) query = query.eq("level", level);
    if (categoryName) query = query.eq("category_name", categoryName);
    if (paragraphId !== undefined) {
      if (paragraphId === null) {
        query = query.is("paragraph_id", null);
      } else {
        query = query.eq("paragraph_id", paragraphId);
      }
    }
    const { data, error } = await query;
    if (!error && data) return data as CategoryQuestion[];
    if (error) console.error("Supabase getCategoryQuestions error:", error.message);
  }
  return [];
}

export async function mutateCategoryQuestion(
  item: Partial<CategoryQuestion> & {
    category_name: string;
    level: Level;
    question_german: string;
    options: string[];
    correct_option_index: number;
  }
): Promise<CategoryQuestion> {
  const payload: CategoryQuestion = {
    id: item.id || crypto.randomUUID(),
    category_name: item.category_name,
    level: item.level,
    paragraph_id: item.paragraph_id || null,
    question_german: item.question_german,
    question_english: item.question_english || "",
    question_malayalam: item.question_malayalam || "",
    options: item.options,
    correct_option_index: item.correct_option_index,
    explanation: item.explanation || "",
    order_index: item.order_index ?? 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("category_questions")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.error("Supabase upsert category_questions error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as CategoryQuestion;
  }
  return payload;
}

export async function deleteCategoryQuestion(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("category_questions").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete category_questions error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}
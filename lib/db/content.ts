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
  SpeakingTopic,
  SpeakingConversation,
  ReadingTopic,
  ReadingText,
  ReadingQuestion,
  WritingTopic,
  WritingSection,
  MedicalCategory,
  MedicalWord,
  MedicalConversationTopic,
  MedicalConversation,
  Suggestion,
  SuggestionStatus,
  BlacklistedUser,
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
  const name = cat.name.trim();
  const order_index = Number(cat.order_index) || 1;
  const payload: VocabularyCategory = {
    id: cat.id || crypto.randomUUID(),
    name,
    order_index,
    created_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    let result;
    if (cat.id) {
      // 1. Fetch current category name to check if renamed
      const { data: currentCat } = await supabase
        .from("vocabulary_categories")
        .select("name")
        .eq("id", cat.id)
        .maybeSingle();
      const oldName = currentCat?.name;

      // 2. Existing category being updated by ID
      const { data, error } = await supabase
        .from("vocabulary_categories")
        .update({ name, order_index })
        .eq("id", cat.id)
        .select()
        .single();
      if (error) {
        console.error("Supabase category update error:", error.message);
        throw new Error(`Supabase error: ${error.message}`);
      }
      result = data;

      // 3. Cascade rename across all related content tables
      if (oldName && oldName !== name) {
        await Promise.all([
          supabase.from("vocabulary").update({ category: name }).eq("category", oldName),
          supabase.from("category_paragraphs").update({ category_name: name }).eq("category_name", oldName),
          supabase.from("category_questions").update({ category_name: name }).eq("category_name", oldName),
        ]);
      }
    } else {
      // New category insertion with UUID
      const { data, error } = await supabase
        .from("vocabulary_categories")
        .upsert(payload, { onConflict: "name" })
        .select()
        .single();
      if (error) {
        console.error("Supabase category upsert error:", error.message);
        throw new Error(`Supabase error: ${error.message}`);
      }
      result = data;
    }
    if (result) return result as VocabularyCategory;
  }

  const idx = memoryCategories.findIndex(
    (c) => (cat.id && c.id === cat.id) || c.name.toLowerCase() === payload.name.toLowerCase()
  );
  const oldMemName = idx >= 0 ? memoryCategories[idx].name : null;
  if (idx >= 0) {
    memoryCategories[idx] = { ...memoryCategories[idx], ...payload };
  } else {
    memoryCategories.push(payload);
  }

  if (oldMemName && oldMemName !== name) {
    memoryVocab.forEach((w) => {
      if (w.category.toLowerCase() === oldMemName.toLowerCase()) {
        w.category = name;
      }
    });
  }

  return payload;
}

export async function deleteVocabularyCategory(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data: currentCat } = await supabase
      .from("vocabulary_categories")
      .select("name")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("vocabulary_categories").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete category error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (currentCat?.name) {
      await Promise.all([
        supabase.from("vocabulary").update({ category: "General Vocabulary" }).eq("category", currentCat.name),
        supabase.from("category_paragraphs").update({ category_name: "General Vocabulary" }).eq("category_name", currentCat.name),
        supabase.from("category_questions").update({ category_name: "General Vocabulary" }).eq("category_name", currentCat.name),
      ]);
    }
  }

  const catToDelete = memoryCategories.find((c) => c.id === id);
  if (catToDelete) {
    memoryVocab.forEach((w) => {
      if (w.category.toLowerCase() === catToDelete.name.toLowerCase()) {
        w.category = "General Vocabulary";
      }
    });
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
    audio_url: item.audio_url || undefined,
    sentence_audio_url: item.sentence_audio_url || undefined,
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
      audio_url: item.audio_url || undefined,
      sentence_audio_url: item.sentence_audio_url || undefined,
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

// ----------------- SPEAKING MODULE -----------------
export async function getSpeakingTopics(level?: Level): Promise<SpeakingTopic[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("speaking_topics").select("*, conversations:speaking_conversations(*)").order("order_index", { ascending: true });
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (!error && data) return data as SpeakingTopic[];
      if (error) console.error("Supabase error fetching speaking topics:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateSpeakingTopic(item: Partial<SpeakingTopic> & { level: Level; title: string; slug: string }): Promise<SpeakingTopic> {
  const payload: SpeakingTopic = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    title: item.title.trim(),
    slug: item.slug.trim(),
    description: item.description || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("speaking_topics").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert speaking topic error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as SpeakingTopic;
  }
  return payload;
}

export async function deleteSpeakingTopic(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("speaking_topics").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete speaking topic error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

export async function getSpeakingConversations(topicId?: string): Promise<SpeakingConversation[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("speaking_conversations").select("*").order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as SpeakingConversation[];
      if (error) console.error("Supabase error fetching speaking conversations:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateSpeakingConversation(item: Partial<SpeakingConversation> & { topic_id: string; conversation_text: string }): Promise<SpeakingConversation> {
  const payload: SpeakingConversation = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    title: item.title || "",
    conversation_text: item.conversation_text.trim(),
    explanation_malayalam: item.explanation_malayalam || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("speaking_conversations").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert speaking conversation error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as SpeakingConversation;
  }
  return payload;
}

export async function deleteSpeakingConversation(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("speaking_conversations").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete speaking conversation error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// ----------------- READING MODULE -----------------
export async function getReadingTopics(level?: Level): Promise<ReadingTopic[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase
        .from("reading_topics")
        .select("*, texts:reading_texts(*), questions:reading_questions(*)")
        .order("order_index", { ascending: true });
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (!error && data) return data as ReadingTopic[];
      if (error) console.error("Supabase error fetching reading topics:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateReadingTopic(item: Partial<ReadingTopic> & { level: Level; title: string; slug: string }): Promise<ReadingTopic> {
  const payload: ReadingTopic = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    title: item.title.trim(),
    slug: item.slug.trim(),
    description: item.description || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("reading_topics").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert reading topic error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as ReadingTopic;
  }
  return payload;
}

export async function deleteReadingTopic(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("reading_topics").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete reading topic error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

export async function getReadingTexts(topicId?: string): Promise<ReadingText[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("reading_texts").select("*").order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as ReadingText[];
      if (error) console.error("Supabase error fetching reading texts:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateReadingText(item: Partial<ReadingText> & { topic_id: string; content_german: string }): Promise<ReadingText> {
  const payload: ReadingText = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    title: item.title || "",
    content_german: item.content_german.trim(),
    content_english: item.content_english || "",
    content_malayalam: item.content_malayalam || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("reading_texts").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert reading text error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as ReadingText;
  }
  return payload;
}

export async function deleteReadingText(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("reading_texts").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete reading text error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

export async function getReadingQuestions(topicId?: string): Promise<ReadingQuestion[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("reading_questions").select("*").order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as ReadingQuestion[];
      if (error) console.error("Supabase error fetching reading questions:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateReadingQuestion(item: Partial<ReadingQuestion> & { topic_id: string; question: string; options: string[]; correct_option_index: number }): Promise<ReadingQuestion> {
  const payload: ReadingQuestion = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    question: item.question.trim(),
    question_english: item.question_english || "",
    question_malayalam: item.question_malayalam || "",
    options: item.options || [],
    correct_option_index: Number(item.correct_option_index) || 0,
    explanation: item.explanation || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("reading_questions").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert reading question error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as ReadingQuestion;
  }
  return payload;
}

export async function deleteReadingQuestion(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("reading_questions").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete reading question error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// ----------------- WRITING MODULE -----------------
export async function getWritingTopics(level?: Level): Promise<WritingTopic[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("writing_topics").select("*, sections:writing_sections(*)").order("order_index", { ascending: true });
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (!error && data) return data as WritingTopic[];
      if (error) console.error("Supabase error fetching writing topics:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateWritingTopic(item: Partial<WritingTopic> & { level: Level; title: string; slug: string }): Promise<WritingTopic> {
  const payload: WritingTopic = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    title: item.title.trim(),
    slug: item.slug.trim(),
    description: item.description || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("writing_topics").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert writing topic error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as WritingTopic;
  }
  return payload;
}

export async function deleteWritingTopic(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("writing_topics").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete writing topic error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

export async function getWritingSections(topicId?: string): Promise<WritingSection[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("writing_sections").select("*").order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as WritingSection[];
      if (error) console.error("Supabase error fetching writing sections:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateWritingSection(item: Partial<WritingSection> & { topic_id: string; content: string }): Promise<WritingSection> {
  const payload: WritingSection = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    title: item.title || "",
    section_type: item.section_type || "general",
    content: item.content.trim(),
    explanation_malayalam: item.explanation_malayalam || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("writing_sections").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert writing section error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as WritingSection;
  }
  return payload;
}

export async function deleteWritingSection(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("writing_sections").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete writing section error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// ----------------- MEDICAL GERMAN MODULE -----------------

// Categories
export async function getMedicalCategories(): Promise<MedicalCategory[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("medical_categories")
        .select("*")
        .order("order_index", { ascending: true });
      if (!error && data) return data as MedicalCategory[];
      if (error) console.error("Supabase error fetching medical categories:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateMedicalCategory(
  item: Partial<MedicalCategory> & { name: string }
): Promise<MedicalCategory> {
  const payload: MedicalCategory = {
    id: item.id || crypto.randomUUID(),
    name: item.name.trim(),
    icon: item.icon || "🩺",
    description: item.description || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("medical_categories").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert medical category error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as MedicalCategory;
  }
  return payload;
}

export async function deleteMedicalCategory(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("medical_categories").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete medical category error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// Words
export async function getMedicalWords(categoryId?: string): Promise<MedicalWord[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase
        .from("medical_words")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (!error && data) return data as MedicalWord[];
      if (error) console.error("Supabase error fetching medical words:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateMedicalWord(
  item: Partial<MedicalWord> & { category_id: string; german: string; english: string }
): Promise<MedicalWord> {
  const payload: MedicalWord = {
    id: item.id || crypto.randomUUID(),
    category_id: item.category_id,
    german: item.german.trim(),
    english: item.english.trim(),
    malayalam: item.malayalam || "",
    article: item.article || "",
    plural: item.plural || "",
    example_german: item.example_german || "",
    example_english: item.example_english || "",
    example_malayalam: item.example_malayalam || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    audio_url: item.audio_url || undefined,
    sentence_audio_url: item.sentence_audio_url || undefined,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("medical_words").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert medical word error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as MedicalWord;
  }
  return payload;
}

export async function deleteMedicalWord(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("medical_words").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete medical word error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// Conversation Topics
export async function getMedicalConversationTopics(): Promise<MedicalConversationTopic[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("medical_conversation_topics")
        .select("*, conversations:medical_conversations(*)")
        .order("order_index", { ascending: true });
      if (!error && data) {
        data.forEach((topic: MedicalConversationTopic) => {
          if (topic.conversations) {
            topic.conversations.sort(
              (a: MedicalConversation, b: MedicalConversation) =>
                (a.order_index ?? 1) - (b.order_index ?? 1)
            );
          }
        });
        return data as MedicalConversationTopic[];
      }
      if (error) console.error("Supabase error fetching medical conversation topics:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateMedicalConversationTopic(
  item: Partial<MedicalConversationTopic> & { title: string; slug: string }
): Promise<MedicalConversationTopic> {
  const payload: MedicalConversationTopic = {
    id: item.id || crypto.randomUUID(),
    title: item.title.trim(),
    slug: item.slug.trim().toLowerCase(),
    icon: item.icon || "🏥",
    description: item.description || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("medical_conversation_topics")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.error("Supabase upsert medical conversation topic error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as MedicalConversationTopic;
  }
  return payload;
}

export async function deleteMedicalConversationTopic(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("medical_conversation_topics")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Supabase delete medical conversation topic error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// Conversations
export async function getMedicalConversations(topicId?: string): Promise<MedicalConversation[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase
        .from("medical_conversations")
        .select("*")
        .order("order_index", { ascending: true });
      if (topicId) query = query.eq("topic_id", topicId);
      const { data, error } = await query;
      if (!error && data) return data as MedicalConversation[];
      if (error) console.error("Supabase error fetching medical conversations:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }
  return [];
}

export async function mutateMedicalConversation(
  item: Partial<MedicalConversation> & { topic_id: string; conversation_text: string }
): Promise<MedicalConversation> {
  const payload: MedicalConversation = {
    id: item.id || crypto.randomUUID(),
    topic_id: item.topic_id,
    title: item.title || "Hospital Dialogue",
    conversation_text: item.conversation_text.trim(),
    explanation_malayalam: item.explanation_malayalam || "",
    order_index: item.order_index !== undefined ? Number(item.order_index) : 1,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("medical_conversations")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.error("Supabase upsert medical conversation error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as MedicalConversation;
  }
  return payload;
}

export async function deleteMedicalConversation(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("medical_conversations")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Supabase delete medical conversation error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// ==========================================================================
// User Suggestions & Feedback Functions
// ==========================================================================
export async function getSuggestions(status?: string, search?: string): Promise<Suggestion[]> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    let query = supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,suggestion.ilike.%${s}%,subject.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase getSuggestions error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    return (data || []) as Suggestion[];
  }
  return [];
}

export async function updateSuggestion(
  id: string,
  updates: { status?: SuggestionStatus; admin_notes?: string }
): Promise<Suggestion | null> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.admin_notes !== undefined) payload.admin_notes = updates.admin_notes;

    const { data, error } = await supabase
      .from("suggestions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase updateSuggestion error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    return data as Suggestion;
  }
  return null;
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("suggestions").delete().eq("id", id);
    if (error) {
      console.error("Supabase deleteSuggestion error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}

// ----------------- USER BLACKLIST -----------------
export async function getBlacklistedUsers(): Promise<BlacklistedUser[]> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("blacklisted_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase getBlacklistedUsers error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    return (data || []) as BlacklistedUser[];
  }
  return [];
}

export async function blacklistUser(item: {
  user_name?: string;
  email?: string;
  ip_address?: string;
  device_fingerprint?: string;
  reason?: string;
}): Promise<BlacklistedUser> {
  const supabase = await createServerSupabaseClient();
  const payload: BlacklistedUser = {
    id: crypto.randomUUID(),
    user_name: item.user_name || undefined,
    email: item.email ? item.email.trim().toLowerCase() : undefined,
    ip_address: item.ip_address || undefined,
    device_fingerprint: item.device_fingerprint || undefined,
    reason: item.reason || "Malicious or abusive behavior",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("blacklisted_users")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Supabase blacklistUser error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    return data as BlacklistedUser;
  }
  return payload;
}

export async function unblacklistUser(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("blacklisted_users").delete().eq("id", id);
    if (error) {
      console.error("Supabase unblacklistUser error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  return true;
}



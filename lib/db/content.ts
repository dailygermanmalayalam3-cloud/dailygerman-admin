import {
  initialVocabulary,
  initialGrammarTopics,
  initialGoetheMaterials,
  initialConversations,
} from "@/lib/data/seeds";
import {
  VocabularyItem,
  GrammarTopic,
  GoetheMaterial,
  ConversationItem,
  Level,
  Category,
  GoetheSection,
} from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Fallback in-memory cache ONLY when Supabase credentials are not configured in .env.local
let memoryVocab = [...initialVocabulary];
let memoryGrammar = [...initialGrammarTopics];
let memoryGoethe = [...initialGoetheMaterials];
let memoryConversations = [...initialConversations];

// ----------------- VOCABULARY -----------------
export async function getVocabulary(level?: Level, category?: Category): Promise<VocabularyItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("vocabulary").select("*").order("created_at", { ascending: false });
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

  return memoryVocab.filter((item) => {
    if (level && item.level !== level) return false;
    if (category && item.category !== category) return false;
    return true;
  });
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

// ----------------- CONVERSATIONS -----------------
export async function getConversations(level?: Level): Promise<ConversationItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      let query = supabase.from("conversations").select("*").order("created_at", { ascending: false });
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (!error && data) return data as ConversationItem[];
      if (error) console.error("Supabase error fetching conversations:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryConversations.filter((item) => (!level ? true : item.level === level));
}

export async function getConversationBySlug(slug: string): Promise<ConversationItem | null> {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("conversations").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as ConversationItem;
      if (error) console.error("Supabase error fetching conversation by slug:", error.message);
    }
  } catch (err) {
    console.warn("Supabase connection unavailable:", err);
  }

  return memoryConversations.find((item) => item.slug === slug) || null;
}

// ----------------- ADMIN MUTATIONS -----------------
export async function mutateVocabulary(item: Partial<VocabularyItem> & { title: string; level: Level; category: Category }): Promise<VocabularyItem> {
  const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const payload: VocabularyItem = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    category: item.category,
    title: item.title,
    slug,
    german_content: item.german_content || "",
    english_meaning: item.english_meaning || "",
    malayalam_meaning: item.malayalam_meaning || "",
    content: item.content || "",
    examples: item.examples || [],
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

export async function mutateConversation(item: Partial<ConversationItem> & { title: string; level: Level }): Promise<ConversationItem> {
  const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const payload: ConversationItem = {
    id: item.id || crypto.randomUUID(),
    level: item.level,
    title: item.title,
    slug,
    description: item.description || "",
    dialogue: item.dialogue || [],
    created_at: item.created_at || new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("conversations").upsert(payload).select().single();
    if (error) {
      console.error("Supabase upsert conversation error:", error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }
    if (data) return data as ConversationItem;
  }

  const idx = memoryConversations.findIndex((c) => c.id === payload.id);
  if (idx >= 0) memoryConversations[idx] = payload;
  else memoryConversations.unshift(payload);
  return payload;
}

export async function deleteConversationItem(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete conversation error:", error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }
  memoryConversations = memoryConversations.filter((c) => c.id !== id);
  return true;
}
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VerbCategory, VerbItem, Level } from "@/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// ----------------- VERB CATEGORIES -----------------

export async function getVerbCategories(): Promise<VerbCategory[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("verb_categories")
    .select("id, name, order_index, created_at")
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching verb categories:", error);
    throw new Error(error.message);
  }

  return (data || []) as VerbCategory[];
}

export async function createVerbCategory(category: {
  id?: string;
  name: string;
  order_index?: number;
}): Promise<VerbCategory> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  const id = category.id || crypto.randomUUID();
  if (!isValidUUID(id)) {
    throw new Error(`Invalid UUID format for category id: ${id}`);
  }

  const { data, error } = await supabase
    .from("verb_categories")
    .insert([
      {
        id,
        name: category.name.trim(),
        order_index: category.order_index ?? 1,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating verb category:", error);
    throw new Error(error.message);
  }

  return data as VerbCategory;
}

export async function updateVerbCategory(
  id: string,
  updates: { name?: string; order_index?: number }
): Promise<VerbCategory> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  if (!isValidUUID(id)) {
    throw new Error(`Invalid UUID format for category id: ${id}`);
  }

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.order_index !== undefined) payload.order_index = updates.order_index;

  const { data, error } = await supabase
    .from("verb_categories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating verb category:", error);
    throw new Error(error.message);
  }

  return data as VerbCategory;
}

export async function deleteVerbCategory(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  if (!isValidUUID(id)) {
    throw new Error(`Invalid UUID format for category id: ${id}`);
  }

  const { error } = await supabase
    .from("verb_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting verb category:", error);
    throw new Error(error.message);
  }

  return true;
}

// ----------------- VERBS CRUD -----------------

export async function getVerbs(options?: {
  level?: Level;
  category_id?: string;
  search?: string;
}): Promise<VerbItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("verbs")
    .select(
      `id, level, category_id,
       infinitive_de, infinitive_en, infinitive_ml, infinitive_audio_url,
       praeteritum_de, praeteritum_en, praeteritum_ml, praeteritum_audio_url,
       perfekt_de, perfekt_en, perfekt_ml, perfekt_audio_url,
       order_index, created_at, updated_at,
       verb_categories(name)`
    )
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (options?.level) {
    query = query.eq("level", options.level);
  }

  if (options?.category_id) {
    query = query.eq("category_id", options.category_id);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(
      `infinitive_de.ilike.%${s}%,infinitive_en.ilike.%${s}%,praeteritum_de.ilike.%${s}%,perfekt_de.ilike.%${s}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching verbs:", error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    level: row.level,
    category_id: row.category_id,
    category_name: row.verb_categories?.name || undefined,
    infinitive_de: row.infinitive_de,
    infinitive_en: row.infinitive_en,
    infinitive_ml: row.infinitive_ml,
    infinitive_audio_url: row.infinitive_audio_url,
    praeteritum_de: row.praeteritum_de,
    praeteritum_en: row.praeteritum_en,
    praeteritum_ml: row.praeteritum_ml,
    praeteritum_audio_url: row.praeteritum_audio_url,
    perfekt_de: row.perfekt_de,
    perfekt_en: row.perfekt_en,
    perfekt_ml: row.perfekt_ml,
    perfekt_audio_url: row.perfekt_audio_url,
    order_index: row.order_index,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function createVerb(
  verb: Omit<VerbItem, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<VerbItem> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  const id = verb.id || crypto.randomUUID();
  if (!isValidUUID(id)) {
    throw new Error(`Invalid UUID format for verb id: ${id}`);
  }
  if (!isValidUUID(verb.category_id)) {
    throw new Error(`Invalid UUID format for category_id: ${verb.category_id}`);
  }

  const { data, error } = await supabase
    .from("verbs")
    .insert([
      {
        id,
        level: verb.level,
        category_id: verb.category_id,
        infinitive_de: verb.infinitive_de.trim(),
        infinitive_en: verb.infinitive_en.trim(),
        infinitive_ml: verb.infinitive_ml.trim(),
        infinitive_audio_url: verb.infinitive_audio_url || null,
        praeteritum_de: verb.praeteritum_de.trim(),
        praeteritum_en: verb.praeteritum_en.trim(),
        praeteritum_ml: verb.praeteritum_ml.trim(),
        praeteritum_audio_url: verb.praeteritum_audio_url || null,
        perfekt_de: verb.perfekt_de.trim(),
        perfekt_en: verb.perfekt_en.trim(),
        perfekt_ml: verb.perfekt_ml.trim(),
        perfekt_audio_url: verb.perfekt_audio_url || null,
        order_index: verb.order_index ?? 1,
      },
    ])
    .select(`*, verb_categories(name)`)
    .single();

  if (error) {
    console.error("Error creating verb:", error);
    throw new Error(error.message);
  }

  return {
    ...data,
    category_name: data.verb_categories?.name,
  };
}

export async function updateVerb(
  id: string,
  updates: Partial<VerbItem>
): Promise<VerbItem> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  if (!isValidUUID(id)) {
    throw new Error(`Invalid UUID format for verb id: ${id}`);
  }
  if (updates.category_id && !isValidUUID(updates.category_id)) {
    throw new Error(`Invalid UUID format for category_id: ${updates.category_id}`);
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.infinitive_de !== undefined) payload.infinitive_de = updates.infinitive_de.trim();
  if (updates.infinitive_en !== undefined) payload.infinitive_en = updates.infinitive_en.trim();
  if (updates.infinitive_ml !== undefined) payload.infinitive_ml = updates.infinitive_ml.trim();
  if (updates.infinitive_audio_url !== undefined) payload.infinitive_audio_url = updates.infinitive_audio_url || null;
  if (updates.praeteritum_de !== undefined) payload.praeteritum_de = updates.praeteritum_de.trim();
  if (updates.praeteritum_en !== undefined) payload.praeteritum_en = updates.praeteritum_en.trim();
  if (updates.praeteritum_ml !== undefined) payload.praeteritum_ml = updates.praeteritum_ml.trim();
  if (updates.praeteritum_audio_url !== undefined) payload.praeteritum_audio_url = updates.praeteritum_audio_url || null;
  if (updates.perfekt_de !== undefined) payload.perfekt_de = updates.perfekt_de.trim();
  if (updates.perfekt_en !== undefined) payload.perfekt_en = updates.perfekt_en.trim();
  if (updates.perfekt_ml !== undefined) payload.perfekt_ml = updates.perfekt_ml.trim();
  if (updates.perfekt_audio_url !== undefined) payload.perfekt_audio_url = updates.perfekt_audio_url || null;
  if (updates.order_index !== undefined) payload.order_index = updates.order_index;

  const { data, error } = await supabase
    .from("verbs")
    .update(payload)
    .eq("id", id)
    .select(`*, verb_categories(name)`)
    .single();

  if (error) {
    console.error("Error updating verb:", error);
    throw new Error(error.message);
  }

  return {
    ...data,
    category_name: data.verb_categories?.name,
  };
}

export async function deleteVerb(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  if (!isValidUUID(id)) {
    throw new Error(`Invalid UUID format for verb id: ${id}`);
  }

  const { error } = await supabase.from("verbs").delete().eq("id", id);

  if (error) {
    console.error("Error deleting verb:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function batchCreateVerbs(
  verbs: Array<Omit<VerbItem, "id" | "created_at" | "updated_at"> & { id?: string }>
): Promise<VerbItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database connection unavailable");

  const formattedRows = verbs.map((v) => {
    const id = v.id || crypto.randomUUID();
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format for verb id: ${id}`);
    }
    if (!isValidUUID(v.category_id)) {
      throw new Error(`Invalid UUID format for category_id: ${v.category_id}`);
    }

    return {
      id,
      level: v.level,
      category_id: v.category_id,
      infinitive_de: v.infinitive_de.trim(),
      infinitive_en: v.infinitive_en.trim(),
      infinitive_ml: v.infinitive_ml.trim(),
      infinitive_audio_url: v.infinitive_audio_url || null,
      praeteritum_de: v.praeteritum_de.trim(),
      praeteritum_en: v.praeteritum_en.trim(),
      praeteritum_ml: v.praeteritum_ml.trim(),
      praeteritum_audio_url: v.praeteritum_audio_url || null,
      perfekt_de: v.perfekt_de.trim(),
      perfekt_en: v.perfekt_en.trim(),
      perfekt_ml: v.perfekt_ml.trim(),
      perfekt_audio_url: v.perfekt_audio_url || null,
      order_index: v.order_index ?? 1,
    };
  });

  const { data, error } = await supabase
    .from("verbs")
    .insert(formattedRows)
    .select(`*, verb_categories(name)`);

  if (error) {
    console.error("Error batch inserting verbs:", error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    ...row,
    category_name: row.verb_categories?.name,
  }));
}

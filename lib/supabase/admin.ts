import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface NormalizedAdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
  role: string | null;
  fullName: string;
  avatarUrl: string | null;
  provider: string;
  raw_user_meta_data: Record<string, unknown>;
  raw_app_meta_data: Record<string, unknown>;
}

export async function listAdminUsers(): Promise<NormalizedAdminUser[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return (data?.users || []).map((u) => {
    const meta = u.user_metadata || {};
    const appMeta = u.app_metadata || {};
    const fullName =
      (meta.full_name as string) ||
      (meta.name as string) ||
      (u.email ? u.email.split("@")[0] : "Learner");

    const provider =
      (appMeta.provider as string) ||
      (appMeta.providers && Array.isArray(appMeta.providers) ? appMeta.providers[0] : null) ||
      "email";

    return {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      confirmed_at: u.confirmed_at ?? null,
      role: u.role ?? "authenticated",
      fullName,
      avatarUrl: (meta.avatar_url as string) || null,
      provider: String(provider),
      raw_user_meta_data: meta,
      raw_app_meta_data: appMeta,
    };
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

export interface NormalizedAdminVoiceGroup {
  id: string;
  name: string;
  level: "All" | "A1" | "A2" | "B1" | "B2";
  topic: string;
  host_id: string;
  host_name: string;
  host_email: string;
  host_full_name: string;
  host_provider: string;
  host_avatar_url: string | null;
  participant_count: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export async function listAdminVoiceGroups(
  status: "all" | "active" | "inactive" = "all"
): Promise<NormalizedAdminVoiceGroup[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("voice_groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data: groups, error } = await query;
  if (error) {
    throw new Error(`Failed to list voice groups: ${error.message}`);
  }

  let userMap = new Map<string, NormalizedAdminUser>();
  try {
    const users = await listAdminUsers();
    userMap = new Map(users.map((u) => [u.id, u]));
  } catch {
    // Non-blocking fallback
  }

  return (groups || []).map((g) => {
    const creator = userMap.get(g.host_id);
    return {
      id: g.id,
      name: g.name,
      level: g.level,
      topic: g.topic || "",
      host_id: g.host_id,
      host_name: g.host_name || "Unknown",
      host_email: g.host_email || creator?.email || "",
      host_full_name: creator?.fullName || g.host_name || "Learner",
      host_provider: creator?.provider || "unknown",
      host_avatar_url: creator?.avatarUrl || null,
      participant_count: g.participant_count ?? 0,
      is_active: Boolean(g.is_active),
      created_at: g.created_at,
      updated_at: g.updated_at,
    };
  });
}

export async function dissolveAdminVoiceGroup(groupId: string): Promise<void> {
  if (!groupId || typeof groupId !== "string") {
    throw new Error("Invalid voice group ID");
  }
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("voice_groups")
    .update({ is_active: false, participant_count: 0 })
    .eq("id", groupId);

  if (error) {
    throw new Error(`Failed to dissolve voice group: ${error.message}`);
  }
}

export async function deleteAdminVoiceGroup(groupId: string): Promise<void> {
  if (!groupId || typeof groupId !== "string") {
    throw new Error("Invalid voice group ID");
  }
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("voice_groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    throw new Error(`Failed to delete voice group: ${error.message}`);
  }
}

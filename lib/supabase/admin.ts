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

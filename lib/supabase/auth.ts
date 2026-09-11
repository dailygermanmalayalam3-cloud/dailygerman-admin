import { createServerSupabaseClient } from "./server";

export async function getCurrentUser() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !user.email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS || "dailygermanmalayalam3@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("email", user.email)
        .single();
      if (data && data.role === "admin") return true;
    }
  } catch {
    // ignore
  }

  return false;
}

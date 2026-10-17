import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Returns the logged-in user if their email is listed in ADMIN_EMAILS
// (comma-separated). Being logged in alone is not enough, so an account
// created through Supabase sign-up cannot reach admin features.
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(user.email.toLowerCase()) ? user : null;
}

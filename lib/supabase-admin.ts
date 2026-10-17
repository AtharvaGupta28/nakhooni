import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses Row Level Security. Only use in server code, and only after any
// required authorisation checks have passed.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

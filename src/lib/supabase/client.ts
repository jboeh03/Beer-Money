import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { requirePublicSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();

  return createBrowserClient<Database>(url, anonKey);
}

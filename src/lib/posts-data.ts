import type { PostApprovalState } from "@/lib/database.types";
import type { PostRecord } from "@/lib/posts-model";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export type PostsLoad =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; rows: PostRecord[] };

export async function loadPosts(): Promise<PostsLoad> {
  if (!getPublicSupabaseEnv()) {
    return { status: "unconfigured" };
  }

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const missingSession =
      claimsError?.name === "AuthSessionMissingError" ||
      /auth session missing/i.test(claimsError?.message ?? "");

    if (!claimsData?.claims) {
      if (claimsError && !missingSession) {
        return { status: "error" };
      }
      return { status: "signed-out" };
    }

    const { data, error } = await supabase
      .from("posts")
      .select("id, channel, title, body, approval_state, disclosure, scheduled_for");

    if (error) {
      return { status: "error" };
    }

    const rows: PostRecord[] = (data ?? []).map((row) => ({
      id: row.id,
      channel: row.channel,
      title: row.title,
      body: row.body,
      approvalState: row.approval_state as PostApprovalState,
      disclosure: row.disclosure,
      scheduledFor: row.scheduled_for,
    }));

    if (rows.length === 0) {
      return { status: "empty" };
    }

    return { status: "ready", rows };
  } catch {
    return { status: "error" };
  }
}

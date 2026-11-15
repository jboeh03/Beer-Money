"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasDisclosure } from "@/lib/posts-model";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/");
  }
  return supabase;
}

export async function createDraft(formData: FormData) {
  const supabase = await requireUser();
  const channel = String(formData.get("channel") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const disclosure = String(formData.get("disclosure") ?? "").trim();

  if (!channel || !hasDisclosure(disclosure)) {
    redirect("/content-studio?error=disclosure");
  }

  const { error } = await supabase.from("posts").insert({
    channel,
    title: title || null,
    body,
    disclosure,
    approval_state: "draft",
  });

  if (error) {
    redirect("/content-studio?error=save");
  }

  revalidatePath("/content-studio");
  redirect("/content-studio");
}

export async function approveDrafts(formData: FormData) {
  const supabase = await requireUser();
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) {
    redirect("/content-studio");
  }

  const { error } = await supabase
    .from("posts")
    .update({ approval_state: "approved", scheduled_for: null })
    .in("id", ids)
    .eq("approval_state", "draft");

  if (error) {
    redirect("/content-studio?error=save");
  }

  revalidatePath("/content-studio");
  redirect("/content-studio");
}

export async function unschedulePost(formData: FormData) {
  const supabase = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/content-studio");
  }

  const { error } = await supabase
    .from("posts")
    .update({ approval_state: "draft" })
    .eq("id", id)
    .eq("approval_state", "scheduled");

  if (error) {
    redirect("/content-studio?error=save");
  }

  revalidatePath("/content-studio");
  redirect("/content-studio");
}

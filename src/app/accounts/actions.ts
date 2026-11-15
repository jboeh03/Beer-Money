"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AccountCadence } from "@/lib/database.types";
import { safeHttpUrl } from "@/lib/today-model";
import { createClient } from "@/lib/supabase/server";

const CADENCES = new Set(["daily", "24h", "weekly", "monthly", "none"]);

function text(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length > 0 ? value : null;
}

function rejectSecrets(value: string | null) {
  if (!value) {
    return false;
  }
  return /seed phrase|private key|mnemonic|password|api token|secret key/i.test(value);
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/");
  }
  return supabase;
}

function cadenceOf(value: string | null): AccountCadence {
  return value && CADENCES.has(value) ? (value as AccountCadence) : "none";
}

export async function saveAccount(formData: FormData) {
  const supabase = await requireUser();
  const id = text(formData, "id");
  const appName = text(formData, "app_name");
  const category = text(formData, "category");
  const notes = text(formData, "notes");
  const username = text(formData, "username");
  const referralCode = text(formData, "referral_code");

  if (!appName || !category || rejectSecrets(notes) || rejectSecrets(username) || rejectSecrets(referralCode)) {
    redirect("/accounts?error=save");
  }

  const payload = {
    app_name: appName,
    category,
    username,
    referral_url: safeHttpUrl(text(formData, "referral_url")),
    referral_code: referralCode,
    cadence: cadenceOf(text(formData, "cadence")),
    notes,
  };

  const result = id
    ? await supabase.from("connected_accounts").update(payload).eq("id", id)
    : await supabase.from("connected_accounts").insert(payload);

  if (result.error) {
    redirect("/accounts?error=save");
  }

  revalidatePath("/accounts");
  revalidatePath("/explore");
  redirect("/accounts");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await requireUser();
  const id = text(formData, "id");
  if (!id) {
    redirect("/accounts");
  }

  const { error } = await supabase.from("connected_accounts").delete().eq("id", id);
  if (error) {
    redirect("/accounts?error=save");
  }

  revalidatePath("/accounts");
  revalidatePath("/explore");
  redirect("/accounts");
}

export async function addExploredAccount(formData: FormData) {
  const supabase = await requireUser();
  const appName = text(formData, "app_name");
  const category = text(formData, "category") ?? "other";
  if (!appName || rejectSecrets(appName)) {
    redirect("/explore?error=save");
  }

  const { error } = await supabase.from("connected_accounts").insert({
    app_name: appName,
    category,
    cadence: "none",
  });

  if (error) {
    redirect("/explore?error=save");
  }

  revalidatePath("/accounts");
  revalidatePath("/explore");
  redirect("/accounts");
}

export async function saveWalletAddress(formData: FormData) {
  const supabase = await requireUser();
  const address = text(formData, "address") ?? "";
  const label = text(formData, "label");
  const publicAddress =
    address.length >= 8 &&
    address.length <= 128 &&
    !/\s/.test(address) &&
    !/seed|private|mnemonic|secret/i.test(address);

  if (!publicAddress || rejectSecrets(label)) {
    redirect("/settings/integrations?error=address");
  }

  const { error } = await supabase.from("wallet_addresses").insert({
    address,
    label,
  });

  if (error) {
    redirect("/settings/integrations?error=address");
  }

  revalidatePath("/settings/integrations");
  redirect("/settings/integrations");
}

export async function deleteWalletAddress(formData: FormData) {
  const supabase = await requireUser();
  const id = text(formData, "id");
  if (!id) {
    redirect("/settings/integrations");
  }

  await supabase.from("wallet_addresses").delete().eq("id", id);
  revalidatePath("/settings/integrations");
  redirect("/settings/integrations");
}

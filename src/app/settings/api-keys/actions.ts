"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseApiKeyInput } from "@/lib/api-keys/crypto";
import {
  deleteUserApiKey,
  saveUserApiKey,
  testStoredApiKey,
  type StoredKeyTestResult,
} from "@/lib/api-keys/get-user-api-key";
import { isApiKeyProvider } from "@/lib/api-keys/providers";
import { createClient } from "@/lib/supabase/server";

const USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string" || !USER_ID.test(userId)) {
    redirect("/");
  }
  return userId;
}

function providerOf(formData: FormData): string | null {
  const value = formData.get("provider");
  return typeof value === "string" && isApiKeyProvider(value) ? value : null;
}

function noticeFor(error: unknown): "rejected" | "not-ready" | "unavailable" {
  if (
    error instanceof Error &&
    (error.message === "rejected" || error.message === "not-ready" || error.message === "unavailable")
  ) {
    return error.message;
  }
  return "unavailable";
}

function fail(notice: "rejected" | "not-ready" | "unavailable"): never {
  redirect(`/settings/api-keys?notice=${notice}`);
}

export async function saveApiKey(formData: FormData) {
  const userId = await requireUserId();
  const provider = providerOf(formData);
  const parsed = parseApiKeyInput(formData.get("api_key"));
  if (!provider || !parsed.ok) {
    fail("rejected");
  }

  try {
    await saveUserApiKey(userId, provider, parsed.value);
  } catch (error) {
    fail(noticeFor(error));
  }

  revalidatePath("/settings/api-keys");
  redirect(`/settings/api-keys?notice=saved&provider=${provider}`);
}

export async function deleteApiKey(formData: FormData) {
  const userId = await requireUserId();
  const provider = providerOf(formData);
  if (!provider) {
    fail("rejected");
  }

  try {
    await deleteUserApiKey(userId, provider);
  } catch (error) {
    fail(noticeFor(error));
  }

  revalidatePath("/settings/api-keys");
  redirect(`/settings/api-keys?notice=deleted&provider=${provider}`);
}

export async function testApiKey(formData: FormData) {
  const userId = await requireUserId();
  const provider = providerOf(formData);
  if (!provider) {
    fail("rejected");
  }

  let result: StoredKeyTestResult;
  try {
    result = await testStoredApiKey(userId, provider);
  } catch (error) {
    fail(noticeFor(error));
  }

  revalidatePath("/settings/api-keys");
  redirect(`/settings/api-keys?notice=tested&provider=${provider}&result=${result}`);
}

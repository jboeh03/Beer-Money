import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ApiKeysPanel, type ApiKeyNotice, type SavedKeyDisplay } from "@/components/api-keys/api-keys-panel";
import { AppShell } from "@/components/shell/app-shell";
import { SetupNotice } from "@/components/setup-notice";
import { formatKeyHint } from "@/lib/api-keys/crypto";
import { isApiKeyProvider, providerById, type ApiKeyProviderId } from "@/lib/api-keys/providers";
import { formatKeyTimestamp, keyStatusLabel } from "@/lib/api-keys/status";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata = { title: "API keys · Beer Money" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function providerLabel(value: string | undefined) {
  if (!value || !isApiKeyProvider(value)) return null;
  return providerById(value)?.label ?? null;
}

function noticeFrom(params: {
  notice?: string | string[];
  provider?: string | string[];
  result?: string | string[];
}): ApiKeyNotice | null {
  const notice = first(params.notice);
  const label = providerLabel(first(params.provider));
  const who = label ? `${label}: ` : "";
  if (notice === "saved") {
    return { tone: "ok", text: `${who}Key saved. Only the last four characters are shown.` };
  }
  if (notice === "deleted") {
    return { tone: "ok", text: `${who}Key deleted.` };
  }
  if (notice === "rejected") {
    return {
      tone: "bad",
      text: "That key was rejected. Paste one line, 8 to 512 characters, with no spaces.",
    };
  }
  if (notice === "not-ready") {
    return {
      tone: "bad",
      text: "API keys are not ready. Apply the latest migration, then reload. Nothing was stored.",
    };
  }
  if (notice === "unavailable") {
    return {
      tone: "bad",
      text: "The key could not be changed. Check the server encryption key. Nothing new was stored.",
    };
  }
  if (notice === "tested") {
    const result = first(params.result);
    if (result === "passed") {
      return { tone: "ok", text: `${who}The provider accepted this key.` };
    }
    if (result === "failed") {
      return { tone: "bad", text: `${who}The provider rejected this key. It is still saved.` };
    }
    if (result === "untested") {
      return { tone: "ok", text: `${who}Saved (not tested).` };
    }
    if (result === "missing") {
      return { tone: "bad", text: `${who}No saved key to test.` };
    }
  }
  return null;
}

async function ApiKeysContent({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string | string[];
    provider?: string | string[];
    result?: string | string[];
  }>;
}) {
  const notice = noticeFrom(await searchParams);

  if (!getPublicSupabaseEnv()) {
    return (
      <AppShell activeHref="/settings/api-keys">
        <ApiKeysPanel saved={{}} notice={notice} interactive={false} sample={false} unavailable={null} />
        <SetupNotice />
      </AppShell>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string" || userId.length === 0) {
    redirect("/");
  }

  const { data: rows, error } = await supabase
    .from("user_api_keys_safe")
    .select("provider, key_hint, created_at, last_tested_at, last_test_ok")
    .eq("user_id", userId);

  if (error) {
    return (
      <AppShell activeHref="/settings/api-keys">
        <ApiKeysPanel
          saved={{}}
          notice={notice}
          interactive={false}
          sample={false}
          unavailable="The key table is not available yet. Apply the latest migration, then reload. Nothing was stored."
        />
      </AppShell>
    );
  }

  const saved: Partial<Record<ApiKeyProviderId, SavedKeyDisplay>> = {};
  for (const row of rows ?? []) {
    if (!isApiKeyProvider(row.provider) || !row.key_hint || !row.created_at) continue;
    const provider = providerById(row.provider);
    saved[row.provider] = {
      hint: formatKeyHint(row.key_hint),
      addedOn: formatKeyTimestamp(row.created_at),
      lastTested: row.last_tested_at ? formatKeyTimestamp(row.last_tested_at) : "Not yet",
      status: keyStatusLabel(
        { lastTestedAt: row.last_tested_at, lastTestOk: row.last_test_ok },
        provider?.test.kind === "get",
      ),
    };
  }

  return (
    <AppShell activeHref="/settings/api-keys">
      <ApiKeysPanel saved={saved} notice={notice} interactive sample={false} unavailable={null} />
    </AppShell>
  );
}

export default function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string | string[];
    provider?: string | string[];
    result?: string | string[];
  }>;
}) {
  return (
    <Suspense>
      <ApiKeysContent searchParams={searchParams} />
    </Suspense>
  );
}

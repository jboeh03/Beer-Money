import type { ApiKeyProviderConfig } from "./providers";

export type ProbeResult = { tested: false } | { tested: true; ok: boolean };

export async function runProviderProbe(
  provider: Pick<ApiKeyProviderConfig, "test">,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeResult> {
  if (provider.test.kind !== "get") {
    return { tested: false };
  }

  try {
    const response = await fetchImpl(provider.test.url, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...provider.test.headers(apiKey),
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel().catch(() => undefined);
    return { tested: true, ok: response.status >= 200 && response.status < 300 };
  } catch {
    return { tested: true, ok: false };
  }
}

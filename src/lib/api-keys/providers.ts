type GetTest = {
  kind: "get";
  url: string;
  headers: (apiKey: string) => Record<string, string>;
};

type NoneTest = {
  kind: "none";
};

type ApiKeyProvider = {
  id: string;
  label: string;
  test: GetTest | NoneTest;
};

// One list so a new provider is a config change, plus a matching check constraint.
export const API_KEY_PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    test: {
      kind: "get",
      url: "https://generativelanguage.googleapis.com/v1beta/models",
      headers: (apiKey: string) => ({ "x-goog-api-key": apiKey }),
    },
  },
  {
    id: "openai",
    label: "OpenAI",
    test: {
      kind: "get",
      url: "https://api.openai.com/v1/models",
      headers: (apiKey: string) => ({ authorization: `Bearer ${apiKey}` }),
    },
  },
  {
    id: "anthropic",
    label: "Anthropic",
    test: {
      kind: "get",
      url: "https://api.anthropic.com/v1/models?limit=1",
      headers: (apiKey: string) => ({
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      }),
    },
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    test: {
      kind: "get",
      url: "https://api.x.ai/v1/models",
      headers: (apiKey: string) => ({ authorization: `Bearer ${apiKey}` }),
    },
  },
  {
    id: "firecrawl",
    label: "Firecrawl",
    test: { kind: "none" },
  },
  {
    id: "higgsfield",
    label: "Higgsfield",
    test: { kind: "none" },
  },
] as const satisfies readonly ApiKeyProvider[];

export type ApiKeyProviderId = (typeof API_KEY_PROVIDERS)[number]["id"];
export type ApiKeyProviderConfig = (typeof API_KEY_PROVIDERS)[number];

const PROVIDER_IDS = new Set<string>(API_KEY_PROVIDERS.map((provider) => provider.id));

export function isApiKeyProvider(value: string): value is ApiKeyProviderId {
  return PROVIDER_IDS.has(value);
}

export function providerById(value: string): ApiKeyProviderConfig | null {
  return API_KEY_PROVIDERS.find((provider) => provider.id === value) ?? null;
}

import { deleteApiKey, saveApiKey, testApiKey } from "@/app/settings/api-keys/actions";
import { API_KEY_PROVIDERS, type ApiKeyProviderId } from "@/lib/api-keys/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export type SavedKeyDisplay = {
  hint: string;
  addedOn: string;
  lastTested: string;
  status: string;
};

export type ApiKeyNotice = {
  tone: "ok" | "bad";
  text: string;
};

function statusClass(status: string) {
  if (status === "Passed") return "text-positive";
  if (status === "Failed") return "text-negative";
  return "text-foreground";
}

export function ApiKeysPanel({
  saved,
  notice,
  interactive,
  sample,
  unavailable,
}: {
  saved: Partial<Record<ApiKeyProviderId, SavedKeyDisplay>>;
  notice: ApiKeyNotice | null;
  interactive: boolean;
  sample: boolean;
  unavailable: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">API keys</h1>
        <p className="text-sm leading-6 text-secondary">
          Bring your own keys for opportunity research, influencer work, and content creation.
          Beer Money encrypts each key and only shows the last four characters.
        </p>
        <p className="text-sm leading-6 text-secondary">
          Coming soon: use Beer Money&apos;s keys on a paid plan.
        </p>
      </div>
      {sample ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-secondary">
          Sample state. No key is stored. Hints and dates on the filled cards say Sample.
        </p>
      ) : null}
      {notice ? (
        <p
          role={notice.tone === "bad" ? "alert" : "status"}
          className={notice.tone === "bad" ? "text-sm text-negative" : "text-sm text-positive"}
        >
          {notice.text}
        </p>
      ) : null}
      {unavailable ? <ErrorState title="API keys are not ready" description={unavailable} /> : null}
      {API_KEY_PROVIDERS.map((provider) => {
        const row = saved[provider.id];
        const testable = provider.test.kind === "get";
        return (
          <Card key={provider.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">{provider.label}</h2>
              {sample && row ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-secondary">
                  Sample
                </span>
              ) : null}
            </div>
            {row ? (
              <>
                <p className={`mt-2 text-sm font-medium ${statusClass(row.status)}`}>{row.status}</p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-secondary">Key</dt>
                    <dd className="font-mono text-foreground">{row.hint}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-secondary">Added on</dt>
                    <dd className="text-right text-foreground">{row.addedOn}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-secondary">Last tested</dt>
                    <dd className="text-right text-foreground">{row.lastTested}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-2 text-sm text-secondary">No key saved</p>
            )}
            <p className="mt-3 text-sm text-secondary">
              {testable
                ? "Test sends a read-only request. The key stays on the server."
                : "Beer Money stores this key and does not call the provider to test it."}
            </p>
            {interactive ? (
              <>
                <form action={saveApiKey} className="mt-4">
                  <input type="hidden" name="provider" value={provider.id} />
                  <label className="block text-xs text-secondary">
                    {row ? "Replace key" : "API key"}
                    <input
                      name="api_key"
                      type="password"
                      required
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="off"
                      maxLength={512}
                      className={fieldClass}
                    />
                  </label>
                  <Button type="submit" className="mt-3">
                    {row ? "Replace key" : "Save key"}
                  </Button>
                </form>
                {row ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {testable ? (
                      <form action={testApiKey}>
                        <input type="hidden" name="provider" value={provider.id} />
                        <Button type="submit" variant="secondary">
                          Test key
                        </Button>
                      </form>
                    ) : null}
                    <form action={deleteApiKey}>
                      <input type="hidden" name="provider" value={provider.id} />
                      <Button type="submit" variant="ghost">
                        Delete key
                      </Button>
                    </form>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-4">
                <label className="block text-xs text-secondary">
                  {row ? "Replace key" : "API key"}
                  <input
                    type="password"
                    disabled
                    autoComplete="off"
                    spellCheck={false}
                    className={fieldClass}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" disabled>
                    {row ? "Replace key" : "Save key"}
                  </Button>
                  {row && testable ? (
                    <Button type="button" variant="secondary" disabled>
                      Test key
                    </Button>
                  ) : null}
                  {row ? (
                    <Button type="button" variant="ghost" disabled>
                      Delete key
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

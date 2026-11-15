import { ApiKeysPanel, type SavedKeyDisplay } from "@/components/api-keys/api-keys-panel";
import { AppShell } from "@/components/shell/app-shell";
import { keyStatusLabel } from "@/lib/api-keys/status";
import type { ApiKeyProviderId } from "@/lib/api-keys/providers";

export const metadata = {
  title: "Sample API keys · Beer Money",
  robots: { index: false, follow: false },
};

const saved: Partial<Record<ApiKeyProviderId, SavedKeyDisplay>> = {
  gemini: {
    hint: "Sample",
    addedOn: "Sample",
    lastTested: "Sample",
    status: keyStatusLabel({ lastTestedAt: "sample", lastTestOk: true }, true),
  },
  openai: {
    hint: "Sample",
    addedOn: "Sample",
    lastTested: "Sample",
    status: keyStatusLabel({ lastTestedAt: "sample", lastTestOk: false }, true),
  },
  anthropic: {
    hint: "Sample",
    addedOn: "Sample",
    lastTested: "Not yet",
    status: keyStatusLabel({ lastTestedAt: null, lastTestOk: null }, true),
  },
  firecrawl: {
    hint: "Sample",
    addedOn: "Sample",
    lastTested: "Not yet",
    status: keyStatusLabel({ lastTestedAt: null, lastTestOk: null }, false),
  },
};

export default function SampleApiKeysPage() {
  return (
    <AppShell activeHref="/dev/api-keys" homeHref="/dev/api-keys">
      <ApiKeysPanel saved={saved} notice={null} interactive={false} sample unavailable={null} />
    </AppShell>
  );
}

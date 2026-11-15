import { secretMatches } from "./secret";

export function notifyGate(input: {
  configuredSecret: string | undefined;
  header: string | null;
  vapidReady: boolean;
}): { status: 200 } | { status: 401 } | { status: 503 } {
  if (!input.configuredSecret) {
    return { status: 503 };
  }
  if (!secretMatches(input.header ?? "", input.configuredSecret)) {
    return { status: 401 };
  }
  if (!input.vapidReady) {
    return { status: 503 };
  }
  return { status: 200 };
}

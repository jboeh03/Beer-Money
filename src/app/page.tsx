import { AuthForm } from "@/components/auth-form";
import { SetupNotice } from "@/components/setup-notice";
import { SignedInShell } from "@/components/signed-in-shell";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  callback: "That sign-in link is invalid or expired.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = getPublicSupabaseEnv() !== null;
  const params = configured ? await searchParams : {};
  const errorCode = firstParam(params.error);
  const initialError = errorCode ? ERRORS[errorCode] : undefined;

  let email: string | null = null;
  let signedIn = false;
  let sessionError: string | undefined;

  if (configured) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getClaims();
      const missingSession =
        error?.name === "AuthSessionMissingError" ||
        /auth session missing/i.test(error?.message ?? "");

      if (data?.claims) {
        signedIn = true;
        email = typeof data.claims.email === "string" ? data.claims.email : null;
      } else if (error && !missingSession) {
        sessionError = "Could not check the session. Try again.";
      }
    } catch {
      sessionError = "Could not reach Supabase. Check the project URL and anon key.";
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <p className="text-sm text-amber-400">Beer Money</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
        {signedIn ? "You are signed in" : "Sign in"}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
        Single-user rewards dashboard. This version only handles sign-in.
      </p>
      {configured ? (
        signedIn ? (
          <SignedInShell email={email} />
        ) : (
          <AuthForm initialError={initialError ?? sessionError} />
        )
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

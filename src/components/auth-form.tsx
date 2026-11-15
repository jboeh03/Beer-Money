"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Intent = "sign-in" | "sign-up" | "magic-link";

function safeAuthMessage(message: string) {
  if (/eyJ|sb_secret|service_role|sb_publishable/i.test(message)) {
    return "Could not sign in.";
  }

  return message;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/50";

const primaryButtonClassName =
  "inline-flex h-11 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-medium text-zinc-950 outline-none hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex h-11 items-center justify-center rounded-md border border-zinc-600 px-4 text-sm font-medium text-zinc-100 outline-none hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60";

export function AuthForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function run(intent: Intent, form: HTMLFormElement) {
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setError("");
    setNotice("");

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (intent !== "magic-link" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);

    try {
      const supabase = createClient();

      if (intent === "magic-link") {
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
          },
        });

        if (signInError) {
          setError(safeAuthMessage(signInError.message));
          return;
        }

        setNotice("Check your email for a sign-in link.");
        return;
      }

      if (intent === "sign-up") {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
            },
          });

        if (signUpError) {
          setError(safeAuthMessage(signUpError.message));
          return;
        }

        if (signUpData.session) {
          router.replace("/today");
          return;
        }

        setNotice(
          "Account created. If email confirmation is on, use the message from Supabase before signing in.",
        );
        return;
      }

      const { error: passwordError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (passwordError) {
        setError(safeAuthMessage(passwordError.message));
        return;
      }

      router.replace("/today");
    } catch {
      setError("Could not reach Supabase. Check the project URL and anon key.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void run("sign-in", event.currentTarget);
      }}
    >
      <div>
        <label className="text-sm text-zinc-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm text-zinc-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          className={inputClassName}
        />
        <p className="mt-2 text-sm text-zinc-300">
          Password is required to sign in or create an account. A magic link
          only needs the email.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-zinc-200">
          {notice}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className={primaryButtonClassName} disabled={pending}>
          Sign in
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) {
              void run("sign-up", form);
            }
          }}
        >
          Create account
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) {
              void run("magic-link", form);
            }
          }}
        >
          Email me a link
        </button>
      </div>
    </form>
  );
}

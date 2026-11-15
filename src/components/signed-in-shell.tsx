import { signOut } from "@/app/auth/actions";

export function SignedInShell({ email }: { email: string | null }) {
  return (
    <section className="mt-8">
      <p className="text-sm text-zinc-300">
        {email ? `Signed in as ${email}` : "Signed in"}
      </p>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-medium text-zinc-950 outline-none hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Sign out
        </button>
      </form>
      <p className="mt-8 max-w-xl text-sm leading-6 text-zinc-300">
        Today, Opportunities, Best-offer matcher, Referral hub, and Content
        studio are not in this version. This screen only checks that auth is
        working.
      </p>
    </section>
  );
}

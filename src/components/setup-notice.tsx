export function SetupNotice() {
  return (
    <section className="mt-8 max-w-xl">
      <h2 className="text-lg font-medium text-zinc-100">Supabase is not configured</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        Add these names to <code>.env.local</code> and to the Vercel project.
        The service-role key stays server-only. Do not prefix it with{" "}
        <code>NEXT_PUBLIC_</code>.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-200">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY</li>
      </ul>
    </section>
  );
}

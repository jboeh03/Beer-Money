"use client";

import { useState } from "react";
import { deleteAccount, saveAccount } from "@/app/accounts/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AccountCadence } from "@/lib/database.types";
import { accountsByCategory, type AccountRecord } from "@/lib/accounts-model";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const CADENCE_LABELS: Record<AccountCadence, string> = {
  daily: "Daily",
  "24h": "24h from last claim",
  weekly: "Weekly",
  monthly: "Monthly",
  none: "None",
};

function AccountForm({ account, onDone }: { account: AccountRecord | null; onDone: () => void }) {
  return (
    <form action={saveAccount} className="space-y-3">
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <label className="block text-xs text-secondary">
        App name
        <input name="app_name" required defaultValue={account?.appName ?? ""} className={fieldClass} />
      </label>
      <label className="block text-xs text-secondary">
        Category
        <input
          name="category"
          required
          list="account-categories"
          defaultValue={account?.category ?? ""}
          className={fieldClass}
        />
        <datalist id="account-categories">
          <option value="Play-to-earn" />
          <option value="Offerwall" />
          <option value="Social casino" />
          <option value="Crypto" />
          <option value="Fintech" />
          <option value="Cashback" />
        </datalist>
      </label>
      <label className="block text-xs text-secondary">
        Username or handle
        <input name="username" defaultValue={account?.username ?? ""} className={fieldClass} />
      </label>
      <label className="block text-xs text-secondary">
        Referral link
        <input name="referral_url" type="url" defaultValue={account?.referralUrl ?? ""} className={fieldClass} />
      </label>
      <label className="block text-xs text-secondary">
        Referral code
        <input name="referral_code" defaultValue={account?.referralCode ?? ""} className={fieldClass} />
      </label>
      <label className="block text-xs text-secondary">
        Daily-bonus cadence
        <select name="cadence" defaultValue={account?.cadence ?? "none"} className={fieldClass}>
          {Object.entries(CADENCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-secondary">
        Notes
        <textarea name="notes" rows={3} defaultValue={account?.notes ?? ""} className={fieldClass} />
      </label>
      <div className="flex gap-2">
        <Button type="submit">{account ? "Save changes" : "Add account"}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AccountsBoard({
  accounts,
  error,
}: {
  accounts: AccountRecord[];
  error?: string;
}) {
  const [editing, setEditing] = useState<AccountRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const groups = accountsByCategory(accounts);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">My accounts</h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            App names, handles, referral links, and notes only. This page never stores passwords, seed
            phrases, private keys, or tokens.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setAdding(true); }}>Add account</Button>
      </header>
      {error ? (
        <p role="alert" className="text-sm text-negative">
          That entry was not saved. Do not put a password, seed phrase, private key, or token in any field.
        </p>
      ) : null}
      {adding || editing ? (
        <Card>
          <h2 className="text-sm font-semibold text-foreground">{editing ? "Edit account" : "New account"}</h2>
          <div className="mt-3">
            <AccountForm
              account={editing}
              onDone={() => {
                setAdding(false);
                setEditing(null);
              }}
            />
          </div>
        </Card>
      ) : null}
      {groups.length === 0 ? (
        <p className="text-sm text-secondary">No accounts yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">{group.category}</h2>
            {group.accounts.map((account) => (
              <Card key={account.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{account.appName}</h3>
                    <p className="mt-1 text-xs text-secondary">
                      {account.username ? `@${account.username} · ` : ""}
                      {CADENCE_LABELS[account.cadence]}
                    </p>
                    {account.referralCode ? (
                      <p className="mt-1 text-xs text-secondary">Code {account.referralCode}</p>
                    ) : null}
                    {account.notes ? <p className="mt-2 text-sm text-secondary">{account.notes}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setAdding(false); setEditing(account); }}>
                      Edit
                    </Button>
                    <form action={deleteAccount}>
                      <input type="hidden" name="id" value={account.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

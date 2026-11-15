import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migrationsDir = path.join(root, "supabase/migrations");
const appliedWithBug = "20261115223000_push_notifications.sql";
const fixMigration = "20261115230000_fix_notify_functions.sql";

test("migrations do not call pg_catalog.nullif or pg_catalog.coalesce", () => {
  const offenders: string[] = [];
  for (const name of readdirSync(migrationsDir)) {
    if (!name.endsWith(".sql") || name === appliedWithBug) continue;
    const text = readFileSync(path.join(migrationsDir, name), "utf8");
    if (/pg_catalog\.(nullif|coalesce)\s*\(/i.test(text)) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, []);

  const fix = readFileSync(path.join(migrationsDir, fixMigration), "utf8");
  assert.match(fix, /create or replace function private\.begin_owner_notifications/);
  assert.match(fix, /create or replace function private\.finish_owner_notification/);
  assert.match(fix, /security definer/);
  assert.match(fix, /set search_path = ''/);
  assert.match(fix, /\bnullif\(/);
  assert.match(fix, /\bcoalesce\(/);
  assert.match(fix, /grant execute on function private\.begin_owner_notifications\(text, text, text, text\) to service_role/);
  assert.match(
    fix,
    /revoke all on function private\.finish_owner_notification\(uuid, boolean, text, text\[\], text\[\]\) from public, anon, authenticated/,
  );
});

test("notify functions execute on Postgres", (t) => {
  const runner = postgresRunner();
  if (!runner) {
    t.skip("psql is not available");
    return;
  }
  const database = "beer_money_notify_test";
  const dropped = runner(["-d", "postgres", "-c", `drop database if exists ${database}`]);
  assert.equal(dropped.status, 0, dropped.stderr || dropped.stdout);
  const created = runner(["-d", "postgres", "-c", `create database ${database}`]);
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const executed = runner([
    "-d",
    database,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    path.join(root, "supabase/tests/notify_functions.sql"),
  ]);
  assert.equal(executed.status, 0, `${executed.stdout}\n${executed.stderr}`);
});

type PsqlResult = { status: number | null; stdout: string; stderr: string };

function postgresRunner(): ((args: string[]) => PsqlResult) | null {
  if (process.env.PGHOST) {
    const probe = runPsql(["-d", "postgres", "-c", "select 1"], true);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "psql could not reach PGHOST");
    }
    return (args) => runPsql(args, true);
  }

  const probe = runPsql(["-d", "postgres", "-c", "select 1"], false);
  if (probe.status !== 0) {
    return null;
  }
  return (args) => runPsql(args, false);
}

function runPsql(args: string[], remote: boolean): PsqlResult {
  const result = remote
    ? spawnSync("psql", args, { encoding: "utf8", env: process.env })
    : spawnSync("sudo", ["-n", "-u", "postgres", "psql", ...args], { encoding: "utf8" });
  return {
    status: result.status,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
}

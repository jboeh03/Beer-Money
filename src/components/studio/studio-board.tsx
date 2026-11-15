"use client";

import { useMemo, useState } from "react";
import { approveDrafts, createDraft, unschedulePost } from "@/app/content-studio/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CharCounter } from "@/components/ui/char-counter";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/cn";
import {
  columnsFor,
  draftIds,
  hasDisclosure,
  type PostRecord,
} from "@/lib/posts-model";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function stateLabel(state: PostRecord["approvalState"]) {
  if (state === "needs_review") return "Needs review";
  if (state === "approved") return "Approved";
  if (state === "scheduled") return "Scheduled";
  return "Draft";
}

function PostCard({
  post,
  sample,
  onReview,
}: {
  post: PostRecord;
  sample: boolean;
  onReview: (post: PostRecord) => void;
}) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{post.title || "Untitled draft"}</h3>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-secondary">
          {stateLabel(post.approvalState)}
        </span>
      </div>
      <p className="mt-3 text-sm text-secondary">{post.body}</p>
      <p className="mt-3 text-xs text-foreground">Disclosure: {post.disclosure}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {post.approvalState === "draft" && !sample ? (
          <form action={approveDrafts}>
            <input type="hidden" name="id" value={post.id} />
            <Button type="submit" variant="secondary" size="sm">
              Approve
            </Button>
          </form>
        ) : null}
        {post.approvalState === "needs_review" ? (
          <Button variant="secondary" size="sm" onClick={() => onReview(post)}>
            Review
          </Button>
        ) : null}
        {post.approvalState === "scheduled" && !sample ? (
          <form action={unschedulePost}>
            <input type="hidden" name="id" value={post.id} />
            <Button type="submit" variant="ghost" size="sm">
              Unschedule
            </Button>
          </form>
        ) : null}
        {post.approvalState === "approved" || post.approvalState === "scheduled" ? (
          <Button variant="ghost" size="sm" onClick={() => onReview(post)}>
            Edit
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function StudioBoard({
  rows,
  sample = false,
  error,
}: {
  rows: PostRecord[];
  sample?: boolean;
  error?: string;
}) {
  const [channel, setChannel] = useState("all");
  const [body, setBody] = useState("");
  const [review, setReview] = useState<PostRecord | null>(null);
  const channels = useMemo(() => ["all", ...new Set(rows.map((row) => row.channel))].sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b))), [rows]);
  const columns = columnsFor(rows, channel);
  const drafts = draftIds(columns.flatMap((column) => column.posts));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {sample ? (
            <p className="mb-3 inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
              SAMPLE DATA. These drafts were not posted. Not real accounts.
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Content studio</h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Drafts only. Nothing is posted. Every draft needs a referral disclosure that includes #ad.
          </p>
        </div>
        {sample ? (
          <Button href="/content-studio" variant="secondary">
            Hide sample data
          </Button>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {channels.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === channel}
            onClick={() => setChannel(item)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              item === channel
                ? "bg-accent text-accent-foreground"
                : "border border-border text-secondary hover:text-foreground",
            )}
          >
            {item === "all" ? "All channels" : item}
          </button>
        ))}
      </div>

      {drafts.length > 0 && !sample ? (
        <form action={approveDrafts}>
          {drafts.map((id) => (
            <input key={id} type="hidden" name="id" value={id} />
          ))}
          <Button type="submit" variant="secondary">
            Approve {drafts.length} draft{drafts.length === 1 ? "" : "s"}
          </Button>
        </form>
      ) : null}

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          className={cn(
            "grid items-stretch gap-4",
            columns.length > 1 && "md:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {columns.map((column) => (
            <section key={column.channel} className="flex h-full flex-col gap-3 rounded-lg border border-border p-4">
              <h2 className="text-sm font-semibold capitalize text-foreground">{column.channel}</h2>
              <p className="text-xs text-secondary">{column.posts.length} in this column</p>
              <div className="flex flex-1 flex-col gap-3">
                {column.posts.map((post) => (
                  <PostCard key={post.id} post={post} sample={sample} onReview={setReview} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-foreground">Before anything posts</h2>
            <p className="mt-2 text-sm text-secondary">
              You approve every draft. This app does not publish to X, Reddit, TikTok, or anywhere else.
              A disclosure with #ad is required before a draft can be saved.
            </p>
          </Card>
          <details className="rounded-lg border border-dashed border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              AI persona <span className="font-normal text-secondary">Later, phase 3</span>
            </summary>
            <p className="mt-2 text-sm text-secondary">
              Collapsed on purpose. Nothing here generates or posts copy.
            </p>
          </details>
        </div>
      </div>

      {sample ? (
        <p className="text-sm text-secondary">Sample drafts are not saved and cannot be approved.</p>
      ) : (
        <Card>
          <h2 className="text-sm font-semibold text-foreground">New draft</h2>
          <form action={createDraft} className="mt-3 space-y-3">
            <label className="block text-xs text-secondary">
              Channel
              <input name="channel" required defaultValue="x" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Title
              <input name="title" className={fieldClass} />
            </label>
            <label className="block text-xs text-secondary">
              Body
              <textarea
                name="body"
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className={fieldClass}
              />
            </label>
            <CharCounter value={body} max={280} label="X characters" />
            <label className="block text-xs text-secondary">
              Disclosure
              <input name="disclosure" required defaultValue="#ad" className={fieldClass} />
            </label>
            <p className="text-xs text-secondary">Must include #ad. Saving does not post it.</p>
            <Button type="submit" variant="secondary">
              Save draft
            </Button>
          </form>
        </Card>
      )}

      <Drawer open={review != null} title={review?.title || "Review draft"} onClose={() => setReview(null)}>
        {review ? (
          <div className="space-y-3 text-sm">
            <p className="text-secondary">
              Review does not approve this draft and does not post it.
            </p>
            <p className="text-foreground">{review.body}</p>
            <p className="text-xs text-foreground">Disclosure: {review.disclosure}</p>
            <p className="text-xs text-secondary">
              {hasDisclosure(review.disclosure) ? "Disclosure includes #ad." : "Missing #ad."}
            </p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

import type { PostApprovalState } from "@/lib/database.types";

export type PostRecord = {
  id: string;
  channel: string;
  title: string | null;
  body: string;
  approvalState: PostApprovalState;
  disclosure: string;
  scheduledFor: string | null;
};

export function hasDisclosure(value: string) {
  return value.toLowerCase().includes("#ad");
}

export function channelsOf(posts: readonly PostRecord[]) {
  return [...new Set(posts.map((post) => post.channel))].sort();
}

export function postsForChannel(posts: readonly PostRecord[], channel: string) {
  if (channel === "all") {
    return posts;
  }
  return posts.filter((post) => post.channel === channel);
}

export function columnsFor(posts: readonly PostRecord[], channel: string) {
  const visible = postsForChannel(posts, channel);
  const names = channel === "all" ? channelsOf(visible) : [channel];
  return names.map((name) => ({
    channel: name,
    posts: visible.filter((post) => post.channel === name),
  }));
}

export function draftIds(posts: readonly PostRecord[]) {
  return posts.filter((post) => post.approvalState === "draft").map((post) => post.id);
}

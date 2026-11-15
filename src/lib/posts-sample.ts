import type { PostRecord } from "@/lib/posts-model";

// Fictional drafts. Nothing here has been posted.
export function samplePosts(): PostRecord[] {
  return [
    {
      id: "sample-draft-x",
      channel: "x",
      title: "SAMPLE draft",
      body: "Fictional draft. Do not post this.",
      approvalState: "draft",
      disclosure: "#ad",
      scheduledFor: null,
    },
    {
      id: "sample-review-reddit",
      channel: "reddit",
      title: "SAMPLE needs review",
      body: "Fictional copy waiting for a person to review it. #ad",
      approvalState: "needs_review",
      disclosure: "Fictional referral disclosure. #ad",
      scheduledFor: null,
    },
    {
      id: "sample-approved-x",
      channel: "x",
      title: "SAMPLE approved",
      body: "Fictional approved copy. Still not posted anywhere. #ad",
      approvalState: "approved",
      disclosure: "#ad",
      scheduledFor: null,
    },
    {
      id: "sample-scheduled-tiktok",
      channel: "tiktok",
      title: "SAMPLE scheduled",
      body: "Fictional scheduled copy. This app will not publish it. #ad",
      approvalState: "scheduled",
      disclosure: "#ad",
      scheduledFor: "2026-12-01T15:00:00.000Z",
    },
  ];
}

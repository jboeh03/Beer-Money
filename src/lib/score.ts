export type ScoreTone = "low" | "mid" | "high";

// Red below 50, amber 50–74, green 75 and up.
export function scoreTone(score: number): ScoreTone {
  if (score < 50) {
    return "low";
  }

  if (score < 75) {
    return "mid";
  }

  return "high";
}

export function scoreLabel(tone: ScoreTone) {
  if (tone === "low") {
    return "below 50";
  }

  if (tone === "mid") {
    return "50 to 74";
  }

  return "75 or above";
}

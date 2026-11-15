import { scoreLabel, scoreTone } from "@/lib/score";
import { cn } from "@/lib/cn";

const tones = {
  low: "text-score-low",
  mid: "text-score-mid",
  high: "text-score-high",
};

export function ScoreBadge({ score }: { score: number }) {
  const tone = scoreTone(score);
  const range = scoreLabel(tone);

  return (
    <span className={cn("text-sm font-semibold tabular-nums", tones[tone])}>
      {score}
      <span className="sr-only">, vetter score {range}</span>
    </span>
  );
}

import { formatUserDateTimeWithSeconds } from "../components/common/dateTimePreferences";

/**
 * Time of the previous line written to the Output log. Module scope on
 * purpose: the log is one shared box, written from both MainPage (krafting)
 * and Output (sending), so every line is measured against whatever line was
 * written last, whichever flow produced it.
 */
let lastLineAt: number | null = null;

/**
 * Forget the previous line's time. Call this when the log is cleared or a new
 * run starts, so the first line of the next run has nothing stale to measure
 * against.
 */
export const resetOutputLogClock = (): void => {
  lastLineAt = null;
};

/**
 * Timestamp prefix for one Output-log line, carrying the time the step took —
 * the gap between this line and the line before it:
 *
 *   [20.04.2025 13:27:02] (1s)
 *
 * The first line after a reset has no preceding step, so it gets no duration.
 *
 * Call it once per line and keep the result in a variable before handing it to
 * setOutputForm: calling it inside a state updater would re-stamp the line
 * whenever React re-runs the updater (it does so twice in StrictMode) and
 * every duration would come out as 0s.
 */
export const outputLogStamp = (at: Date = new Date()): string => {
  const now = at.getTime();
  const elapsedMs = lastLineAt === null ? null : now - lastLineAt;
  lastLineAt = now;

  const timestamp = `[${formatUserDateTimeWithSeconds(at)}]`;

  if (elapsedMs === null) {
    return timestamp;
  }

  return `${timestamp} (${Math.max(0, Math.round(elapsedMs / 1000))}s)`;
};

/**
 * "(5) Aalijah Foster" — the contact's 1-based position in the list being
 * processed, so a log line can be tied back to a row. Falls back to the bare
 * name when the position is unknown.
 */
export const contactLogLabel = (
  position: number | null | undefined,
  name?: string | null,
): string => {
  const displayName = name ?? "";
  return typeof position === "number" && position > 0
    ? `(${position}) ${displayName}`
    : `${displayName}`;
};

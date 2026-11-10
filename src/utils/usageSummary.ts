/**
 * The admin usage box: what one kraft run cost, which models were billed for
 * it, and how it averages out per contact.
 *
 * Shape and formatting live here so MainPage (which produces the numbers) and
 * the two places that render the box (the Kraft emails header and the kraft
 * side panel) cannot drift apart.
 */

/** One model's share of a run: what it was billed for across all its calls. */
export interface ModelUsage {
  /** Provider model id, e.g. "gpt-5.1", "deepseek-chat", "qwen-plus". */
  model: string;
  tokens: number;
  cost: number;
  /** API calls billed to this model. */
  calls: number;
}

export interface UsageLeg {
  tokens: number;
  cost: number;
  /** Wall-clock time the work took, when it was measured. */
  durationMs: number;
  models: ModelUsage[];
}

export interface UsageSummary {
  /** The most recent contact. */
  last: UsageLeg & { emails: number };
  /** Per contact over the session: total divided by emails krafted. */
  average: UsageLeg;
  /** Everything since the counters were last cleared. */
  total: UsageLeg & { emails: number };
}

const toNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeModels = (value: unknown): ModelUsage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: any) => ({
      model: String(entry?.model ?? "").trim(),
      tokens: toNumber(entry?.tokens),
      cost: toNumber(entry?.cost),
      calls: toNumber(entry?.calls),
    }))
    .filter((entry) => entry.model !== "");
};

const normalizeLeg = (value: any): UsageLeg => ({
  tokens: toNumber(value?.tokens),
  cost: toNumber(value?.cost),
  durationMs: toNumber(value?.durationMs),
  models: normalizeModels(value?.models),
});

/**
 * Parse the JSON string carried on outputForm.usage.
 *
 * Older runs (and anything still writing the previous two-line shape) have no
 * `average` and no model breakdown; those come back as empty rather than
 * missing, and the average is derived from the totals so a box opened on a
 * pre-existing session still adds up.
 */
export const parseUsageSummary = (raw?: string | null): UsageSummary | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    const last = { ...normalizeLeg(parsed?.last), emails: toNumber(parsed?.last?.emails) };
    const total = { ...normalizeLeg(parsed?.total), emails: toNumber(parsed?.total?.emails) };

    const average = parsed?.average
      ? normalizeLeg(parsed.average)
      : {
          // Derived, so a usage string written before averages existed still
          // fills the middle line instead of showing zeros.
          tokens: total.emails > 0 ? total.tokens / total.emails : 0,
          cost: total.emails > 0 ? total.cost / total.emails : 0,
          durationMs: total.emails > 0 ? total.durationMs / total.emails : 0,
          models: total.models,
        };

    return { last, average, total };
  } catch {
    return null;
  }
};

/**
 * The provider's model id exactly as it was billed — "gpt-5.1",
 * "deepseek-chat", "qwen-plus-2025-09-11". Shown in full: a shortened code
 * cannot be matched against a provider's invoice or against the ids in
 * Settings > AI models, which is what this box is read for.
 */
export const formatModelName = (model?: string | null): string => {
  const name = (model ?? "").trim();
  return name || "-";
};

/** "gpt-5.1 + qwen-plus" — every model billed for a leg, dearest first. */
export const formatModelNames = (models: ModelUsage[]): string => {
  if (!models.length) return "-";

  return models
    .slice()
    .sort((a, b) => b.cost - a.cost)
    .map((entry) => formatModelName(entry.model))
    .join(" + ");
};

/** Dollars, at the precision the per-contact figures need. */
export const formatUsageCost = (cost: number): string => cost.toFixed(6);

/**
 * Tokens, rounded — an average is rarely a whole number. Plain digits with no
 * grouping: the box is read against the layout "T:33598", and toLocaleString
 * would group them by the browser's locale (1,23,456 on an Indian locale).
 */
export const formatUsageTokens = (tokens: number): string =>
  String(Math.round(tokens));

/**
 * Wall-clock time per contact: seconds up to a minute, then m:ss. Zero means
 * nothing was timed (an older run, or a contact that was skipped), so it reads
 * as "-" rather than "0s".
 */
export const formatUsageDuration = (durationMs: number): string => {
  if (!durationMs || durationMs <= 0) return "-";

  const totalSeconds = durationMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds < 10 ? totalSeconds.toFixed(1) : Math.round(totalSeconds)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

/**
 * Merge one call's models into a running tally, summing tokens, cost and call
 * count per model id.
 */
export const mergeModelUsage = (
  into: ModelUsage[],
  additions: ModelUsage[],
): ModelUsage[] => {
  const merged = into.map((entry) => ({ ...entry }));

  additions.forEach((addition) => {
    if (!addition.model) return;
    const existing = merged.find((entry) => entry.model === addition.model);
    if (existing) {
      existing.tokens += addition.tokens;
      existing.cost += addition.cost;
      existing.calls += addition.calls;
    } else {
      merged.push({ ...addition });
    }
  });

  return merged;
};

/** Per-contact figures: a total spread over the emails that produced it. */
export const averageLeg = (total: UsageLeg, emails: number): UsageLeg => {
  if (emails <= 0) {
    return { tokens: 0, cost: 0, durationMs: 0, models: total.models };
  }

  return {
    tokens: total.tokens / emails,
    cost: total.cost / emails,
    durationMs: total.durationMs / emails,
    // Averaging the models too, so the breakdown reads per contact like the
    // rest of the line.
    models: total.models.map((entry) => ({
      model: entry.model,
      tokens: entry.tokens / emails,
      cost: entry.cost / emails,
      calls: entry.calls / emails,
    })),
  };
};

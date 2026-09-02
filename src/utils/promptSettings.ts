import API_BASE_URL from "../config";

/**
 * Admin-editable AI instructions. The prompts used to be constants in the API
 * (Model/FindEmailPrompt.cs and friends); they now live only in
 * app_prompt_settings and are served by `/api/prompt-settings`, so an admin can
 * change one from Settings > Admin > Prompts without a deploy. There is no
 * compiled-in copy behind them: a prompt nobody has saved is simply empty, and
 * the feature it drives is off until someone writes one.
 */
/**
 * A prompt key as served by the API. Deliberately a plain string rather than a
 * union of the keys this build knows: PromptKeys.cs on the server is the
 * source of truth, and an allowlist here silently hid every prompt added
 * since this file was last edited.
 */
export type PromptKey = string;

export interface PromptSetting {
  promptKey: PromptKey;
  label: string;
  description: string;
  /** The stored text the API sends to the model. Empty when nothing is saved. */
  promptText: string;
  /** False while the prompt is empty, i.e. the feature behind it is off. */
  isConfigured: boolean;
  /** Placeholders the text may use, e.g. `{full_name}`. */
  placeholders: string[];
  updatedAt: string | null;
  updatedBy: string | null;
}

// Order the admin page renders the prompts in. Anything the API returns that
// isn't listed here still renders, after these.
export const PROMPT_KEY_ORDER: PromptKey[] = ["find_email"];

/** Unlisted keys sort last — indexOf gives -1, which would float them first. */
const rankPrompt = (promptKey: string) => {
  const index = PROMPT_KEY_ORDER.indexOf(promptKey);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

/**
 * Every prompt the API returns is kept. It already sends a label, a
 * description and the placeholder list for each, so a prompt this build has
 * never heard of still renders and edits correctly.
 */
const normalizePrompt = (raw: any): PromptSetting | null => {
  const promptKey = String(raw?.promptKey ?? raw?.PromptKey ?? "").trim();
  if (!promptKey) return null;

  const promptText = String(raw?.promptText ?? raw?.PromptText ?? "");

  return {
    promptKey,
    label: raw?.label || raw?.Label || promptKey,
    description: raw?.description || raw?.Description || "",
    promptText,
    // The API sends this, but derive it too so the flag stays right whatever
    // casing or build answers.
    isConfigured:
      raw?.isConfigured ?? raw?.IsConfigured ?? promptText.trim().length > 0,
    placeholders: raw?.placeholders || raw?.Placeholders || [],
    updatedAt: raw?.updatedAt ?? raw?.UpdatedAt ?? null,
    updatedBy: raw?.updatedBy ?? raw?.UpdatedBy ?? null,
  };
};

export const fetchPromptSettings = async (): Promise<PromptSetting[]> => {
  const response = await fetch(`${API_BASE_URL}/api/prompt-settings`, {
    headers: { accept: "application/json" },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || json?.Message || "Failed to load prompt settings.",
    );
  }

  const rawPrompts: any[] = json?.prompts || json?.Prompts || [];
  const prompts = rawPrompts
    .map(normalizePrompt)
    .filter((prompt): prompt is PromptSetting => prompt !== null);

  // Keep the page order stable regardless of what the API returns.
  prompts.sort(
    (left, right) =>
      rankPrompt(left.promptKey) - rankPrompt(right.promptKey),
  );

  return prompts;
};

/** Saves one or more prompts. A blank text clears that prompt. */
export const savePromptSettings = async (
  prompts: Record<string, string>,
  updatedBy?: string,
): Promise<PromptSetting[]> => {
  const response = await fetch(`${API_BASE_URL}/api/prompt-settings`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompts, updatedBy }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || json?.Message || "Failed to save prompt settings.",
    );
  }

  const rawPrompts: any[] = json?.prompts || json?.Prompts || [];

  return rawPrompts
    .map(normalizePrompt)
    .filter((prompt): prompt is PromptSetting => prompt !== null);
};

/** Placeholders the editor should warn about when they go missing. */
export const findMissingPlaceholders = (
  promptText: string,
  placeholders: string[],
) => placeholders.filter((placeholder) => !promptText.includes(placeholder));

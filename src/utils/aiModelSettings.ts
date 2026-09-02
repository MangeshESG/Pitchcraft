import API_BASE_URL from "../config";
import { AVAILABLE_AI_MODELS } from "./aiModels";

/**
 * Admin-controlled model per AI purpose. The models used to be hardcoded in the
 * components that called them (Q&A, blueprint builder, kraft, web search); they
 * now all come from Settings > AI models via `/api/ai-model-settings`.
 */
export type AiModelPurposeKey =
  | "web_search"
  | "blueprint_generation"
  | "email_generation"
  | "contact_qa"
  | "find_email"
  | "profile_summary";

export interface AiModelSetting {
  /**
   * Whatever key the API returned. Deliberately a plain string, not a union
   * of the keys this build happens to know: the backend registry is the
   * source of truth for which purposes exist, and a frontend allowlist here
   * silently hid every purpose added since this file was last edited.
   */
  purposeKey: string;
  label: string;
  description: string;
  modelName: string;
  defaultModel: string;
  /**
   * False when the API did not return this purpose — i.e. the frontend knows
   * about a purpose the deployed backend does not have yet. It is still shown,
   * but read-only: sending it would make the API reject the whole save with
   * "Unknown purpose key(s)".
   */
  supportedByApi: boolean;
}

export interface AiModelSettingsResponse {
  settings: AiModelSetting[];
  /** Model ids the API can actually bill — empty when rates aren't configured. */
  availableModels: string[];
}

// Order the admin page renders the purposes in.
export const AI_MODEL_PURPOSE_ORDER: AiModelPurposeKey[] = [
  "web_search",
  "blueprint_generation",
  "email_generation",
  "contact_qa",
  "find_email",
  "profile_summary",
];

// Used only when the API can't be reached, so the page still renders something
// meaningful instead of an empty form.
const FALLBACK_SETTINGS: Record<
  AiModelPurposeKey,
  { label: string; description: string; defaultModel: string }
> = {
  web_search: {
    label: "Web search",
    description:
      "Runs the research step that fills {web_searched_data} and the contact Insights panel.",
    defaultModel: "gpt-5.6-luna",
  },
  blueprint_generation: {
    label: "Blueprint generation",
    description:
      "Powers the blueprint builder conversation and example-output generation.",
    defaultModel: "gpt-5.1",
  },
  email_generation: {
    label: "Email generation",
    description:
      "Writes email bodies and subject lines when a contact is krafted.",
    defaultModel: "deepseek-v4-flash",
  },
  contact_qa: {
    label: "Contact Q&A",
    description:
      "Answers questions asked on a contact profile from CRM context.",
    defaultModel: "gpt-4o-mini",
  },
  find_email: {
    label: "Find email (AI)",
    description:
      "Researches a person's professional email address from public sources.",
    defaultModel: "gpt-5.6-luna",
  },
  profile_summary: {
    label: "Profile summary (extension)",
    description:
      "Writes the professional summary from the LinkedIn profile the browser extension captured.",
    defaultModel: "gpt-5.6-luna",
  },
};

const isPurposeKey = (value: string): value is AiModelPurposeKey =>
  AI_MODEL_PURPOSE_ORDER.includes(value as AiModelPurposeKey);

/**
 * One setting from the API. Any purpose with a key is kept, known to this
 * build or not — the API already sends a label, a description and a default
 * for everything it serves, so an unrecognised purpose renders perfectly well
 * from its own metadata. The local table is only a fallback for the fields an
 * older API might omit.
 */
const normalizeSetting = (raw: any): AiModelSetting | null => {
  const purposeKey = String(raw?.purposeKey ?? raw?.PurposeKey ?? "").trim();
  if (!purposeKey) return null;

  const fallback = isPurposeKey(purposeKey)
    ? FALLBACK_SETTINGS[purposeKey]
    : undefined;

  return {
    purposeKey,
    label: raw?.label || raw?.Label || fallback?.label || purposeKey,
    description: raw?.description || raw?.Description || fallback?.description || "",
    modelName:
      raw?.modelName || raw?.ModelName || fallback?.defaultModel || "",
    defaultModel:
      raw?.defaultModel || raw?.DefaultModel || fallback?.defaultModel || "",
    supportedByApi: true,
  };
};

export const buildFallbackSettings = (): AiModelSetting[] =>
  AI_MODEL_PURPOSE_ORDER.map((purposeKey) => ({
    purposeKey,
    ...FALLBACK_SETTINGS[purposeKey],
    modelName: FALLBACK_SETTINGS[purposeKey].defaultModel,
    supportedByApi: true,
  }));

export const fetchAiModelSettings =
  async (): Promise<AiModelSettingsResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/ai-model-settings`, {
      headers: { accept: "application/json" },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        json?.message || json?.Message || "Failed to load AI model settings.",
      );
    }

    const rawSettings: any[] = json?.settings || json?.Settings || [];
    const settings = rawSettings
      .map(normalizeSetting)
      .filter((setting): setting is AiModelSetting => setting !== null);

    // A purpose this build knows about but the deployed API doesn't return yet
    // is still listed, so the page shows the whole set instead of silently
    // hiding one. It is flagged so the UI can keep it read-only.
    AI_MODEL_PURPOSE_ORDER.filter(
      (purposeKey) => !settings.some((setting) => setting.purposeKey === purposeKey),
    ).forEach((purposeKey) =>
      settings.push({
        purposeKey,
        ...FALLBACK_SETTINGS[purposeKey],
        modelName: FALLBACK_SETTINGS[purposeKey].defaultModel,
        supportedByApi: false,
      }),
    );

    // Keep the page order stable regardless of what the API returns. A key
    // this build does not list sorts after the ones it does — indexOf gives
    // -1 for those, which would otherwise float them to the top.
    const rank = (purposeKey: string) => {
      const index = AI_MODEL_PURPOSE_ORDER.indexOf(purposeKey as AiModelPurposeKey);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };

    settings.sort((left, right) => rank(left.purposeKey) - rank(right.purposeKey));

    return {
      settings: settings.length > 0 ? settings : buildFallbackSettings(),
      availableModels: json?.availableModels || json?.AvailableModels || [],
    };
  };

export const saveAiModelSettings = async (
  settings: Record<string, string>,
  updatedBy?: string,
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/ai-model-settings`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ settings, updatedBy }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || json?.Message || "Failed to save AI model settings.",
    );
  }
};

/**
 * Label for a model id. Falls back to the raw id so a model configured on the
 * server but missing from the local list still reads sensibly.
 */
export const getModelLabel = (modelId: string) =>
  AVAILABLE_AI_MODELS.find((model) => model.id === modelId)?.name || modelId;

/**
 * Options for the picker: every locally known model, plus anything the server
 * reports as priced that we don't know about. When the server returns a priced
 * list, models missing from it are dropped — generation would fail on them.
 */
export const buildModelOptions = (availableModels: string[]) => {
  const known = AVAILABLE_AI_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    description: model.description,
  }));

  if (!availableModels || availableModels.length === 0) {
    return known;
  }

  const priced = new Set(availableModels);
  const options = known.filter((model) => priced.has(model.id));

  availableModels
    .filter((modelId) => !known.some((model) => model.id === modelId))
    .forEach((modelId) =>
      options.push({ id: modelId, name: modelId, description: "" }),
    );

  return options;
};

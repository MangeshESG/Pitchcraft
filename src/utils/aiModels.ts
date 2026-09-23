export const OPENAI_MODELS = [
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "Flagship model in the 4.1 family",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    description: "Faster, lighter version of 4.1",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 nano",
    description: "Smallest, fastest, lowest-cost variant",
  },
  { id: "gpt-4o", name: "GPT-4o", description: "Standard GPT-4 Optimized" },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Efficient GPT-4o model",
  },
  { id: "gpt-5", name: "GPT-5", description: "Standard flagship model" },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    description: "Adaptive-reasoning flagship update to the GPT-5 series",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Lightweight, efficient, cost-effective",
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    description: "Ultra-fast, minimal resource usage",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    description: "Deepest reasoning tier of the 5.6 family",
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    description: "Balanced capability and cost tier",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    description: "Fastest, lowest-cost tier",
  },
  {
    id: "gpt-6-astra",
    name: "GPT-6 Astra",
    description:
      "GPT-6 flagship. Always reasons, so it is the slowest and dearest of the three and needs a high MaxTokens",
  },
  {
    id: "gpt-6-sol",
    name: "GPT-6 Sol",
    description: "GPT-6 balanced tier, about a fifth of Astra's price",
  },
  {
    id: "gpt-6-luna",
    name: "GPT-6 Luna",
    description:
      "GPT-6 fastest, lowest-cost tier — around half the price of 5.6 Luna",
  },
];

export const DEEPSEEK_MODELS = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    description: "DeepSeek general chat model",
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    description: "DeepSeek reasoning model",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    description: "DeepSeek fast V4 model with thinking disabled",
  },
  {
    id: "deepseek-v4-flash-thinking",
    name: "DeepSeek V4 Flash Thinking",
    description: "DeepSeek fast V4 model with thinking enabled",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "DeepSeek higher-capability V4 model with thinking disabled",
  },
  {
    id: "deepseek-v4-pro-thinking",
    name: "DeepSeek V4 Pro Thinking",
    description: "DeepSeek higher-capability V4 model with thinking enabled",
  },
];

// Which of these an admin can actually pick is decided by the ModelRates rows,
// not by this list — buildModelOptions drops anything the server has no price
// for. That matters here because web search is not available on every model in
// every Model Studio region: outside Singapore and Beijing only the 3.8 series
// can search, so the 3.6 entries below are listed but stay hidden unless they
// are priced.
export const QWEN_MODELS = [
  {
    id: "qwen3.8-max",
    name: "Qwen 3.8 Max",
    description: "Qwen flagship, highest capability, with server-side web search",
  },
  {
    id: "qwen3.8-max-thinking",
    name: "Qwen 3.8 Max Thinking",
    description: "Qwen flagship with reasoning enabled",
  },
  {
    id: "qwen3.8-flash",
    name: "Qwen 3.8 Flash",
    description: "Qwen fast, low-cost model with server-side web search",
  },
  {
    id: "qwen3.8-flash-thinking",
    name: "Qwen 3.8 Flash Thinking",
    description: "Qwen fast model with reasoning enabled",
  },
  {
    id: "qwen3.6-plus",
    name: "Qwen 3.6 Plus",
    description: "Qwen flagship with server-side web search",
  },
  {
    id: "qwen3.6-plus-thinking",
    name: "Qwen 3.6 Plus Thinking",
    description: "Qwen flagship with reasoning enabled",
  },
  {
    id: "qwen3.6-flash",
    name: "Qwen 3.6 Flash",
    description: "Qwen fast, low-cost model with server-side web search",
  },
  {
    id: "qwen3.6-flash-thinking",
    name: "Qwen 3.6 Flash Thinking",
    description: "Qwen fast model with reasoning enabled",
  },
];

export const AVAILABLE_AI_MODELS = [
  ...OPENAI_MODELS,
  ...DEEPSEEK_MODELS,
  ...QWEN_MODELS,
];

export const isDeepSeekModel = (modelName?: string | null) =>
  Boolean(modelName?.toLowerCase().startsWith("deepseek-"));

// No trailing hyphen, unlike the DeepSeek test above: Qwen ids are not uniform
// about it ("qwen-plus" but "qwen3.6-plus"), so requiring one would miss half
// the line. This has to agree with IsQwenModel in the API, which routes on the
// same bare "qwen" prefix.
export const isQwenModel = (modelName?: string | null) =>
  Boolean(modelName?.toLowerCase().startsWith("qwen"));

export type ModelProvider = "OpenAI" | "DeepSeek" | "Qwen";

/**
 * Which provider serves a model id. Derived from the id rather than from the
 * lists above so a model the server prices but this build has never heard of
 * still lands in the right group instead of falling out of the picker.
 */
export const getModelProvider = (modelName?: string | null): ModelProvider =>
  isDeepSeekModel(modelName) ? "DeepSeek"
  : isQwenModel(modelName) ? "Qwen"
  : "OpenAI";

// Order the providers appear in the model picker.
export const MODEL_PROVIDER_ORDER: ModelProvider[] = [
  "OpenAI",
  "DeepSeek",
  "Qwen",
];

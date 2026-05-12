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
    description: "DeepSeek fast V4 model",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "DeepSeek higher-capability V4 model",
  },
];

export const AVAILABLE_AI_MODELS = [...OPENAI_MODELS, ...DEEPSEEK_MODELS];

export const isDeepSeekModel = (modelName?: string | null) =>
  Boolean(modelName?.toLowerCase().startsWith("deepseek-"));

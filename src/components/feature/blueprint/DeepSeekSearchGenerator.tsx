import React, { useMemo, useState } from "react";
import axios from "axios";
import DOMPurify from "dompurify";
import API_BASE_URL from "../../../config";
import { useModel } from "../../../ModelContext";
import "./DeepSeekSearchGenerator.css";

const WEB_SEARCH_PLACEHOLDER = "{web_searched_data}";
const DEEPSEEK_SUPPORTED_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

interface UsageInfo {
  PromptTokens?: number;
  CompletionTokens?: number;
  TotalTokens?: number;
  CurrentCost?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  currentCost?: number;
}

interface GenerateWithSearchResponse {
  Provider?: string;
  Model?: string;
  TavilySearchTerm?: string;
  WebSearchData?: string;
  FinalPrompt?: string;
  Response?: string;
  Usage?: UsageInfo;
  provider?: string;
  model?: string;
  tavilySearchTerm?: string;
  webSearchData?: string;
  finalPrompt?: string;
  response?: string;
  usage?: UsageInfo;
}

const defaultPrompt = `Write a personalized outbound email using the web research below.

Web research:
${WEB_SEARCH_PLACEHOLDER}

Email requirements:
- Keep it concise.
- Mention one relevant insight from the web research.
- End with a clear call to action.`;

const DeepSeekSearchGenerator: React.FC = () => {
  const { selectedModelName } = useModel();
  const initialModelName = DEEPSEEK_SUPPORTED_MODELS.some(
    (model) => model.value === selectedModelName,
  )
    ? selectedModelName
    : "deepseek-chat";
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [modelName, setModelName] = useState(initialModelName);
  const [searchTerm, setSearchTerm] = useState("");
  const [result, setResult] = useState<GenerateWithSearchResponse | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const usage = result?.Usage ?? result?.usage;
  const generatedEmail = result?.Response ?? result?.response ?? "";
  const sanitizedGeneratedEmail = useMemo(
    () => DOMPurify.sanitize(generatedEmail),
    [generatedEmail],
  );
  const webSearchData = result?.WebSearchData ?? result?.webSearchData ?? "";
  const promptTokens = usage?.PromptTokens ?? usage?.promptTokens ?? 0;
  const completionTokens =
    usage?.CompletionTokens ?? usage?.completionTokens ?? 0;
  const totalTokens = usage?.TotalTokens ?? usage?.totalTokens ?? 0;
  const currentCost = usage?.CurrentCost ?? usage?.currentCost ?? 0;

  const canSubmit = useMemo(
    () =>
      prompt.trim().length > 0 &&
      modelName.trim().length > 0 &&
      searchTerm.trim().length > 0 &&
      prompt.includes(WEB_SEARCH_PLACEHOLDER) &&
      !isGenerating,
    [prompt, modelName, searchTerm, isGenerating],
  );

  const insertPlaceholder = () => {
    if (prompt.includes(WEB_SEARCH_PLACEHOLDER)) return;
    setPrompt((current) =>
      current.trim()
        ? `${current.trim()}\n\nWeb research:\n${WEB_SEARCH_PLACEHOLDER}`
        : WEB_SEARCH_PLACEHOLDER,
    );
  };

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!prompt.includes(WEB_SEARCH_PLACEHOLDER)) {
      setError(`Prompt must include ${WEB_SEARCH_PLACEHOLDER}.`);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post<GenerateWithSearchResponse>(
        `${API_BASE_URL}/api/auth/deepseek/generate-with-search`,
        {
          Prompt: prompt,
          ModelName: modelName,
          TavilySearchTerm: searchTerm,
        },
      );

      setResult(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { Message?: string; Error?: string; message?: string }
          | undefined;
        setError(
          data?.Message ||
            data?.message ||
            data?.Error ||
            err.message ||
            "Generation failed.",
        );
      } else {
        setError("Generation failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="deepseek-search-generator">
      <div className="deepseek-search-header">
        <div>
          <h1 className="deepseek-search-title">DeepSeek Search Generator</h1>
          <p className="deepseek-search-subtitle">
            Generate an email from a prompt, model, and Tavily search term.
          </p>
        </div>
      </div>

      <div className="deepseek-placeholder-note">
        Use <code>{WEB_SEARCH_PLACEHOLDER}</code> in the prompt where the web
        searched data should be inserted.
      </div>

      <form className="deepseek-search-grid" onSubmit={handleGenerate}>
        <div className="deepseek-search-panel">
          <div className="deepseek-field">
            <label htmlFor="deepseek-prompt">Prompt</label>
            <textarea
              id="deepseek-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={`Include ${WEB_SEARCH_PLACEHOLDER} where search data should go`}
            />
          </div>

          <div className="deepseek-form-actions">
            <button
              className="deepseek-secondary-button"
              type="button"
              onClick={insertPlaceholder}
            >
              Insert placeholder
            </button>
            <button
              className="deepseek-primary-button"
              type="submit"
              disabled={!canSubmit}
            >
              {isGenerating ? "Generating..." : "Generate email"}
            </button>
          </div>
        </div>

        <div className="deepseek-search-panel">
          <div className="deepseek-field">
            <label htmlFor="deepseek-model">Model</label>
            <select
              id="deepseek-model"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
            >
              {DEEPSEEK_SUPPORTED_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="deepseek-field">
            <label htmlFor="deepseek-search-term">Search term</label>
            <input
              id="deepseek-search-term"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Company name, topic, or prospect research query"
            />
          </div>

          {error && <div className="deepseek-error">{error}</div>}
        </div>
      </form>

      {result && (
        <>
          <div className="deepseek-usage">
            <div className="deepseek-usage-item">
              <span className="deepseek-usage-label">Prompt tokens</span>
              <span className="deepseek-usage-value">{promptTokens}</span>
            </div>
            <div className="deepseek-usage-item">
              <span className="deepseek-usage-label">Completion tokens</span>
              <span className="deepseek-usage-value">{completionTokens}</span>
            </div>
            <div className="deepseek-usage-item">
              <span className="deepseek-usage-label">Total tokens</span>
              <span className="deepseek-usage-value">{totalTokens}</span>
            </div>
            <div className="deepseek-usage-item">
              <span className="deepseek-usage-label">Cost</span>
              <span className="deepseek-usage-value">
                ${Number(currentCost).toFixed(6)}
              </span>
            </div>
          </div>

          <div className="deepseek-results">
            <section className="deepseek-output-box">
              <div className="deepseek-output-heading">Generated email</div>
              <div
                className="deepseek-email-preview"
                dangerouslySetInnerHTML={{ __html: sanitizedGeneratedEmail }}
              />
            </section>

            <section className="deepseek-output-box">
              <div className="deepseek-output-heading">Web searched data</div>
              <div className="deepseek-output-content">{webSearchData}</div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default DeepSeekSearchGenerator;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AiModelSetting,
  buildFallbackSettings,
  buildModelOptions,
  fetchAiModelSettings,
  getModelLabel,
  saveAiModelSettings,
} from "../../utils/aiModelSettings";
import {
  bannerClass,
  cardClass,
  hintClass,
  inputClass,
  labelClass,
  pageBodyClass,
  pageClass,
  pageHeaderClass,
  pageSubClass,
  pageTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "../common/settingsStyles";

/**
 * Admin-only page: one model picker per AI purpose. Every API that calls a
 * model reads its model from here, so these four selects are the only place a
 * model is chosen in the product.
 */
const AiModelSettings: React.FC = () => {
  const [settings, setSettings] = useState<AiModelSetting[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchAiModelSettings();
      setSettings(response.settings);
      setAvailableModels(response.availableModels);
      setDraft(
        Object.fromEntries(
          response.settings.map((setting) => [
            setting.purposeKey,
            setting.modelName,
          ]),
        ),
      );
    } catch (error: any) {
      const fallback = buildFallbackSettings();
      setSettings(fallback);
      setDraft(
        Object.fromEntries(
          fallback.map((setting) => [setting.purposeKey, setting.modelName]),
        ),
      );
      setBanner({
        type: "error",
        text:
          error?.message ||
          "Could not load AI model settings. Showing built-in defaults.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const modelOptions = useMemo(
    () => buildModelOptions(availableModels),
    [availableModels],
  );

  const hasChanges = useMemo(
    () =>
      settings.some(
        (setting) => draft[setting.purposeKey] !== setting.modelName,
      ),
    [draft, settings],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setBanner(null);

    try {
      await saveAiModelSettings(
        draft,
        sessionStorage.getItem("clientId") || undefined,
      );
      setSettings((previous) =>
        previous.map((setting) => ({
          ...setting,
          modelName: draft[setting.purposeKey] ?? setting.modelName,
        })),
      );
      setBanner({ type: "success", text: "AI model settings saved." });
    } catch (error: any) {
      setBanner({
        type: "error",
        text: error?.message || "Could not save AI model settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setDraft(
      Object.fromEntries(
        settings.map((setting) => [setting.purposeKey, setting.defaultModel]),
      ),
    );
  };

  return (
    <div className={pageClass}>
      <div className={pageHeaderClass}>
        <h1 className={pageTitleClass}>AI models</h1>
        <p className={pageSubClass}>
          Choose the model behind each part of the product. These settings apply
          to every client and take effect on the next generation.
        </p>
        <div className="h-5" />
      </div>

      <div className={pageBodyClass}>
        <div className="max-w-4xl">
          {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

          {isLoading ? (
            <div className={cardClass}>
              <p className="text-sm text-[#6b7280]">Loading AI model settings…</p>
            </div>
          ) : (
            <>
              <div className={`${sectionClass} mb-8`}>
                <div className={cardClass}>
                  {settings.map((setting, index) => {
                    const selected = draft[setting.purposeKey] ?? setting.modelName;
                    const isUnknownModel = !modelOptions.some(
                      (option) => option.id === selected,
                    );

                    return (
                      <div
                        key={setting.purposeKey}
                        className={
                          index === settings.length - 1
                            ? ""
                            : "mb-6 border-b border-[#f1f2f4] pb-6"
                        }
                      >
                        <label
                          className={labelClass}
                          htmlFor={`ai-model-${setting.purposeKey}`}
                        >
                          {setting.label}
                        </label>
                        <select
                          id={`ai-model-${setting.purposeKey}`}
                          className={inputClass}
                          value={selected}
                          onChange={(event) =>
                            setDraft((previous) => ({
                              ...previous,
                              [setting.purposeKey]: event.target.value,
                            }))
                          }
                        >
                          {/* A model configured on the server but not in the
                              local list still has to be selectable. */}
                          {isUnknownModel && (
                            <option value={selected}>
                              {getModelLabel(selected)}
                            </option>
                          )}
                          {modelOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                        <p className={hintClass}>
                          {setting.description} Default:{" "}
                          <strong>{getModelLabel(setting.defaultModel)}</strong>.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${sectionClass} flex items-center gap-3`}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className={primaryButtonClass}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  disabled={isSaving}
                  className={secondaryButtonClass}
                >
                  Reset to defaults
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiModelSettings;

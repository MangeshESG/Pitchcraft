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
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "../common/settingsStyles";

/**
 * One model picker per AI purpose — the "AI models" tab of the admin page.
 * Every API that calls a model reads its model from here, so these selects are
 * the only place a model is chosen in the product. Rendered inside the page
 * chrome owned by `AdminSettings`, so it starts at the body.
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
        (setting) =>
          setting.supportedByApi &&
          draft[setting.purposeKey] !== setting.modelName,
      ),
    [draft, settings],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setBanner(null);

    try {
      // Purposes the API doesn't know yet are left out: it rejects the whole
      // request when any key is unknown, which would block the others too.
      const savable = Object.fromEntries(
        settings
          .filter((setting) => setting.supportedByApi)
          .map((setting) => [
            setting.purposeKey,
            draft[setting.purposeKey] ?? setting.modelName,
          ]),
      );

      await saveAiModelSettings(
        savable,
        sessionStorage.getItem("clientId") || undefined,
      );
      setSettings((previous) =>
        previous.map((setting) =>
          setting.supportedByApi
            ? { ...setting, modelName: draft[setting.purposeKey] ?? setting.modelName }
            : setting,
        ),
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
        settings.map((setting) => [
          setting.purposeKey,
          setting.supportedByApi ? setting.defaultModel : setting.modelName,
        ]),
      ),
    );
  };

  return (
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
                      disabled={!setting.supportedByApi}
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
                      {!setting.supportedByApi && (
                        <>
                          {" "}
                          <span className="text-[#b45309]">
                            This API does not serve this purpose yet, so it
                            runs on its default and cannot be changed here.
                          </span>
                        </>
                      )}
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
  );
};

export default AiModelSettings;

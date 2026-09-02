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
 * The purposes, grouped for the page.
 *
 * A flat list of nine pickers is a long scroll in which nothing is findable,
 * and the set only grows. Grouping by what the model is actually being asked
 * to do — write, research, or judge a contact — means an admin changing the
 * validation models never scrolls past the email ones.
 *
 * Any purpose the API adds that this list doesn't mention still renders, under
 * "Other", so a new key is never invisible just because this wasn't updated.
 */
const PURPOSE_GROUPS: { title: string; blurb: string; keys: string[] }[] = [
  {
    title: "Writing",
    blurb: "The models that produce text a contact will read.",
    keys: ["email_generation", "blueprint_generation"],
  },
  {
    title: "Research",
    blurb: "The models that reach the live web to find things out.",
    keys: ["web_search", "find_email", "profile_summary", "contact_qa"],
  },
  {
    title: "Audience Assurance",
    blurb:
      "The validation checks. Contact fit and Live contact use web search, which is what a run actually costs; Data integrity never searches, so the cheapest capable model belongs there.",
    keys: ["contact_fit", "data_integrity", "live_contact"],
  },
];

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

  /**
   * The settings arranged into the groups above. Anything the API returns
   * that no group claims is collected into a trailing "Other" group, so a
   * purpose added on the server is always reachable here even before this
   * file knows where it belongs.
   */
  const groupedSettings = useMemo(() => {
    const byKey = new Map(settings.map((setting) => [setting.purposeKey, setting]));

    const groups = PURPOSE_GROUPS.map((group) => ({
      title: group.title,
      blurb: group.blurb,
      settings: group.keys
        .map((key) => byKey.get(key))
        .filter((setting): setting is AiModelSetting => !!setting),
    })).filter((group) => group.settings.length > 0);

    const claimed = new Set(PURPOSE_GROUPS.flatMap((group) => group.keys));
    const rest = settings.filter((setting) => !claimed.has(setting.purposeKey));

    if (rest.length > 0) {
      groups.push({
        title: "Other",
        blurb: "Purposes this page has not been told how to group yet.",
        settings: rest,
      });
    }

    return groups;
  }, [settings]);

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
    // Full width, but with a third column at wide sizes rather than three
    // stretched ones: a select that spans half a monitor puts its label a long
    // way from its value. More columns uses the space; wider controls waste it.
    <div className="w-full">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      {isLoading ? (
        <div className={cardClass}>
          <p className="text-sm text-[#6b7280]">Loading AI model settings…</p>
        </div>
      ) : (
        <>
          {groupedSettings.map((group) => (
            <div key={group.title} className={`${sectionClass} mb-6`}>
              <div className={cardClass}>
                <h2 className="text-[15px] font-semibold text-[#0b1220]">
                  {group.title}
                </h2>
                <p className={hintClass}>{group.blurb}</p>

                {/* Two per row: nine settings in one column is a scroll in
                    which nothing can be found at a glance. */}
                <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.settings.map((setting) => {
                    const selected = draft[setting.purposeKey] ?? setting.modelName;
                    const isUnknownModel = !modelOptions.some(
                      (option) => option.id === selected,
                    );

                    return (
                      <div key={setting.purposeKey}>
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
            </div>
          ))}

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

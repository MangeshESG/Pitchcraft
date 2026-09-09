import React, { useCallback, useEffect, useState } from "react";
import { Layers } from "lucide-react";
import {
  ValidationSettings as ValidationSettingsValues,
  fetchValidationSettings,
  saveValidationBatchSize,
} from "../../api/contactValidation";
import { formatUserDate } from "../common/dateTimePreferences";
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

type Banner = { type: "success" | "error"; text: string } | null;

/** Sizes worth comparing, so trying one is a click rather than a decision. */
const PRESETS = [10, 25, 50, 100];

/**
 * Audience Assurance tuning — the "Validation" tab of the admin page.
 *
 * Today that is the batch size: how many contacts go into one model request.
 * It lives here rather than in appsettings because the number is a thing to
 * experiment with — fewer contacts per request generally means a more careful
 * answer per contact, more requests, and a higher bill — and an experiment
 * that needs a redeploy between attempts does not get run.
 */
const ValidationSettings: React.FC = () => {
  const [settings, setSettings] = useState<ValidationSettingsValues | null>(null);
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const loaded = await fetchValidationSettings();
      setSettings(loaded);
      setValue(String(loaded.batchSize));
    } catch (error: any) {
      setBanner({
        type: "error",
        text: error?.message || "Could not load the validation settings.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed = Number(value);
  const isInRange =
    !!settings &&
    Number.isInteger(parsed) &&
    parsed >= settings.minBatchSize &&
    parsed <= settings.maxBatchSize;
  const isDirty = !!settings && parsed !== settings.batchSize;

  const handleSave = async () => {
    if (!settings || !isInRange) return;

    const adminClientId = Number(
      sessionStorage.getItem("clientId") || localStorage.getItem("clientId"),
    );

    if (!adminClientId) {
      setBanner({
        type: "error",
        text: "Could not identify your account. Sign in again and retry.",
      });
      return;
    }

    setIsSaving(true);
    setBanner(null);

    try {
      const saved = await saveValidationBatchSize(parsed, adminClientId);
      setSettings({ ...settings, batchSize: saved.batchSize });
      setValue(String(saved.batchSize));
      setBanner({ type: "success", text: saved.message });
    } catch (error: any) {
      setBanner({
        type: "error",
        text: error?.message || "Could not save the batch size.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      {isLoading || !settings ? (
        <div className={cardClass}>
          <p className="text-sm text-[#6b7280]">Loading validation settings…</p>
        </div>
      ) : (
        <div className={sectionClass}>
          <div className={cardClass}>
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e2f1e3] bg-[#f1f8f2] text-[#3f9f42]">
                <Layers size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#0b1220]">
                  Contacts per model request
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b7280]">
                  How many contacts a single validation request carries. At{" "}
                  {settings.batchSize}, a run of 200 contacts makes{" "}
                  {Math.ceil(200 / settings.batchSize)} requests.
                </p>
              </div>
            </div>

            <div className="mt-5 max-w-xs">
              <label className={labelClass} htmlFor="validation-batch-size">
                Batch size
              </label>
              <input
                id="validation-batch-size"
                type="number"
                min={settings.minBatchSize}
                max={settings.maxBatchSize}
                step={1}
                value={value}
                disabled={isSaving}
                onChange={(event) => setValue(event.target.value)}
                className={inputClass}
              />
              <p className={hintClass}>
                {settings.minBatchSize}–{settings.maxBatchSize}. The default is{" "}
                {settings.defaultBatchSize}.
              </p>
              {value !== "" && !isInRange && (
                <p className="mt-2 text-[13px] text-red-600">
                  Enter a whole number between {settings.minBatchSize} and{" "}
                  {settings.maxBatchSize}.
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-[#6b7280]">Try:</span>
              {PRESETS.filter(
                (preset) =>
                  preset >= settings.minBatchSize &&
                  preset <= settings.maxBatchSize,
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue(String(preset))}
                  disabled={isSaving}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                    parsed === preset
                      ? "border-[#3f9f42] bg-[#f1f8f2] text-[#2d7a30]"
                      : "border-[#e8eaee] bg-white text-[#374151] hover:border-[#d1d5db]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-[#f1f2f4] pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isInRange || !isDirty}
                className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setValue(String(settings.defaultBatchSize))}
                disabled={isSaving || parsed === settings.defaultBatchSize}
                className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Reset to {settings.defaultBatchSize}
              </button>

              {settings.updatedAt && (
                <span className="ml-auto text-[13px] text-[#6b7280]">
                  Last changed {formatUserDate(settings.updatedAt)}
                </span>
              )}
            </div>

            <p className={`${hintClass} border-t border-[#f1f2f4] pt-4`}>
              Applies to the next run; a run already going keeps the size it
              started with. Smaller batches give the model less to hold at once
              and leave less room for a reply to be cut short, which is where
              accuracy tends to slip — but they multiply the number of
              requests, and each one repeats the instruction and the brief, so
              a run costs more in tokens. Web searches are charged per search
              rather than per request, so this moves token cost, not search
              cost.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationSettings;

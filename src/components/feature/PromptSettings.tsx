import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  PromptSetting,
  findMissingPlaceholders,
  fetchPromptSettings,
  savePromptSettings,
} from "../../utils/promptSettings";
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

const badgeClass = (isConfigured: boolean) =>
  `rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${
    isConfigured
      ? "border-[#e2f1e3] bg-[#f1f8f2] text-[#2d7a30]"
      : "border-[#f0d9a8] bg-[#fdf6e7] text-[#b45309]"
  }`;

const formatUpdated = (updatedAt: string | null, updatedBy: string | null) => {
  if (!updatedAt) return null;

  const when = new Date(updatedAt);
  const stamp = Number.isNaN(when.getTime())
    ? updatedAt
    : when.toLocaleString();

  return updatedBy
    ? `Last saved ${stamp} by client ${updatedBy}`
    : `Last saved ${stamp}`;
};

/**
 * Editor for the AI instructions the API runs — the "Prompts" tab of the admin
 * page. Today that is the email research prompt the browser extension runs when
 * it unlocks a contact's email address.
 *
 * The box shows exactly what is stored in app_prompt_settings and nothing else:
 * a prompt nobody has written is empty, and the API refuses to run the search
 * until one is saved. Rendered inside the page chrome owned by `AdminSettings`,
 * so it starts at the body.
 */
const PromptSettings: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptSetting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  /**
   * Which prompt is being edited. These instructions run to thousands of
   * characters each, so showing them all stacked meant the second one started
   * a full screen below the first and the rest were invisible. One at a time,
   * chosen here.
   */
  const [selectedKey, setSelectedKey] = useState<string>("");

  // Kept so a placeholder chip can drop its token at the caret.
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const applyPrompts = useCallback((loaded: PromptSetting[]) => {
    setPrompts(loaded);
    setDraft(
      Object.fromEntries(
        loaded.map((prompt) => [prompt.promptKey, prompt.promptText]),
      ),
    );
    // Keep whatever the user was editing across a reload; only fall back to
    // the first prompt when the current choice no longer exists.
    setSelectedKey((current) =>
      loaded.some((prompt) => prompt.promptKey === current)
        ? current
        : loaded[0]?.promptKey ?? "",
    );
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      applyPrompts(await fetchPromptSettings());
    } catch (error: any) {
      setBanner({
        type: "error",
        text:
          error?.message ||
          "Could not load the prompts. The API may not have the prompt table yet.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [applyPrompts]);

  useEffect(() => {
    void load();
  }, [load]);

  const updatedBy = useMemo(
    () =>
      sessionStorage.getItem("clientId") ||
      localStorage.getItem("clientId") ||
      undefined,
    [],
  );

  const changedKeys = useMemo(
    () =>
      prompts
        .filter(
          (prompt) => (draft[prompt.promptKey] ?? "") !== prompt.promptText,
        )
        .map((prompt) => prompt.promptKey),
    [draft, prompts],
  );

  const handleInsertPlaceholder = (promptKey: string, placeholder: string) => {
    const textarea = textareaRefs.current[promptKey];
    const current = draft[promptKey] ?? "";

    if (!textarea) {
      setDraft((previous) => ({
        ...previous,
        [promptKey]: `${current}${placeholder}`,
      }));
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${placeholder}${current.slice(end)}`;

    setDraft((previous) => ({ ...previous, [promptKey]: next }));

    // Put the caret after what was just inserted, once React has re-rendered.
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + placeholder.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  const handleSave = async () => {
    // Clearing a prompt deletes the row, and the feature behind it stops
    // working — say so before it happens rather than after.
    const cleared = prompts.filter(
      (prompt) =>
        prompt.isConfigured && !(draft[prompt.promptKey] ?? "").trim(),
    );

    if (
      cleared.length > 0 &&
      !window.confirm(
        `${cleared
          .map((prompt) => prompt.label)
          .join(", ")} will be left with no instruction, and the feature behind it stops running until one is saved. Continue?`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setBanner(null);

    try {
      const changed = Object.fromEntries(
        changedKeys.map((promptKey) => [promptKey, draft[promptKey] ?? ""]),
      );

      const saved = await savePromptSettings(changed, updatedBy);

      if (saved.length > 0) applyPrompts(saved);
      else await load();

      setBanner({
        type: "success",
        text:
          cleared.length > 0
            ? "Saved. The cleared prompt has no instruction stored any more."
            : "Prompt saved. The next email unlock uses the new instruction.",
      });
    } catch (error: any) {
      setBanner({
        type: "error",
        text: error?.message || "Could not save the prompt.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Full width: a prompt is a long document, and wrapping thousands of
    // characters into a narrow column made the instruction harder to read and
    // left half the page empty. The picker keeps the page to one prompt at a
    // time, so the width goes to the text that matters.
    <div className="w-full">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      {isLoading ? (
        <div className={cardClass}>
          <p className="text-sm text-[#6b7280]">Loading prompts…</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-[#6b7280]">
            No editable prompts were returned by the API.
          </p>
        </div>
      ) : (
        <>
          {/* Which prompt to edit. Unsaved edits to the others survive
              switching — the draft is keyed by prompt, and Save sends every
              changed one, not just the visible one. */}
          <div className={`${sectionClass} mb-6`}>
            <label className={labelClass} htmlFor="prompt-picker">
              Prompt
            </label>
            <select
              id="prompt-picker"
              className={inputClass}
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
            >
              {prompts.map((prompt) => {
                const isDirty =
                  (draft[prompt.promptKey] ?? "") !== prompt.promptText;

                return (
                  <option key={prompt.promptKey} value={prompt.promptKey}>
                    {prompt.label}
                    {isDirty ? " • unsaved" : prompt.isConfigured ? "" : " • not set"}
                  </option>
                );
              })}
            </select>
            {changedKeys.length > 0 && (
              <p className={hintClass}>
                {changedKeys.length} prompt
                {changedKeys.length === 1 ? "" : "s"} edited but not yet saved.
                Save sends all of them.
              </p>
            )}
          </div>

          {prompts
            .filter((prompt) => prompt.promptKey === selectedKey)
            .map((prompt) => {
            const text = draft[prompt.promptKey] ?? "";
            const missing = findMissingPlaceholders(text, prompt.placeholders);
            const isDirty = text !== prompt.promptText;
            const updatedLabel = formatUpdated(
              prompt.updatedAt,
              prompt.updatedBy,
            );

            return (
              <div key={prompt.promptKey} className={`${sectionClass} mb-8`}>
                <div className={cardClass}>
                  <div className="mb-4 flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <label
                        className={labelClass}
                        htmlFor={`prompt-${prompt.promptKey}`}
                      >
                        {prompt.label}
                      </label>
                      <p className="text-[13px] leading-relaxed text-[#6b7280]">
                        {prompt.description}
                      </p>
                    </div>
                    <span
                      className={`${badgeClass(prompt.isConfigured)} shrink-0`}
                    >
                      {prompt.isConfigured ? "Saved" : "Not set"}
                    </span>
                  </div>

                  {prompt.placeholders.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#9ca3af]">
                        Placeholders — click to insert
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {prompt.placeholders.map((placeholder) => (
                          <button
                            key={placeholder}
                            type="button"
                            onClick={() =>
                              handleInsertPlaceholder(
                                prompt.promptKey,
                                placeholder,
                              )
                            }
                            className={`rounded-md border px-2 py-1 font-mono text-[12px] transition-colors ${
                              text.includes(placeholder)
                                ? "border-[#e2f1e3] bg-[#f1f8f2] text-[#2d7a30] hover:bg-[#e6f3e7]"
                                : "border-[#f0d9a8] bg-[#fdf6e7] text-[#b45309] hover:bg-[#faedd3]"
                            }`}
                          >
                            {placeholder}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    id={`prompt-${prompt.promptKey}`}
                    ref={(element) => {
                      textareaRefs.current[prompt.promptKey] = element;
                    }}
                    value={text}
                    spellCheck={false}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        [prompt.promptKey]: event.target.value,
                      }))
                    }
                    className="h-[520px] w-full resize-y rounded-lg border border-[#e8eaee] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#0b1220] outline-none transition-colors focus:border-[#3f9f42] focus:ring-1 focus:ring-[#3f9f42]"
                  />

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className={`${hintClass} mt-0`}>
                      {text.length.toLocaleString()} characters
                      {isDirty && " • unsaved changes"}
                    </p>
                    {updatedLabel && (
                      <p className={`${hintClass} mt-0`}>{updatedLabel}</p>
                    )}
                  </div>

                  {!text.trim() ? (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f0d9a8] bg-[#fdf6e7] px-3.5 py-2.5 text-[13px] text-[#b45309]">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        No instruction is stored. The API has no copy of its own,
                        so the email unlock will not run until one is written
                        here and saved.
                      </span>
                    </div>
                  ) : (
                    missing.length > 0 && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f0d9a8] bg-[#fdf6e7] px-3.5 py-2.5 text-[13px] text-[#b45309]">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>
                          Missing placeholder{missing.length > 1 ? "s" : ""}:{" "}
                          <span className="font-mono">
                            {missing.join(", ")}
                          </span>
                          . The contact detail behind each one will not reach the
                          model.
                        </span>
                      </div>
                    )
                  )}

                  <div className="mt-4 flex items-center gap-3 border-t border-[#f1f2f4] pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((previous) => ({
                          ...previous,
                          [prompt.promptKey]: prompt.promptText,
                        }))
                      }
                      disabled={!isDirty || isSaving}
                      className={secondaryButtonClass}
                    >
                      Undo changes
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className={`${sectionClass} flex items-center gap-3`}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || changedKeys.length === 0}
              className={primaryButtonClass}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            <span className="text-[13px] text-[#6b7280]">
              Applies to every client on the next email unlock.
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PromptSettings;

import React, { useCallback, useEffect, useState } from "react";
import {
  ContactFitBrief,
  deleteBrief,
  fetchBriefs,
  saveBrief,
  setDefaultBrief,
} from "../../../api/contactValidation";
import {
  bannerClass,
  cardClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../../common/settingsStyles";

interface ContactFitBriefsPanelProps {
  selectedClient: string;
}

const EMPTY_DRAFT = { id: 0, name: "", briefText: "", isDefault: false };

/**
 * The saved targeting briefs Contact Fit scores against.
 *
 * Briefs are standalone rather than attached to a list because a client
 * selling into two audiences needs two of them, and one brief is normally run
 * against many lists, segments and views. One may be marked the default, which
 * is what the run panel preselects.
 */
const ContactFitBriefsPanel: React.FC<ContactFitBriefsPanelProps> = ({ selectedClient }) => {
  const [briefs, setBriefs] = useState<ContactFitBrief[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!selectedClient) return;

    setIsLoading(true);

    try {
      setBriefs(await fetchBriefs(selectedClient));
    } catch (error: any) {
      setBanner({ type: "error", text: error?.message ?? "Briefs could not be loaded." });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft.name.trim() || !draft.briefText.trim()) return;

    setIsSaving(true);
    setBanner(null);

    try {
      await saveBrief(selectedClient, {
        id: draft.id || undefined,
        name: draft.name.trim(),
        briefText: draft.briefText,
        isDefault: draft.isDefault,
      });

      setDraft(EMPTY_DRAFT);
      await load();
      setBanner({ type: "success", text: "Brief saved." });
    } catch (error: any) {
      setBanner({ type: "error", text: error?.message ?? "The brief could not be saved." });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (brief: ContactFitBrief) => {
    // Scores already written against this brief survive it, so this is a
    // smaller decision than it looks — say so rather than warning vaguely.
    if (!window.confirm(
      `Delete "${brief.name}"? Contacts already scored against it keep their scores.`
    )) {
      return;
    }

    try {
      await deleteBrief(selectedClient, brief.id);
      if (draft.id === brief.id) setDraft(EMPTY_DRAFT);
      await load();
      setBanner({ type: "success", text: "Brief deleted. Existing scores were kept." });
    } catch (error: any) {
      setBanner({ type: "error", text: error?.message ?? "The brief could not be deleted." });
    }
  };

  const makeDefault = async (brief: ContactFitBrief) => {
    try {
      await setDefaultBrief(selectedClient, brief.id);
      await load();
    } catch (error: any) {
      setBanner({ type: "error", text: error?.message ?? "The default could not be changed." });
    }
  };

  return (
    <div className="max-w-4xl">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      {/* ---------- Saved briefs ---------- */}
      <div className={`${cardClass} mb-6`}>
        <h2 className="text-[15px] font-semibold text-[#0b1220]">Targeting briefs</h2>
        <p className={hintClass}>
          The Contact fit check scores each contact against one of these — which
          companies belong in the audience, and which job titles. The more
          precisely a brief says what should <em>fail</em>, the more useful the
          scores are.
        </p>

        <div className="mt-5 divide-y divide-[#eef0f3] border-t border-[#eef0f3]">
          {isLoading && <div className="py-4 text-sm text-[#6b7280]">Loading…</div>}

          {!isLoading && briefs.length === 0 && (
            <div className="py-4 text-sm text-[#6b7280]">
              No briefs yet. Write your first one below.
            </div>
          )}

          {briefs.map((brief) => (
            <div key={brief.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#0b1220]">{brief.name}</span>
                  {brief.isDefault && (
                    <span className="rounded-full border border-[#d5f0da] bg-[#f1f8f2] px-2 py-0.5 text-[11px] font-semibold text-[#2d7a30]">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-[#6b7280]">
                  {brief.briefText.slice(0, 220)}
                  {brief.briefText.length > 220 ? "…" : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!brief.isDefault && (
                  <button
                    className="text-[13px] font-medium text-[#6b7280] hover:text-[#3f9f42]"
                    onClick={() => makeDefault(brief)}
                  >
                    Make default
                  </button>
                )}
                <button
                  className="text-[13px] font-medium text-[#3f9f42]"
                  onClick={() =>
                    setDraft({
                      id: brief.id,
                      name: brief.name,
                      briefText: brief.briefText,
                      isDefault: brief.isDefault,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  className="text-[13px] font-medium text-red-600"
                  onClick={() => remove(brief)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Editor ---------- */}
      <div className={cardClass}>
        <h2 className="text-[15px] font-semibold text-[#0b1220]">
          {draft.id ? "Edit brief" : "New brief"}
        </h2>

        <div className="mt-5">
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Event organisers — attendee data"
          />
        </div>

        <div className="mt-4">
          <label className={labelClass}>Brief</label>
          <textarea
            className={`${inputClass} min-h-[240px] font-mono text-[12.5px] leading-relaxed`}
            value={draft.briefText}
            onChange={(e) => setDraft({ ...draft, briefText: e.target.value })}
            placeholder={
              "Describe the audience.\n\n" +
              "COMPANY FIT\nThe company must be…\nExamples which should FAIL include…\n\n" +
              "JOB TITLE FIT\nThe role must be one which might reasonably…"
            }
          />
          <p className={hintClass}>
            Write it as instructions to a researcher. Listing what should fail —
            agencies, suppliers, venues, companies that merely attend — is what
            stops everything scoring 80 and above.
          </p>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
          />
          Preselect this brief when running a Contact fit check
        </label>

        <div className="mt-6 flex gap-3">
          <button
            className={primaryButtonClass}
            onClick={save}
            disabled={isSaving || !draft.name.trim() || !draft.briefText.trim()}
            style={{
              opacity: isSaving || !draft.name.trim() || !draft.briefText.trim() ? 0.5 : 1,
            }}
          >
            {isSaving ? "Saving…" : draft.id ? "Save changes" : "Add brief"}
          </button>

          {draft.id > 0 && (
            <button className={secondaryButtonClass} onClick={() => setDraft(EMPTY_DRAFT)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactFitBriefsPanel;

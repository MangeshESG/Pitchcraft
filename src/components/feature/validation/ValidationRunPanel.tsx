import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommonSidePanel from "../../common/CommonSidePanel";
import { VALIDATION_CHECK_ICONS, VALIDATION_CHECK_LABELS } from "./validationColumns";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../../styles/buttonStyles";
import {
  CheckTypeInfo,
  ContactFitBrief,
  EnhancementField,
  ValidationCheckType,
  ValidationJob,
  creditsForContacts,
  creditNoteFor,
  fetchBriefs,
  fetchCheckTypes,
  fetchEnhancementFields,
  fetchJob,
  runValidation,
} from "../../../api/contactValidation";
import { DEFAULT_CHECK_BY_MODE, RunMode, modeForCheck } from "./checkGroups";

interface ValidationRunPanelProps {
  isOpen: boolean;
  isAdmin?: boolean;
  /**
   * Which half of the checks this panel offers. "validate" scores what is
   * already on the record; "enrich" goes and finds what is not. See
   * `checkGroups` for why they are two panels and not one.
   */
  mode?: RunMode;
  onClose: () => void;
  clientId: string | number;
  contactIds: number[];
  /** Fires when a run finishes so the caller can refresh its grid. */
  onCompleted?: (job: ValidationJob) => void;
  /**
   * Fires on every status change of the run this panel started, open or not,
   * so the caller can keep showing progress once the panel is closed.
   */
  onJobChange?: (job: ValidationJob | null) => void;
  onShowMessage?: (message: string, type: "success" | "error" | "info") => void;
}

/** How often a running job is polled. */
const POLL_MS = 3000;

/** The grid headings use the same pictures, so there is one definition. */
const CHECK_ICONS: Partial<Record<ValidationCheckType, string>> = VALIDATION_CHECK_ICONS;

/**
 * The ceiling the API enforces on one enhancement run. Repeated here so the
 * picker can stop a user at the limit rather than letting them choose thirty
 * columns and have the run refused.
 */
const MAX_ENHANCEMENT_FIELDS = 25;

/** The API truncates past this; the counter says so before it happens. */
const MAX_INSTRUCTION_LENGTH = 4000;

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

/**
 * The price on a check's card, as a badge.
 *
 * Email discovery is the one check priced per contact, so it costs ten times
 * what the others do for the same selection — amber against the green of the
 * per-ten checks, which differ in lightness as well as hue so the two are
 * still apart for anyone who cannot separate the colours.
 */
const creditPillFor = (
  checkType: ValidationCheckType
): { text: string; bg: string; fg: string } =>
  checkType === "email_verification"
    ? { text: "1 credit per contact", bg: "#fff1e0", fg: "#8a4b00" }
    : { text: "1 credit per 10 contacts", bg: "#eef6ef", fg: "#2b6c2e" };

/**
 * Starts one Audience Assurance check over the selected contacts and follows
 * it to the end.
 *
 * The panel stays open while the run works. A hundred contacts with web search
 * takes minutes, and a user who has just spent credits needs to see the run
 * progressing — and what it actually cost — rather than a toast and silence.
 */
const ValidationRunPanel: React.FC<ValidationRunPanelProps> = ({
  isOpen,
  isAdmin = false,
  mode = "validate",
  onClose,
  clientId,
  contactIds,
  onCompleted,
  onJobChange,
  onShowMessage,
}) => {
  const [checkTypes, setCheckTypes] = useState<CheckTypeInfo[]>([]);
  const [briefs, setBriefs] = useState<ContactFitBrief[]>([]);
  const [checkType, setCheckType] = useState<ValidationCheckType>(
    DEFAULT_CHECK_BY_MODE[mode]
  );
  const [briefId, setBriefId] = useState<number | null>(null);
  /** The columns a Customisable Data Enhancement run can be pointed at. */
  const [enhancementFields, setEnhancementFields] = useState<EnhancementField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [job, setJob] = useState<ValidationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A run outlives the panel being open and the grid being switched, so the
  // poll loop reads the callers' latest callbacks rather than the ones that
  // existed when the run was started.
  const onCompletedRef = useRef(onCompleted);
  const onShowMessageRef = useRef(onShowMessage);
  const modeRef = useRef(mode);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onShowMessageRef.current = onShowMessage;
    modeRef.current = mode;
  });

  const credits = creditsForContacts(contactIds.length, checkType);
  const selected = checkTypes.find((c) => c.key === checkType);

  // ---------- Load the pickers ----------
  useEffect(() => {
    if (!isOpen || !clientId) return;

    let cancelled = false;

    (async () => {
      try {
        const [types, savedBriefs] = await Promise.all([
          fetchCheckTypes(),
          fetchBriefs(clientId),
        ]);

        if (cancelled) return;

        // Only this panel's half of the checks. The API answers with all five
        // — it has no idea the UI splits them — so the split is applied here
        // rather than asking for two endpoints that differ by a filter.
        const mine = types.filter((type) => modeForCheck(type.key) === mode);

        setCheckTypes(mine);
        // A check left selected from the other panel would otherwise stay in
        // state with no card on screen to show it, and the footer would start
        // a run the user cannot see they asked for.
        setCheckType((current) =>
          mine.some((type) => type.key === current)
            ? current
            : mine.find((type) => type.key === DEFAULT_CHECK_BY_MODE[mode])?.key ??
              mine[0]?.key ??
              current
        );
        setBriefs(savedBriefs);
        setBriefId(savedBriefs.find((b) => b.isDefault)?.id ?? savedBriefs[0]?.id ?? null);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message ?? "The panel could not be loaded.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId, mode]);

  // ---------- The enhancement column list ----------
  //
  // Loaded when that check is chosen rather than with the panel, because it is
  // the only check that needs it and it is a per-client query.
  //
  // The in-flight request is tracked by id rather than by a cancellation flag
  // on each effect run, and the loading flag is deliberately not a dependency.
  // Both are the same bug: a flag set inside the effect that the effect also
  // watches re-runs it, the first run's cleanup then discards the reply it was
  // waiting for, and the re-run sees "already loading" and starts nothing —
  // leaving the picker reading "Loading columns…" forever. An id also survives
  // StrictMode's double invoke in development, where a cancellation flag
  // cancels the only request that was ever made.
  const fieldsRequestRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !clientId) return;
    if (checkType !== "data_enhancement") return;

    const requestId = ++fieldsRequestRef.current;
    setIsLoadingFields(true);

    (async () => {
      try {
        const fields = await fetchEnhancementFields(clientId);

        // Only the newest request may write: an older one answering late must
        // not overwrite the columns of the client now on screen.
        if (fieldsRequestRef.current === requestId) setEnhancementFields(fields);
      } catch (loadError: any) {
        if (fieldsRequestRef.current === requestId) {
          setError(loadError?.message ?? "The column list could not be loaded.");
        }
      } finally {
        if (fieldsRequestRef.current === requestId) setIsLoadingFields(false);
      }
    })();
  }, [isOpen, clientId, checkType]);

  /**
   * The picker's rows, narrowed by whatever has been typed in the search.
   *
   * One flat list in the order the API sends, with no "Contact fields" /
   * "Custom attributes" headings over it: the headings were the only thing
   * between a user and the column they came for, they pushed the rows that
   * matched a search below the fold, and a row already says what it is — a
   * custom attribute carries its type in its own second line. Searching
   * covers the custom ones too, so nothing needs a group to be found.
   */
  const visibleFields = useMemo(() => {
    const needle = fieldSearch.trim().toLowerCase();
    if (!needle) return enhancementFields;

    return enhancementFields.filter(
      (field) =>
        field.label.toLowerCase().includes(needle) ||
        field.key.toLowerCase().includes(needle)
    );
  }, [enhancementFields, fieldSearch]);

  /**
   * The chosen columns, in the order they were ticked, ready to be shown as
   * chips above the picker.
   *
   * The picker scrolls and the ticks scatter through it, so without this the
   * only sign of what a run will actually cover is a count — and a user who
   * has scrolled past the top cannot see whether "Name" is still on. Falls
   * back to the key for a column whose definition has not arrived yet, so a
   * chip is never blank.
   */
  const selectedFieldChips = useMemo(
    () =>
      selectedFields.map((key) => ({
        key,
        label: enhancementFields.find((field) => field.key === key)?.label ?? key,
      })),
    [selectedFields, enhancementFields]
  );

  const toggleField = (key: string) => {
    setSelectedFields((current) =>
      current.includes(key)
        ? current.filter((selected) => selected !== key)
        : current.length >= MAX_ENHANCEMENT_FIELDS
          ? current
          : [...current, key]
    );
  };

  // Clear the previous result when the panel is reopened, so it never reads as
  // this opening's run. A run still in flight is deliberately kept: closing the
  // panel must not stop the polling, or the grid would never be refreshed and
  // the toolbar would have no progress to show.
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setIsStarting(false);
    setJob((current) => (current && !current.isFinished ? current : null));
  }, [isOpen]);

  // Keep the caller's copy of the run in step with ours.
  useEffect(() => {
    onJobChange?.(job);
  }, [job, onJobChange]);

  // ---------- Follow a running job ----------
  const poll = useCallback(
    async (jobId: number) => {
      try {
        const latest = await fetchJob(clientId, jobId);
        setJob(latest);

        if (!latest.isFinished) {
          pollRef.current = setTimeout(() => poll(jobId), POLL_MS);
          return;
        }

        onCompletedRef.current?.(latest);

        if (latest.status === "failed") {
          onShowMessageRef.current?.(
            latest.errorMessage || "The run failed.",
            "error"
          );
        } else if (latest.status === "partial") {
          onShowMessageRef.current?.(
            `${latest.processedCount} of ${latest.contactCount} contacts were processed. ${latest.failedCount} could not be.`,
            "info"
          );
        } else {
          onShowMessageRef.current?.(
            `${latest.processedCount} contact${
              latest.processedCount === 1 ? "" : "s"
            } ${modeRef.current === "enrich" ? "enriched" : "validated"}.`,
            "success"
          );
        }
      } catch (pollError: any) {
        setError(pollError?.message ?? "The run status could not be read.");
      }
    },
    [clientId]
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const start = async () => {
    setError(null);
    setIsStarting(true);

    try {
      const started = await runValidation({
        clientId,
        checkType,
        contactIds,
        briefId: selected?.requiresBrief ? briefId : null,
        // Sent only for the check that reads them, so a stale selection left
        // behind by switching checks cannot travel with a different run.
        fields: selected?.requiresFields ? selectedFields : undefined,
        instructions: selected?.requiresFields ? instructions.trim() || null : undefined,
      });

      setJob(started);
      pollRef.current = setTimeout(() => poll(started.id), POLL_MS);
    } catch (startError: any) {
      // The server's refusals are written for the user — no brief chosen, not
      // enough credit — so they are shown as-is inside the panel rather than
      // flashed past in a toast.
      setError(
        startError?.message ??
          `The ${mode === "enrich" ? "enrichment" : "validation"} run could not be started.`
      );
    } finally {
      setIsStarting(false);
    }
  };

  const isRunning = !!job && !job.isFinished;
  const canStart =
    contactIds.length > 0 &&
    !isStarting &&
    !isRunning &&
    (!selected?.requiresBrief || !!briefId) &&
    // A run with no columns has nothing to ask for, and the API refuses it -
    // so the button says so before the click rather than after it.
    (!selected?.requiresFields || selectedFields.length > 0);

  const progress = useMemo(() => {
    if (!job || job.contactCount === 0) return 0;
    return Math.round((job.processedCount / job.contactCount) * 100);
  }, [job]);


  const contactCount = contactIds.length;
  const plural = contactCount === 1 ? "" : "s";
  const needsFields = !!selected?.requiresFields;
  const noFieldsYet = needsFields && selectedFields.length === 0;

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "enrich" ? "Enrich contacts" : "Validate contacts"}
      width={520}
      footerContent={
        // The cost lives beside the button that spends it, so the figure is
        // still on screen after the column list has been scrolled past.
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: "#0b1220", fontSize: 13.5 }}>
              {contactCount} contact{plural} · {credits} credit
              {credits === 1 ? "" : "s"}
            </span>
            <span style={{ color: "#6b7280", lineHeight: 1.45 }}>
              {creditNoteFor(checkType)}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} className="button secondary" style={lessPriorityButtonStyle}>
              {job?.isFinished ? "Close" : "Cancel"}
            </button>

            <button
              className="button primary"
              onClick={start}
              disabled={!canStart}
              style={{
                ...defaultButtonStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: canStart ? "pointer" : "not-allowed",
                opacity: canStart ? 1 : 0.5,
              }}
            >
              {mode === "enrich" && (
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"
                  />
                </svg>
              )}
              {isStarting
                ? "Starting…"
                : isRunning
                  ? "Running…"
                  : job?.isFinished
                    ? "Run again"
                    : noFieldsYet
                      ? "Pick at least one column"
                      : `${mode === "enrich" ? "Enrich" : "Validate"} ${contactCount} contact${plural}`}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <p style={{ margin: "0 0 18px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
        {mode === "enrich"
          ? `Choose what to do for the ${contactCount} selected contact${plural}.`
          : `Choose a check to run over the ${contactCount} selected contact${plural}.`}
      </p>

      {/* ---------- Which check ---------- */}
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>
          {mode === "enrich" ? "What do you want to do?" : "Check"}
        </label>

        <div
          style={{
            display: "grid",
            gap: 10,
            // Enrich offers two choices that fit side by side; a validate
            // check's description is longer than a half-width card can hold.
            gridTemplateColumns:
              mode === "enrich" ? "repeat(auto-fit, minmax(min(210px, 100%), 1fr))" : "1fr",
          }}
        >
          {checkTypes.map((type) => {
            const isSelected = type.key === checkType;
            const pill = creditPillFor(type.key);

            return (
              <label
                key={type.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "14px",
                  borderRadius: 12,
                  border: `1.5px solid ${isSelected ? "#3f9f42" : "#e8eaee"}`,
                  background: isSelected ? "#f1f8f2" : "#fff",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  opacity: isRunning ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 9,
                      border: "1px solid #e8eaee",
                      background: "#fff",
                    }}
                  >
                    {CHECK_ICONS[type.key] ? (
                      <img
                        src={CHECK_ICONS[type.key]}
                        alt=""
                        style={{ width: 26, height: 26, maxWidth: "none", objectFit: "contain" }}
                      />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="#3f9f42"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 5h16v14H4zM4 10h16M10 10v9"
                        />
                      </svg>
                    )}
                  </span>

                  {/* A real radio, so the keyboard and screen readers see one
                      choice out of a set rather than a row of buttons. */}
                  <input
                    type="radio"
                    name={`validation-check-${mode}`}
                    checked={isSelected}
                    disabled={isRunning}
                    onChange={() => setCheckType(type.key)}
                    style={{ width: 16, height: 16, margin: 0, flexShrink: 0, accentColor: "#3f9f42" }}
                  />
                </div>

                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0b1220" }}>
                  {VALIDATION_CHECK_LABELS[type.key] || type.label}
                </span>

                <span style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
                  {type.key === "email_verification"
                    ? type.description
                        .replace(/Prospeo/gi, "Stage 1")
                        .replace(/(?:an? AI )?web search/gi, "Stage 2")
                        .replace(/Hunter/gi, "Stage 3")
                    : type.description}
                </span>

                <span
                  style={{
                    alignSelf: "flex-start",
                    padding: "2px 9px",
                    borderRadius: 999,
                    background: pill.bg,
                    color: pill.fg,
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {pill.text}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ---------- Which brief ---------- */}
      {selected?.requiresBrief && (
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Targeting brief</label>

          {briefs.length === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #fde68a",
                background: "#fefce8",
                fontSize: 13,
                color: "#a16207",
                lineHeight: 1.5,
              }}
            >
              No briefs saved yet. Target Audience Match scores contacts against a brief, so
              write one under Settings &gt; General &gt; Verification first.
            </div>
          ) : (
            <select
              value={briefId ?? ""}
              onChange={(e) => setBriefId(Number(e.target.value))}
              disabled={isRunning}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #e8eaee",
                fontSize: 13.5,
                background: "#fff",
              }}
            >
              {briefs.map((brief) => (
                <option key={brief.id} value={brief.id}>
                  {brief.name}
                  {brief.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ---------- Which columns, and what to do with them ---------- */}
      {needsFields && (
        <>
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 6 }}>Columns to fill or check</label>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span style={{ color: "#6b7280" }}>{selectedFields.length} selected</span>
                {selectedFields.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFields([])}
                    disabled={isRunning}
                    style={{
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#3f9f42",
                      cursor: isRunning ? "not-allowed" : "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* What is on, at a glance — and a way to take one back off
                without hunting for its row in the list. */}
            {selectedFieldChips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                  padding: "8px 9px",
                  borderRadius: 10,
                  border: "1px solid #dceadd",
                  background: "#f1f8f2",
                }}
              >
                {selectedFieldChips.map((chip) => (
                  <span
                    key={chip.key}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 4px 4px 10px",
                      borderRadius: 999,
                      border: "1px solid #bcdcbe",
                      background: "#fff",
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: "#0b1220",
                      lineHeight: 1.4,
                    }}
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={() => toggleField(chip.key)}
                      disabled={isRunning}
                      aria-label={`Remove ${chip.label}`}
                      title={`Remove ${chip.label}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        padding: 0,
                        borderRadius: "50%",
                        border: 0,
                        background: "transparent",
                        color: "#6b7280",
                        fontSize: 14,
                        lineHeight: 1,
                        cursor: isRunning ? "not-allowed" : "pointer",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          d="m6 6 12 12M18 6 6 18"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <label style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 11,
                  display: "inline-flex",
                  color: "#9ca3af",
                  pointerEvents: "none",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>

              <input
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search columns, including custom attributes…"
                aria-label="Search columns"
                disabled={isRunning}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 34px",
                  marginBottom: 8,
                  borderRadius: 8,
                  border: "1px solid #e8eaee",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </label>

            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                border: "1px solid #e8eaee",
                borderRadius: 10,
                padding: "6px 4px",
                background: "#fff",
              }}
            >
              {isLoadingFields && (
                <div style={{ padding: "12px 10px", fontSize: 13, color: "#6b7280" }}>
                  Loading columns…
                </div>
              )}

              {!isLoadingFields && visibleFields.length === 0 && (
                <div style={{ padding: "12px 10px", fontSize: 13, color: "#6b7280" }}>
                  No columns match that search.
                </div>
              )}

              {visibleFields.map((field) => {
                const isSelected = selectedFields.includes(field.key);
                // At the ceiling the unselected rows go quiet rather than
                // disappearing, so the limit explains itself instead of the
                // list seeming to break.
                const isBlocked =
                  !isSelected && selectedFields.length >= MAX_ENHANCEMENT_FIELDS;

                return (
                  <label
                    key={field.key}
                    title={field.description || undefined}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      padding: "7px 10px",
                      borderRadius: 8,
                      cursor: isRunning || isBlocked ? "not-allowed" : "pointer",
                      background: isSelected ? "#f1f8f2" : "transparent",
                      opacity: isBlocked ? 0.45 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isRunning || isBlocked}
                      onChange={() => toggleField(field.key)}
                      style={{ marginTop: 2, accentColor: "#3f9f42" }}
                    />

                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 500,
                          color: "#0b1220",
                        }}
                      >
                        {field.label}
                      </span>

                      {(field.description || field.isCustom) && (
                        <span
                          style={{
                            display: "block",
                            marginTop: 2,
                            fontSize: 11.5,
                            lineHeight: 1.45,
                            color: "#6b7280",
                          }}
                        >
                          {field.description ||
                            (field.options && field.options.length > 0
                              ? `One of: ${field.options.join(", ")}`
                              : `Custom attribute (${field.fieldType || "text"})`)}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #eef0f3",
                background: "#f8f9fa",
                fontSize: 12,
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              <span aria-hidden="true" style={{ display: "inline-flex", marginTop: 1, flexShrink: 0 }}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
              </span>

              <span>
                A column that already has a value is checked rather than overwritten — you
                will be shown the old value beside the proposed one, and nothing is written
                until you accept it.
                {selectedFields.length >= MAX_ENHANCEMENT_FIELDS &&
                  ` ${MAX_ENHANCEMENT_FIELDS} columns is the most one run can cover.`}
              </span>
            </div>
          </div>

          {/* ---------- The user's own instruction ---------- */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              Instructions
              <span style={{ marginLeft: 8, fontWeight: 500, color: "#6b7280" }}>
                optional
              </span>
            </label>

            <textarea
              value={instructions}
              onChange={(e) =>
                setInstructions(e.target.value.slice(0, MAX_INSTRUCTION_LENGTH))
              }
              disabled={isRunning}
              rows={4}
              placeholder={
                "e.g. Use the company's own website as the source wherever you can. " +
                "For industry, use one or two words. Leave a column alone if you cannot " +
                "find solid evidence for it."
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e8eaee",
                fontSize: 13,
                lineHeight: 1.5,
                fontFamily: "inherit",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />

            <div style={{ marginTop: 4, fontSize: 11.5, color: "#9ca3af", textAlign: "right" }}>
              {instructions.length} / {MAX_INSTRUCTION_LENGTH}
            </div>
          </div>
        </>
      )}

      {/* ---------- Progress ---------- */}
      {job && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid #e8eaee",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "#0b1220",
            }}
          >
            <span>
              {job.status === "queued" && "Waiting to start…"}
              {job.status === "running" && (mode === "enrich" ? "Enriching…" : "Validating…")}
              {job.status === "completed" && "Finished"}
              {job.status === "partial" && "Finished with gaps"}
              {job.status === "failed" && "Failed"}
            </span>
            <span style={{ color: "#6b7280", fontWeight: 500 }}>
              {job.processedCount} / {job.contactCount}
            </span>
          </div>

          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "#eef0f3",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: job.status === "failed" ? "#ef4444" : "#3f9f42",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {job.errorMessage && (
            <div style={{ fontSize: 12.5, color: "#b91c1c", marginBottom: 10, lineHeight: 1.5 }}>
              {job.errorMessage}
            </div>
          )}

          {/* The real numbers behind the run. Web searches get their own line
              because they, not the contact count, are what drives the bill. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 16px",
              fontSize: 12.5,
              color: "#6b7280",
            }}
          >
            <span>Web searches</span>
            <span style={{ textAlign: "right", color: "#0b1220" }}>{job.webSearchCalls}</span>

            {isAdmin && (
              <>
                <span>Tokens</span>
                <span style={{ textAlign: "right", color: "#0b1220" }}>
                  {job.totalTokens.toLocaleString()}
                </span>

                <span>Estimated cost</span>
                <span style={{ textAlign: "right", color: "#0b1220" }}>
                  ${job.calculatedCost.toFixed(4)}
                </span>
              </>
            )}

            <span>Credits charged</span>
            <span style={{ textAlign: "right", color: "#0b1220" }}>{job.creditsCharged}</span>
          </div>
        </div>
      )}
    </CommonSidePanel>
  );
};

export default ValidationRunPanel;

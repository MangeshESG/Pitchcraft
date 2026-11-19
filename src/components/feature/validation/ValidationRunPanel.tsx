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

interface ValidationRunPanelProps {
  isOpen: boolean;
  isAdmin?: boolean;
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
  onClose,
  clientId,
  contactIds,
  onCompleted,
  onJobChange,
  onShowMessage,
}) => {
  const [checkTypes, setCheckTypes] = useState<CheckTypeInfo[]>([]);
  const [briefs, setBriefs] = useState<ContactFitBrief[]>([]);
  const [checkType, setCheckType] = useState<ValidationCheckType>("data_integrity");
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
  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onShowMessageRef.current = onShowMessage;
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

        setCheckTypes(types);
        setBriefs(savedBriefs);
        setBriefId(savedBriefs.find((b) => b.isDefault)?.id ?? savedBriefs[0]?.id ?? null);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message ?? "The panel could not be loaded.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId]);

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

  /** The picker's two groups, narrowed by whatever has been typed in the search. */
  const visibleFields = useMemo(() => {
    const needle = fieldSearch.trim().toLowerCase();

    const matches = (field: EnhancementField) =>
      !needle ||
      field.label.toLowerCase().includes(needle) ||
      field.key.toLowerCase().includes(needle);

    return {
      system: enhancementFields.filter((field) => !field.isCustom && matches(field)),
      custom: enhancementFields.filter((field) => field.isCustom && matches(field)),
    };
  }, [enhancementFields, fieldSearch]);

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
            latest.errorMessage || "The validation run failed.",
            "error"
          );
        } else if (latest.status === "partial") {
          onShowMessageRef.current?.(
            `${latest.processedCount} of ${latest.contactCount} contacts were validated. ${latest.failedCount} could not be.`,
            "info"
          );
        } else {
          onShowMessageRef.current?.(
            `${latest.processedCount} contact${latest.processedCount === 1 ? "" : "s"} validated.`,
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
      setError(startError?.message ?? "The validation run could not be started.");
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

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Validate contacts"
      width={520}
      footerContent={
        <>
          <button onClick={onClose} className="button secondary" style={lessPriorityButtonStyle}>
            {job?.isFinished ? "Close" : "Cancel"}
          </button>
          <button
            className="button primary"
            onClick={start}
            disabled={!canStart}
            style={{
              ...defaultButtonStyle,
              cursor: canStart ? "pointer" : "not-allowed",
              opacity: canStart ? 1 : 0.5,
            }}
          >
            {isStarting
              ? "Starting…"
              : isRunning
                ? "Running…"
                : job?.isFinished
                  ? "Run again"
                  : selected?.requiresFields
                    ? `Enhance ${contactIds.length} contact${contactIds.length === 1 ? "" : "s"}`
                    : `Validate ${contactIds.length} contact${contactIds.length === 1 ? "" : "s"}`}
          </button>
        </>
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

      {/* ---------- Which check ---------- */}
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Check</label>

        <div style={{ display: "grid", gap: 8 }}>
          {checkTypes.map((type) => {
            const isSelected = type.key === checkType;

            return (
              <button
                key={type.key}
                type="button"
                onClick={() => setCheckType(type.key)}
                disabled={isRunning}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 10,
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: 600, color: "#0b1220" }}>
                    {CHECK_ICONS[type.key] && (
                      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, flexShrink: 0 }}>
                        <img src={CHECK_ICONS[type.key]} alt="" style={{ width: "100%", height: "100%", maxWidth: "none", objectFit: "contain" }} />
                      </span>
                    )}
                    {VALIDATION_CHECK_LABELS[type.key] || type.label}
                  </span>


                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
                  {type.key === "email_verification"
                    ? type.description
                        .replace(/Prospeo/gi, "Stage 1")
                        .replace(/(?:an? AI )?web search/gi, "Stage 2")
                        .replace(/Hunter/gi, "Stage 3")
                    : type.description}
                </div>
              </button>
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
      {selected?.requiresFields && (
        <>
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              Columns to fill or check
              <span style={{ marginLeft: 8, fontWeight: 500, color: "#6b7280" }}>
                {selectedFields.length} selected
              </span>
            </label>

            <input
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              placeholder="Search columns…"
              disabled={isRunning}
              style={{
                width: "100%",
                padding: "8px 12px",
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #e8eaee",
                fontSize: 13,
              }}
            />

            <div
              style={{
                maxHeight: 240,
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

              {!isLoadingFields &&
                visibleFields.system.length === 0 &&
                visibleFields.custom.length === 0 && (
                  <div style={{ padding: "12px 10px", fontSize: 13, color: "#6b7280" }}>
                    No columns match that search.
                  </div>
                )}

              {(
                [
                  ["Contact fields", visibleFields.system],
                  ["Custom attributes", visibleFields.custom],
                ] as [string, EnhancementField[]][]
              ).map(([groupLabel, group]) =>
                group.length === 0 ? null : (
                  <div key={groupLabel} style={{ marginBottom: 4 }}>
                    <div
                      style={{
                        padding: "6px 10px 4px",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "#9ca3af",
                      }}
                    >
                      {groupLabel}
                    </div>

                    {group.map((field) => {
                      const isSelected = selectedFields.includes(field.key);
                      // At the ceiling the unselected rows go quiet rather
                      // than disappearing, so the limit explains itself
                      // instead of the list seeming to break.
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
                )
              )}
            </div>

            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              A column that already has a value is checked rather than
              overwritten — you will be shown the old value beside the proposed
              one, and nothing is written until you accept it.
              {selectedFields.length >= MAX_ENHANCEMENT_FIELDS &&
                ` ${MAX_ENHANCEMENT_FIELDS} columns is the most one run can cover.`}
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
                resize: "vertical",
              }}
            />

            <div style={{ marginTop: 4, fontSize: 11.5, color: "#9ca3af", textAlign: "right" }}>
              {instructions.length} / {MAX_INSTRUCTION_LENGTH}
            </div>
          </div>
        </>
      )}

      {/* ---------- Cost ---------- */}
      <div
        style={{
          marginBottom: 22,
          padding: "12px 14px",
          borderRadius: 10,
          background: "#f8f9fa",
          border: "1px solid #eef0f3",
          fontSize: 13,
          color: "#374151",
          lineHeight: 1.6,
        }}
      >
        <strong>{contactIds.length}</strong> contact
        {contactIds.length === 1 ? "" : "s"} selected · costs{" "}
        <strong>
          {credits} credit{credits === 1 ? "" : "s"}
        </strong>
        <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>
          {creditNoteFor(checkType)}
        </div>
      </div>

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
              {job.status === "running" && "Validating…"}
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

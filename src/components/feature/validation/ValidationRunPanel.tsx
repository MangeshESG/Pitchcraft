import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommonSidePanel from "../../common/CommonSidePanel";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../../styles/buttonStyles";
import {
  CheckTypeInfo,
  ContactFitBrief,
  ValidationCheckType,
  ValidationJob,
  creditsForContacts,
  fetchBriefs,
  fetchCheckTypes,
  fetchJob,
  runValidation,
} from "../../../api/contactValidation";

interface ValidationRunPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | number;
  contactIds: number[];
  /** Fires when a run finishes so the caller can refresh its grid. */
  onCompleted?: (job: ValidationJob) => void;
  onShowMessage?: (message: string, type: "success" | "error" | "info") => void;
}

/** How often a running job is polled. */
const POLL_MS = 3000;

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
  onClose,
  clientId,
  contactIds,
  onCompleted,
  onShowMessage,
}) => {
  const [checkTypes, setCheckTypes] = useState<CheckTypeInfo[]>([]);
  const [briefs, setBriefs] = useState<ContactFitBrief[]>([]);
  const [checkType, setCheckType] = useState<ValidationCheckType>("data_integrity");
  const [briefId, setBriefId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [job, setJob] = useState<ValidationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const credits = creditsForContacts(contactIds.length);
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

  // Reset between openings so a previous run's result never reads as this one's.
  useEffect(() => {
    if (isOpen) return;

    setJob(null);
    setError(null);
    setIsStarting(false);
    if (pollRef.current) clearTimeout(pollRef.current);
  }, [isOpen]);

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

        onCompleted?.(latest);

        if (latest.status === "failed") {
          onShowMessage?.(
            latest.errorMessage || "The validation run failed.",
            "error"
          );
        } else if (latest.status === "partial") {
          onShowMessage?.(
            `${latest.processedCount} of ${latest.contactCount} contacts were validated. ${latest.failedCount} could not be.`,
            "info"
          );
        } else {
          onShowMessage?.(
            `${latest.processedCount} contact${latest.processedCount === 1 ? "" : "s"} validated.`,
            "success"
          );
        }
      } catch (pollError: any) {
        setError(pollError?.message ?? "The run status could not be read.");
      }
    },
    [clientId, onCompleted, onShowMessage]
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
    (!selected?.requiresBrief || !!briefId);

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
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0b1220" }}>
                    {type.label}
                  </span>

                  {/* Web search is what a run actually costs, so which checks
                      use it is worth showing before one is chosen. */}
                  {type.usesWebSearch && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: "#fff7ed",
                        color: "#b45309",
                        border: "1px solid #fed7aa",
                        whiteSpace: "nowrap",
                      }}
                      title="This check researches the live web, which is the expensive part of a run."
                    >
                      Uses web search
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
                  {type.description}
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
              No briefs saved yet. Contact fit scores contacts against a brief, so
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
          One credit per ten contacts. Credits for contacts that come back with no
          result are refunded when the run finishes.
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

            <span>Tokens</span>
            <span style={{ textAlign: "right", color: "#0b1220" }}>
              {job.totalTokens.toLocaleString()}
            </span>

            <span>Estimated cost</span>
            <span style={{ textAlign: "right", color: "#0b1220" }}>
              ${job.calculatedCost.toFixed(4)}
            </span>

            <span>Credits charged</span>
            <span style={{ textAlign: "right", color: "#0b1220" }}>{job.creditsCharged}</span>
          </div>
        </div>
      )}
    </CommonSidePanel>
  );
};

export default ValidationRunPanel;

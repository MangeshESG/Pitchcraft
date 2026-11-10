import React from "react";
import {
  UsageSummary,
  formatModelNames,
  formatUsageCost,
  formatUsageDuration,
  formatUsageTokens,
} from "../../utils/usageSummary";

/**
 * The admin-only usage box on the Kraft emails screen.
 *
 * Three lines: the last contact, the per-contact average and the session
 * total. Each carries the models billed for it — research and writing
 * normally run on different models — plus tokens, dollars and time.
 *
 * Rendered in two places (the page header and the kraft side panel) from one
 * component, so the two cannot drift apart.
 */
interface UsageSummaryBoxProps {
  usage: UsageSummary;
  onClear?: () => void;
  /** "compact" is the page header; "panel" is the roomier side panel. */
  variant?: "compact" | "panel";
}

const NUMERIC_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const UsageSummaryBox: React.FC<UsageSummaryBoxProps> = ({
  usage,
  onClear,
  variant = "compact",
}) => {
  const compact = variant === "compact";
  const fontSize = compact ? 11 : 12.5;

  const labelStyle: React.CSSProperties = {
    fontWeight: 700,
    color: "#0f172a",
    minWidth: compact ? 38 : 46,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: NUMERIC_FONT,
    color: "#334155",
  };

  const separator = (
    <span style={{ color: "#cbd5e1", padding: "0 2px" }}>|</span>
  );

  const line = (
    label: string,
    first: React.ReactNode,
    tokens: number,
    cost: number,
    durationMs: number,
    durationTitle: string,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{first}</span>
      {separator}
      <span style={valueStyle} title="Tokens">
        T:{formatUsageTokens(tokens)}
      </span>
      {separator}
      <span style={valueStyle} title="Cost in US dollars">
        D:{formatUsageCost(cost)}
      </span>
      {separator}
      <span style={valueStyle} title={durationTitle}>
        {formatUsageDuration(durationMs)}
      </span>
    </div>
  );

  return (
    <div
      style={{
        padding: compact ? "6px 26px 6px 10px" : "12px 16px",
        background: compact ? "#f1f5f9" : "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: compact ? 6 : 8,
        fontSize,
        lineHeight: 1.5,
        position: "relative",
        marginBottom: compact ? 0 : 20,
      }}
    >
      {onClear && (
        <button
          onClick={onClear}
          title="Clear usage"
          style={{
            position: "absolute",
            top: compact ? 4 : 8,
            right: compact ? 6 : 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: compact ? 12 : 14,
            color: "#64748b",
          }}
        >
          ✕
        </button>
      )}

      {line(
        "Last",
        <span title="Models billed for this contact">
          M:{formatModelNames(usage.last.models)}
        </span>,
        usage.last.tokens,
        usage.last.cost,
        usage.last.durationMs,
        "Time this contact took",
      )}

      {line(
        "Av",
        <span title="Models used across this session">
          M:{formatModelNames(usage.average.models)}
        </span>,
        usage.average.tokens,
        usage.average.cost,
        usage.average.durationMs,
        "Average time per contact",
      )}

      {line(
        "Total",
        <span>Emails: {usage.total.emails}</span>,
        usage.total.tokens,
        usage.total.cost,
        usage.total.durationMs,
        "Total generation time this session",
      )}
    </div>
  );
};

export default UsageSummaryBox;

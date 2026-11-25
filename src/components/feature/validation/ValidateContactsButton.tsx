import React from "react";
import { RunMode } from "./checkGroups";

export interface ValidationRunProgress {
  processed: number;
  total: number;
  /** True once the run has stopped, however it ended. */
  isFinished: boolean;
  failed?: boolean;
}

/**
 * The Audience Assurance action in a bulk-action bar.
 *
 * Lists, segments and saved views each build their own selection toolbar, so
 * without one definition here the same action would be three sets of inline
 * styles and drift apart on the first change — which is exactly what happened
 * to the four score columns before `validationColumns` pulled them together.
 *
 * While a run is in flight the button becomes its progress bar. The run panel
 * can be closed and the grid used meanwhile, so without this the run would
 * disappear from the screen entirely until it finished.
 */
/** Sparkles — the Enrich action: data added rather than data scored. */
const SparkleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3.2 13.7 8l4.8 1.7-4.8 1.7L12 16.2 10.3 11.4 5.5 9.7 10.3 8 12 3.2Z"
      stroke="#3f9f42"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M18.2 15.1 19 17.2l2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"
      stroke="#3f9f42"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

/** Shield with a tick. */
const ShieldTickIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.9 7.5 10 4.3-1.1 7.5-5.4 7.5-10v-6L12 2.5Z"
      stroke="#3f9f42"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="m8.75 11.75 2.3 2.3 4.2-4.6"
      stroke="#3f9f42"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ValidateContactsButton: React.FC<{
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  progress?: ValidationRunProgress | null;
  /**
   * "toolbar" is the grid's own labelled button. "icon" is the square the
   * bulk-action bar uses, where every action is an icon and a tooltip.
   */
  variant?: "toolbar" | "icon";
  /**
   * Which of the two run panels this button opens. The two share everything
   * but their word and their picture, so they share a component rather than
   * a copy that drifts.
   */
  mode?: RunMode;
  /**
   * Overrides the word on the button. The selection bar has less room than the
   * toolbar and says "Validate" where the toolbar says "Validation checks".
   */
  label?: string;
}> = ({
  onClick,
  title,
  disabled = false,
  progress = null,
  variant = "toolbar",
  mode = "validate",
  label: labelOverride,
}) => {
  const isEnrich = mode === "enrich";
  const label = labelOverride ?? (isEnrich ? "Enrich" : "Validation checks");
  const tooltip = title ?? label;
  const Icon = isEnrich ? SparkleIcon : ShieldTickIcon;
  const runningWord = isEnrich ? "Enriching" : "Validating";
  const isRunning = !!progress && !progress.isFinished;
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="button secondary"
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
        title={
          isRunning
            ? `${runningWord} ${progress!.processed} of ${progress!.total} contacts — click to reopen`
            : tooltip
        }
        style={{
          background: "none",
          color: "#3f9f42",
          border: "none",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          padding: "0",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isRunning ? <span className="dt-spinner" aria-hidden="true" /> : <Icon size={22} />}
      </button>
    );
  }

  if (isRunning) {
    return (
      <button
        type="button"
        className="dt-btn-tertiary dt-validate-btn is-running"
        onClick={onClick}
        title={`${runningWord} ${progress!.processed} of ${progress!.total} contacts — click to reopen`}
      >
        <span className="dt-validate-progress">
          <span className="dt-validate-progress__head">
            <span className="dt-spinner" aria-hidden="true" />
            {runningWord}
            <span className="dt-validate-progress__count">
              {progress!.processed}/{progress!.total}
            </span>
          </span>
          <span className="dt-validate-progress__track">
            <span
              className="dt-validate-progress__fill"
              style={{ width: `${percent}%` }}
            />
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="dt-btn-tertiary dt-validate-btn"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      title={tooltip}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon />
      {label}
    </button>
  );
};

export default ValidateContactsButton;

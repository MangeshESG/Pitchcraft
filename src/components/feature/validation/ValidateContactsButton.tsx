import React from "react";

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
const ValidateContactsButton: React.FC<{
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  progress?: ValidationRunProgress | null;
}> = ({ onClick, title = "Validate contacts", disabled = false, progress = null }) => {
  const isRunning = !!progress && !progress.isFinished;
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

  if (isRunning) {
    return (
      <button
        type="button"
        className="dt-btn-tertiary dt-validate-btn is-running"
        onClick={onClick}
        title={`Validating ${progress!.processed} of ${progress!.total} contacts — click to reopen`}
      >
        <span className="dt-validate-progress">
          <span className="dt-validate-progress__head">
            <span className="dt-spinner" aria-hidden="true" />
            Validating
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
      title={title}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Shield with a tick. */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      Validation checks
    </button>
  );
};

export default ValidateContactsButton;

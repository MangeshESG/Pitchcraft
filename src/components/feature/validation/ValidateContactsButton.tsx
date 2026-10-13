import React from "react";

/**
 * The Audience Assurance action in a bulk-action bar.
 *
 * Lists, segments and saved views each build their own selection toolbar, so
 * without one definition here the same action would be three sets of inline
 * styles and drift apart on the first change — which is exactly what happened
 * to the four score columns before `validationColumns` pulled them together.
 */
const ValidateContactsButton: React.FC<{
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}> = ({ onClick, title = "Validate contacts", disabled = false }) => (
  <button
    type="button"
    className="dt-btn-tertiary"
    onClick={disabled ? undefined : onClick}
    aria-disabled={disabled}
    title={title}
    style={{
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    Validation checks
  </button>
);

export default ValidateContactsButton;

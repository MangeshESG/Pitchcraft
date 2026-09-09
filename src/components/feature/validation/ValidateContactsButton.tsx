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
}> = ({ onClick, title = "Validate contacts" }) => (
  <button
    type="button"
    className="button secondary"
    onClick={onClick}
    title={title}
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
      cursor: "pointer",
    }}
  >
    {/* Shield with a tick. */}
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
  </button>
);

export default ValidateContactsButton;

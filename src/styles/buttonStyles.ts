import React from 'react';

// Global canonical button styles for the app.
//
// Colours are read from CSS variables defined in src/index.css (:root) so there
// is a SINGLE source of truth shared with the .ct-btn-* CSS classes. Change a
// --btn-* value in index.css and every button updates.
//
// Brand green is #3f9f42.

// Default button style — primary / affirmative action (e.g. Save, Add contact).
// Brand light-green background with brand-green text.
export const defaultButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: '1px solid var(--btn-default-border)',
  background: 'var(--btn-default-bg)',
  color: 'var(--btn-default-fg)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

// Less priority button style — secondary action (e.g. Cancel, Upgrade).
// Neutral grey.
export const lessPriorityButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: '1.5px solid var(--btn-muted-border)',
  background: 'var(--btn-muted-bg)',
  color: 'var(--btn-muted-fg)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

// Danger button style — destructive action (e.g. Delete). Solid red.
export const dangerButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: '1px solid var(--btn-danger-border)',
  background: 'var(--btn-danger-bg)',
  color: 'var(--btn-danger-fg)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

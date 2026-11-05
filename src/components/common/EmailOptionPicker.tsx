/**
 * The choice between the emails one generation produced.
 *
 * A blueprint can ask for several options in a single call. The first is
 * already in the editor and already saved to the contact; the Previous and
 * Next buttons in the strip under the editor step through the rest. Moving to
 * an option puts it in the editor — so the manual instruction typed next
 * applies to the email actually chosen — and Save stores it in place of the
 * first.
 *
 * Nothing in the strip overlaps the email body: the editor is rendered
 * untouched and the controls sit below it. For a single-option generation —
 * what every blueprint produced before and what most still do — there is no
 * strip at all.
 */

import React, { useState } from 'react';
import { EmailOption, emailOptionTitle } from '../../utils/emailOptions';

interface EmailOptionPickerProps {
  options: EmailOption[];
  /** Which option is in the editor right now. */
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Saves the selected option to the contact. Omit to hide the button. */
  onSave?: () => void;
  isSaving?: boolean;
  /** The option currently stored on the contact, so the bar can say so. */
  savedIndex?: number | null;
  disabled?: boolean;
  /** The editor the strip belongs to. */
  children: React.ReactNode;
}

const BRAND = '#3f9f42';

interface StepButtonProps {
  direction: 'previous' | 'next';
  title: string;
  enabled: boolean;
  onClick: () => void;
}

/** One of the two labelled step buttons in the middle of the strip. */
const StepButton: React.FC<StepButtonProps> = ({ direction, title, enabled, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        height: '32px',
        padding: '0 14px',
        borderRadius: '6px',
        border: `1px solid ${enabled && hovered ? BRAND : '#d1d5db'}`,
        background: '#ffffff',
        color: enabled ? (hovered ? BRAND : '#374151') : '#9ca3af',
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: enabled ? 'pointer' : 'not-allowed',
        opacity: enabled ? 1 : 0.55,
        transition: 'color 0.15s, border-color 0.15s, opacity 0.15s',
      }}
    >
      {direction === 'previous' ? '‹ Previous' : 'Next ›'}
    </button>
  );
};

const EmailOptionPicker: React.FC<EmailOptionPickerProps> = ({
  options,
  selectedIndex,
  onSelect,
  onSave,
  isSaving = false,
  savedIndex = null,
  disabled = false,
  children,
}) => {
  // One email is not a choice: leave the editor exactly as it was.
  if (!options || options.length < 2) return <>{children}</>;

  const current = options[selectedIndex] ?? options[0];
  const isSaved = savedIndex === selectedIndex;
  const canPrevious = !disabled && selectedIndex > 0;
  const canNext = !disabled && selectedIndex < options.length - 1;

  return (
    <div>
      {children}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '8px 12px',
          marginTop: '10px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: '#fbfdfb',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
            Option {selectedIndex + 1} of {options.length}
            {isSaved && (
              <span style={{ color: BRAND, fontWeight: 600, marginLeft: '8px', fontSize: '12px' }}>
                ✓ saved
              </span>
            )}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#6b7280',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={current?.subject || undefined}
          >
            {emailOptionTitle(current)}
            {current?.subject ? ` — ${current.subject}` : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
          <StepButton
            direction="previous"
            title={`Previous option (${selectedIndex} of ${options.length})`}
            enabled={canPrevious}
            onClick={() => onSelect(selectedIndex - 1)}
          />
          <StepButton
            direction="next"
            title={`Next option (${selectedIndex + 2} of ${options.length})`}
            enabled={canNext}
            onClick={() => onSelect(selectedIndex + 1)}
          />
        </div>

        {/* Keeps the arrows in the middle of the strip and Save on the end. */}
        <div style={{ flex: 1, minWidth: 0 }} />

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || isSaving || isSaved}
            className="btn-default"
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              flex: '0 0 auto',
              cursor: disabled || isSaving || isSaved ? 'not-allowed' : 'pointer',
              opacity: disabled || isSaving || isSaved ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save this option'}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmailOptionPicker;

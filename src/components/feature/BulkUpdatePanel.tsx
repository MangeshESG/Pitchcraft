import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import CommonSidePanel from '../common/CommonSidePanel';
import ToastMessage from '../common/ToastMessage';
import { useToast } from '../../hooks/useToast';
import API_BASE_URL from '../../config';
import { RootState } from '../../Redux/store';
import {
  VALIDATION_BULK_UPDATE_FIELDS,
  validationBulkCheckFor,
} from './validation/validationColumns';
import {
  verifyCheckScores,
  type ValidationCheckType,
} from '../../api/contactValidation';

interface BulkUpdatePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  clientId: string;
  onUpdateComplete?: () => void; // Callback to refresh grid
}

interface ContactColumn {
  key: string;
  label: string;
  isCustomField?: boolean;
  disabled?: boolean;
  fieldId?: number; // For custom fields
  fieldType?: string; // Field type for custom fields
  options?: string[]; // Options for dropdown fields
  /**
   * Set on the four Audience Assurance entries, which are not contact columns
   * at all: picking one means "set this check to 100 for the selected
   * contacts", so it posts to the validation API rather than to the CRM's
   * field update.
   */
  checkType?: ValidationCheckType;
}

/** The only value a validation check can be bulk updated to. */
const VERIFIED_SCORE = '100';

const BulkUpdatePanel: React.FC<BulkUpdatePanelProps> = ({
  isOpen,
  onClose,
  selectedContactIds,
  clientId,
  onUpdateComplete
}) => {
  const [columns, setColumns] = useState<ContactColumn[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [updateValue, setUpdateValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { toast, showSuccess, showError, hideToast } = useToast();

  /**
   * Recorded against a hand-set score, so the note on the cell can say who
   * set it rather than only that somebody did. Empty when the store has no
   * name yet, which the API treats as "not stated".
   */
  const firstName = useSelector((state: RootState) => state.auth.firstName);
  const lastName = useSelector((state: RootState) => state.auth.lastName);
  const verifiedBy = [firstName, lastName].filter(Boolean).join(' ').trim();

  // Get selected column details
  const selectedColumnData = columns.find(col => col.key === selectedColumn);
  const hasContacts = selectedContactIds.length > 0;
  /**
   * An empty selection is never something the user can fix from in here, so the
   * form stays closed for business rather than letting them pick a field and a
   * value and only then refusing the update.
   */
  const canUpdate =
    hasContacts && !!selectedColumn && !!updateValue.trim() && !isUpdating;
  const formatLabel = (text: string) => {
    return text
      // snake_case → space
      .replace(/_/g, ' ')
      
      // camelCase / PascalCase → split
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      
      // fix cases like URL (U R L → URL)
      .replace(/\b([A-Z])\s([A-Z])\s([A-Z])\b/g, '$1$2$3')
      
      // lowercase everything first
      .toLowerCase()
      
      // fix special words
      .replace(/\blinked in\b/g, 'linkedin')
      .replace(/\burl\b/g, 'URL')
      
      // sentence case
      .replace(/^./, (str) => str.toUpperCase());
  };
  // Reset value when column changes. A validation check has only one value it
  // can be set to, so choosing one fills it in rather than asking for it.
  useEffect(() => {
    setUpdateValue(validationBulkCheckFor(selectedColumn) ? VERIFIED_SCORE : '');
  }, [selectedColumn]);

  // Fetch contact columns when panel opens
  useEffect(() => {
    if (isOpen && clientId) {
      fetchContactColumns();
    }
  }, [isOpen, clientId]);

  const fetchContactColumns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/get-contact-columns?clientId=${clientId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch contact columns');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const contactColumns = data.data.contactColumns || [];
        const customFields = data.data.customFields || [];
        
        // Convert and sort system fields alphabetically
        const systemColumns = contactColumns
          .map((col: string) => ({
            key: col,
            label: formatLabel(col),
            isCustomField: false,
            fieldType: 'text'
          }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        // Convert and sort custom fields alphabetically
        const customColumns = customFields
          .map((field: any) => {
            let options: string[] = [];
            if (field.options_json) {
              try {
                options = JSON.parse(field.options_json);
              } catch (e) {
                console.warn('Failed to parse options for field:', field.field_name);
              }
            }
            
            return {
              key: field.field_key,
              label: field.field_name,
              isCustomField: true,
              fieldId: field.id,
              fieldType: field.field_type,
              options: options
            };
          })
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        /**
         * The four Audience Assurance checks, offered beside the contact's own
         * fields.
         *
         * They sit in their own group at the end because they are a different
         * kind of thing: the fields above take any value the user types, these
         * take one action. Keeping them here rather than in a second panel is
         * what the user already reaches for — the contacts are selected, the
         * panel is open, and "these fifty are fine" is the same gesture as any
         * other bulk edit.
         */
        const validationColumns: ContactColumn[] = VALIDATION_BULK_UPDATE_FIELDS.map(
          (field) => ({
            key: field.key,
            label: field.label,
            isCustomField: false,
            fieldType: 'validation',
            checkType: field.checkType,
          })
        );

        // Combine with separator
        const formattedColumns: ContactColumn[] = [
          ...systemColumns,
          ...(customColumns.length > 0 ? [{ key: 'separator', label: '--- Custom Fields ---', isCustomField: false, disabled: true }] : []),
          ...customColumns,
          { key: 'validation-separator', label: '--- Validation checks ---', isCustomField: false, disabled: true },
          ...validationColumns
        ];
        
        setColumns(formattedColumns);
      }
    } catch (error) {
      console.error('Error fetching contact columns:', error);
      showError('Failed to load contact columns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!hasContacts) {
      showError('No contacts selected');
      return;
    }

    if (!selectedColumn || !updateValue.trim()) {
      showError('Please select a column and enter a value');
      return;
    }

    // Find the selected column details
    const selectedColumnData = columns.find(col => col.key === selectedColumn);
    if (!selectedColumnData) {
      showError('Selected column not found');
      return;
    }

    setIsUpdating(true);
    try {
      /**
       * A validation check is not a contact column, so it does not go through
       * the CRM's field update at all.
       *
       * It writes one score and a note saying a person put it there, which is
       * a decision about a check rather than a value on a record — and the
       * contact's three other checks keep whatever they found, because someone
       * overruling an Employment Match verdict has not thereby confirmed the
       * email address.
       */
      if (selectedColumnData.checkType) {
        const message = await verifyCheckScores(
          clientId,
          selectedContactIds.map((id) => parseInt(id)),
          selectedColumnData.checkType,
          verifiedBy || undefined
        );

        showSuccess(message);

        if (onUpdateComplete) {
          onUpdateComplete();
        }

        setSelectedColumn('');
        setUpdateValue('');
        onClose();
        return;
      }

      // Prepare the API payload
      const payload: any = {
        contactIds: selectedContactIds.map(id => parseInt(id)),
        fieldName: selectedColumnData.key,
        value: updateValue.trim(),
        isCustom: selectedColumnData.isCustomField || false
      };

      // Add fieldId for custom fields
      if (selectedColumnData.isCustomField && selectedColumnData.fieldId) {
        payload.fieldId = selectedColumnData.fieldId;
      }

      const response = await fetch(`${API_BASE_URL}/api/Crm/bulk-update-field`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to update contacts: ${response.status} ${response.statusText}`);
      }
      
      showSuccess(`Successfully updated ${selectedContactIds.length} contacts`);
      
      // Refresh the grid
      if (onUpdateComplete) {
        onUpdateComplete();
      }
      
      setSelectedColumn('');
      setUpdateValue('');
      onClose();
    } catch (error: any) {
      console.error('Error updating contacts:', error);
      // The validation API refuses in prose — no contacts selected, unknown
      // check — and that message is written for the user, so it is shown
      // rather than replaced with a generic failure.
      showError(error?.message || 'Failed to update contacts');
    } finally {
      setIsUpdating(false);
    }
  };

  // Render appropriate input based on field type
  const renderValueInput = () => {
    if (!selectedColumnData || selectedColumnData.disabled) {
      return (
        <input
          type="text"
          disabled
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            backgroundColor: "#f5f5f5"
          }}
          placeholder="Select a column first"
        />
      );
    }

    const fieldType = selectedColumnData.fieldType;

    switch (fieldType) {
      /**
       * A check has one value worth setting in bulk, so there is nothing to
       * type — the box says what the Update button will do instead of asking
       * for a number.
       *
       * Deliberately not a free number field. A score means "a check found
       * this", and letting someone write 73 into the column would put a
       * verdict in the grid that nothing ever reached.
       */
      case 'validation':
        return (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d5f0da",
              background: "#f1f8f2",
              color: "#2d7a30",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              ✓ Verified — set this score to 100
            </div>
            <div style={{ color: "#3f6b40" }}>
              {selectedColumnData.label} is set to 100 for the selected
              contact{selectedContactIds.length === 1 ? '' : 's'} and marked as
              updated by hand, which the score says when you hover it. The other
              three checks are left as they are.
            </div>
          </div>
        );

      case 'longtext':
        return (
          <textarea
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              minHeight: "80px",
              resize: "vertical"
            }}
            placeholder="Enter the new value"
            rows={3}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            placeholder="Enter a number"
          />
        );

      case 'boolean':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="booleanValue"
                value="true"
                checked={updateValue === 'true'}
                onChange={(e) => setUpdateValue(e.target.value)}
              />
              <span>True</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="booleanValue"
                value="false"
                checked={updateValue === 'false'}
                onChange={(e) => setUpdateValue(e.target.value)}
              />
              <span>False</span>
            </label>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        );

      case 'dropdown':
        return (
          <select
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="">Select an option</option>
            {selectedColumnData.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            placeholder="Enter the new value"
          />
        );
    }
  };

  return (
    <>
      <CommonSidePanel
        isOpen={isOpen}
        onClose={onClose}
        title="Bulk update contacts"
        footerContent={
          <>
            <button
              onClick={onClose}
              className="button secondary"
              style={{
                padding: "10px 32px",
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              disabled={!canUpdate}
              className="button primary"
              style={{
                padding: "10px 32px",
                background: canUpdate ? "#3f9f42" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: "24px",
                cursor: canUpdate ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {isUpdating ? "Updating..." : "Update"}
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 16, color: hasContacts ? '#666' : '#b42318' }}>
            {hasContacts
              ? `Update ${selectedContactIds.length} selected contact${selectedContactIds.length > 1 ? 's' : ''}`
              : 'No contacts selected. Close this panel, tick the contacts to update and open it again.'}
          </p>
        </div>

        {/* Column Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Select data field <span style={{ color: "red" }}>*</span>
          </label>
          {isLoading ? (
            <div style={{ padding: "8px 12px", color: "#666" }}>Loading columns...</div>
          ) : (
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="">Select a column to update</option>
              {columns.map((column) => (
                <option 
                  key={column.key} 
                  value={column.disabled ? "" : column.key}
                  disabled={column.disabled}
                  style={{
                    fontWeight: column.disabled ? 'bold' : 'normal',
                    color: column.disabled ? '#666' : '#000'
                  }}
                >
                  {column.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Value Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {selectedColumnData?.checkType ? (
              'What this will do'
            ) : (
              <>
                New value <span style={{ color: "red" }}>*</span>
              </>
            )}
          </label>
          {renderValueInput()}
        </div>
      </CommonSidePanel>
      
      {/* Toast Message - Outside the panel for proper z-index */}
      <ToastMessage
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        duration={6}
        position="bottom-center"
      />
    </>
  );
};

export default BulkUpdatePanel;
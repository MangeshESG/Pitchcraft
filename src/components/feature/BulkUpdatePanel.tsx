import React, { useState, useEffect } from 'react';
import CommonSidePanel from '../common/CommonSidePanel';
import ToastMessage from '../common/ToastMessage';
import { useToast } from '../../hooks/useToast';
import API_BASE_URL from '../../config';

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
}

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

  // Get selected column details
  const selectedColumnData = columns.find(col => col.key === selectedColumn);
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
    // Reset value when column changes
  useEffect(() => {
    setUpdateValue('');
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

        // Combine with separator
        const formattedColumns: ContactColumn[] = [
          ...systemColumns,
          ...(customColumns.length > 0 ? [{ key: 'separator', label: '--- Custom Fields ---', isCustomField: false, disabled: true }] : []),
          ...customColumns
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
    if (!selectedColumn || !updateValue.trim()) {
      showError('Please select a column and enter a value');
      return;
    }

    if (selectedContactIds.length === 0) {
      showError('No contacts selected');
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
    } catch (error) {
      console.error('Error updating contacts:', error);
      showError('Failed to update contacts');
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
              disabled={!selectedColumn || !updateValue.trim() || isUpdating}
              className="button primary"
              style={{
                padding: "10px 32px",
                background: selectedColumn && updateValue.trim() && !isUpdating ? "#3f9f42" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: "24px",
                cursor: selectedColumn && updateValue.trim() && !isUpdating ? "pointer" : "not-allowed",
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
          <p style={{ marginBottom: 16, color: '#666' }}>
            Update {selectedContactIds.length} selected contact{selectedContactIds.length > 1 ? 's' : ''}
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
            New value <span style={{ color: "red" }}>*</span>
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
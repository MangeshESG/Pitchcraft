import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import React from "react";

// Enhanced column configuration with type information
interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'url' | 'email' | 'custom';
  formatter?: (value: any, item: any) => React.ReactNode | string;
  searchable?: boolean;
  sortable?: boolean;
}

interface DynamicContactsTableProps {
  data: any[];
  isLoading: boolean;
  search: string;
  setSearch: (s: string) => void;
  showCheckboxes?: boolean;
  paginated?: boolean;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (pg: number) => void;
  selectedItems?: Set<string>;
  onSelectItem?: (id: string) => void;
  totalItems?: number;

  // Dynamic configuration
  autoGenerateColumns?: boolean;
  customColumns?: ColumnConfig[];
  excludeFields?: string[];
  includeFields?: string[];
  customFormatters?: { [key: string]: (value: any, item: any) => React.ReactNode | string };
  searchFields?: string[];
  primaryKey?: string;

  // UI customization
  viewMode?: "table" | "detail";
  detailTitle?: string;
  detailDescription?: string;
  onBack?: () => void;
  onAddItem?: () => void;
  hideSearch?: boolean;
  customHeader?: React.ReactNode;
  onColumnsChange?: (columns: ColumnConfig[]) => void;
}

const DynamicContactsTable: React.FC<DynamicContactsTableProps> = ({
  data,
  isLoading,
  search,
  setSearch,
  showCheckboxes = false,
  paginated = false,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  selectedItems,
  onSelectItem,
  totalItems,

  // Dynamic props
  autoGenerateColumns = true,
  customColumns,
  excludeFields = [],
  includeFields = [],
  customFormatters = {},
  searchFields = [],
  primaryKey = 'id',

  // UI props
  viewMode = "table",
  detailTitle,
  detailDescription,
  onBack,
  onAddItem,
  hideSearch = false,
  customHeader,
  onColumnsChange,
}) => {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const columnPanelRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false); // ADD THIS LINE

  

  // Auto-generate columns from data
  const generateColumnsFromData = useCallback((dataArray: any[]): ColumnConfig[] => {
    if (!dataArray || dataArray.length === 0) return [];

    const sampleItem = dataArray[0];
    const generatedColumns: ColumnConfig[] = [];

    // Add checkbox column if needed
    if (showCheckboxes) {
      generatedColumns.push({
        key: "checkbox",
        label: "",
        visible: true,
        width: "40px",
        type: 'custom',
        searchable: false,
        sortable: false
      });
    }

    // Get all unique keys from all items (in case some items have different fields)
    const allKeys = new Set<string>();
    dataArray.slice(0, 10).forEach(item => { // Check first 10 items for performance
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    Array.from(allKeys).forEach(key => {
      // Skip if in exclude list
      if (excludeFields.includes(key)) return;
      
      // Skip if include list exists and key is not in it
      if (includeFields.length > 0 && !includeFields.includes(key)) return;

      const sampleValue = sampleItem[key];
      const columnType = detectColumnType(key, sampleValue);
      const label = generateLabel(key);

      generatedColumns.push({
        key,
        label,
        visible: getDefaultVisibility(key, columnType),
        type: columnType,
        searchable: isSearchableType(columnType),
        sortable: true,
        formatter: customFormatters[key] || getDefaultFormatter(columnType)
      });
    });

    return generatedColumns;
  },[showCheckboxes, excludeFields, includeFields]);

  // Detect column type based on key name and value
  const detectColumnType = (key: string, value: any): ColumnConfig['type'] => {
    const keyLower = key.toLowerCase();
    
    // URL detection
    if (keyLower.includes('url') || keyLower.includes('website') || keyLower.includes('linkedin')) {
      return 'url';
    }
    
    // Email detection
    if (keyLower.includes('email')) {
      return 'email';
    }
    
    // Date detection
    if (keyLower.includes('date') || keyLower.includes('time') || keyLower.includes('at') || keyLower.includes('timestamp')) {
      return 'date';
    }
    
    // Boolean detection
    if (typeof value === 'boolean' || keyLower.includes('success') || keyLower.includes('active') || keyLower.includes('enabled')) {
      return 'boolean';
    }
    
    // Number detection
    if (typeof value === 'number' || keyLower.includes('count') || keyLower.includes('amount') || keyLower.includes('id')) {
      return 'number';
    }
    
    return 'string';
  };

  // Generate human-readable label from key
  const generateLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim();
  };

  // Determine default visibility
  const getDefaultVisibility = (key: string, type: ColumnConfig['type']): boolean => {
    const keyLower = key.toLowerCase();
    
    // Always hide these
    if (['body', 'html', 'content', 'description', 'notes'].some(hide => keyLower.includes(hide))) {
      return false;
    }
    
    // Always show these important fields
    if (['name', 'email', 'company', 'title', 'type', 'status', 'date'].some(show => keyLower.includes(show))) {
      return true;
    }
    
    // Show first 8 columns by default
    return true;
  };

  // Check if column type is searchable
  const isSearchableType = (type: ColumnConfig['type']): boolean => {
    return ['string', 'email', 'url'].includes(type || 'string');
  };

  // Get default formatter for column type
  const getDefaultFormatter = (type: ColumnConfig['type']) => {
    switch (type) {
      case 'date':
        return (value: any) => {
          if (!value) return '-';
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          } catch {
            return value;
          }
        };
      
      case 'boolean':
        return (value: any) => {
          if (value === true) return '✅';
          if (value === false) return '❌';
          if (typeof value === 'string') {
            if (value.toLowerCase().includes('success') || value.toLowerCase().includes('true')) return '✅';
            if (value.toLowerCase().includes('fail') || value.toLowerCase().includes('false')) return '❌';
          }
          return value || '-';
        };
      
      case 'url':
        return (value: any, item: any) => {
          if (!value || value === '-') return '-';
          const url = value.startsWith('http') ? value : `https://${value}`;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0066cc", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              {value.length > 30 ? value.substring(0, 30) + '...' : value}
            </a>
          );
        };
      
      case 'email':
        return (value: any) => {
          if (!value || value === '-') return '-';
          return (
            <a
              href={`mailto:${value}`}
              style={{ color: "#0066cc", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              {value}
            </a>
          );
        };
      
      default:
        return (value: any) => value || '-';
    }
  };

  // Initialize columns
useEffect(() => {
  // Only initialize once when data is available
  if (!isInitializedRef.current && data.length > 0) {
    if (customColumns) {
      setColumns(customColumns);
    } else if (autoGenerateColumns) {
      const generatedColumns = generateColumnsFromData(data);
      setColumns(generatedColumns);
    }
    isInitializedRef.current = true;
  }
  // Update columns when customColumns prop changes
  else if (customColumns && isInitializedRef.current) {
    setColumns(customColumns);
  }
}, [data.length, customColumns, autoGenerateColumns]); // Simplified dependencies

// ADD this useEffect after the column initialization one:
useEffect(() => {
  // Reset initialization when switching between different data types
  if (data.length === 0) {
    isInitializedRef.current = false;
  }
}, [data.length]);

  // Dynamic filtering
const getFilteredData = () => {
  if (!search.trim()) return data;

  const searchLower = search.toLowerCase();
  const fieldsToSearch = searchFields.length > 0 ? searchFields : 
    columns.filter(col => col.searchable !== false).map(col => col.key);

  const filtered = data.filter(item => {
    return fieldsToSearch.some(field => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });
  
  console.log('Search Debug:', {
    searchTerm: search,
    originalCount: data.length,
    filteredCount: filtered.length
  });
  
  return filtered;
};

  // Get value with formatting
 // REPLACE the getFormattedValue function with:
// REPLACE the getFormattedValue function with:
const getFormattedValue = (item: any, column: ColumnConfig): React.ReactNode => {
  if (column.key === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={selectedItems?.has(item[primaryKey]?.toString()) || false}
        onChange={() => onSelectItem?.(item[primaryKey]?.toString())}
      />
    );
  }

  const rawValue = item[column.key];
  
  // First try custom formatters from props
  if (customFormatters[column.key]) {
    return customFormatters[column.key](rawValue, item);
  }
  
  // Then try column's own formatter
  if (column.formatter) {
    return column.formatter(rawValue, item);
  }

  return rawValue || '-';
};

  // Filter and paginate data
  const filteredData = getFilteredData();
  const displayData = paginated
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

  const visibleColumns = columns.filter(col => col.visible);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const updatedColumns = columns.map(col =>
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    setColumns(updatedColumns);
    if (onColumnsChange) {
      onColumnsChange(updatedColumns);
    }
  };

  // Handle select all
// Simplest solution - Replace the entire handleSelectAll function with this:
const handleSelectAll = (checked: boolean) => {
  if (!onSelectItem) return;

  const allIds = filteredData.map(item => item[primaryKey]?.toString()).filter(Boolean);
  
  console.log('Select All Debug:', {
    checked,
    filteredDataLength: filteredData.length,
    allDataLength: data.length,
    searchTerm: search,
    idsToSelect: allIds.length
  });

  // Use Promise.resolve to break out of React's batch update
  allIds.forEach(id => {
    Promise.resolve().then(() => {
      if (checked && !selectedItems?.has(id)) {
        onSelectItem(id);
      } else if (!checked && selectedItems?.has(id)) {
        onSelectItem(id);
      }
    });
  });
};

  // Click outside handler for column panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPanelRef.current && !columnPanelRef.current.contains(event.target as Node)) {
        setShowColumnPanel(false);
      }
    };

    if (showColumnPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnPanel]);

  return (
    <>
      {/* Detail View Header */}
      {viewMode === "detail" && (
        <>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 20, gap: 16 }}>
            {onBack && (
              <button className="button secondary" onClick={onBack}>
                ← Back
              </button>
            )}
            {detailTitle && <h2 style={{ margin: 0 }}>{detailTitle}</h2>}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <button
                className="button secondary"
                onClick={() => setShowColumnPanel(!showColumnPanel)}
              >
                Show/Hide Columns
              </button>
              {onAddItem && (
                <button className="button primary" onClick={onAddItem}>
                  + Add Item
                </button>
              )}
            </div>
          </div>

          {detailDescription && (
            <div style={{ marginBottom: 16, color: "#555" }}>
              {detailDescription}
            </div>
          )}
        </>
      )}

      {/* Custom Header */}
      {customHeader}

      {/* Search and Info Bar */}
      {!hideSearch && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <input
            type="text"
            className="search-input"
            style={{ minWidth: 300 }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {totalItems !== undefined && (
            <span style={{ fontWeight: 500 }}>
              Total: {totalItems} items
            </span>
          )}
{showCheckboxes && selectedItems && selectedItems.size > 0 && (
  <span style={{ color: "#186bf3" }}>
    {filteredData.every(item => selectedItems.has(item[primaryKey]?.toString()))
      ? `${filteredData.length} selected`
      : `${selectedItems.size} selected`}
  </span>
)}
          {viewMode === "table" && (
            <button
              className="button secondary"
              onClick={() => setShowColumnPanel(!showColumnPanel)}
              style={{ marginLeft: "auto" }}
            >
              ⚙️ Columns
            </button>
          )}
        </div>
      )}

      {/* Main Content with Sidebar */}
      <div style={{ position: "relative", display: "flex" }}>
        {/* Table Content */}
        <div
          style={{
            flex: 1,
            marginRight: showColumnPanel ? "300px" : "0",
            transition: "margin-right 0.3s ease",
          }}
        >
          <div className="contacts-table-wrapper">
            <table className="contacts-table">
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column.key} style={{ width: column.width }}>
                      {column.key === "checkbox" ? (
<input
  type="checkbox"
  checked={
    filteredData.length > 0 &&
    filteredData.every(item => selectedItems?.has(item[primaryKey]?.toString()))
  }
  onChange={(e) => handleSelectAll(e.target.checked)}
/>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : displayData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="text-center">
                      {search                        ? "No items found matching your search."
                        : "No items found."}
                    </td>
                  </tr>
                ) : (
                  displayData.map((item) => (
                    <tr
                      key={item[primaryKey]}
                      className={
                        selectedItems?.has(item[primaryKey]?.toString())
                          ? "selected"
                          : ""
                      }
                    >
                      {visibleColumns.map((column) => (
                        <td key={column.key}>
                          {getFormattedValue(item, column)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paginated &&
            filteredData.length > 0 &&
            typeof onPageChange === "function" && (
              <div className="pagination-wrapper d-flex justify-between align-center mt-20">
                <div className="pagination-info">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
                  {filteredData.length} items
                </div>
                <div className="pagination-controls d-flex align-center gap-10">
                  <button
                    className="pagination-btn"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Column Settings Sidebar Panel */}
        {showColumnPanel && (
          <div
            ref={columnPanelRef}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "300px",
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px 0 0 8px",
              boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
              padding: "20px",
              zIndex: 1000,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                paddingBottom: "10px",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>
                Show/Hide columns
              </h3>
              <button
                onClick={() => setShowColumnPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {columns
                .filter((col) => col.key !== "checkbox")
                .map((column) => (
                  <label
                    key={column.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      backgroundColor: column.visible ? "#f0f7ff" : "#f9f9f9",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.key)}
                      style={{
                        marginRight: "12px",
                        transform: "scale(1.2)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontWeight: column.visible ? "500" : "400",
                          color: column.visible ? "#333" : "#666",
                          display: "block",
                        }}
                      >
                        {column.label}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#888",
                          textTransform: "capitalize",
                        }}
                      >
                        {column.type} • {column.key}
                      </span>
                    </div>
                    {column.visible && (
                      <span
                        style={{
                          color: "#28a745",
                          fontSize: "12px",
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </label>
                ))}
            </div>

            {/* Column Statistics */}
            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                background: "#f8f9fa",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              <div>Total columns: {columns.filter(c => c.key !== 'checkbox').length}</div>
              <div>Visible: {columns.filter(c => c.visible && c.key !== 'checkbox').length}</div>
              <div>Hidden: {columns.filter(c => !c.visible && c.key !== 'checkbox').length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay when panel is open */}
      {showColumnPanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
          onClick={() => setShowColumnPanel(false)}
        />
      )}
    </>
  );
};

export default DynamicContactsTable;
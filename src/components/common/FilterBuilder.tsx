import React, { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../config";

type FieldType = "text" | "number" | "date" | "boolean" | "dropdown";
type JoinOperator = "AND" | "OR";

interface FieldOption {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  joinWithPrevious?: JoinOperator;
}

export interface Props<T> {
  data: T[];
  fields: FieldOption[];
  onFiltered: (data: T[]) => void;
  initialFiltersJson?: string;
  onFiltersJsonChange?: (filtersJson: string, conditions: FilterCondition[]) => void;
  hideApplyButton?: boolean;
  saveViewConfig?: {
    clientId: string | number;
    dataFileIds?: number[];
    segmentIds?: number[];
    onSuccess?: (view: any) => void;
    onError?: (message: string) => void;
  };
}

const operatorsByType: Record<FieldType, { value: string; label: string }[]> = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "startsWith", label: "Starts with" },
    { value: "endsWith", label: "Ends with" },
    { value: "notEquals", label: "Not equals" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "gte", label: ">=" },
    { value: "lte", label: "<=" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
  ],
  boolean: [
    { value: "equals", label: "Is" },
    { value: "notEquals", label: "Is not" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not equals" },
  ],
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #d8e6d9",
  borderRadius: 16,
  background:
    "linear-gradient(180deg, rgba(248,252,248,1) 0%, rgba(255,255,255,1) 100%)",
  boxShadow: "0 10px 30px rgba(35, 79, 38, 0.08)",
  overflow: "hidden",
};

const controlStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 14px",
  border: "1px solid #cfe1d1",
  borderRadius: 12,
  background: "#fff",
  color: "#1f2937",
  fontSize: 14,
  outline: "none",
};

const actionButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d4d4d8",
  background: "#fff",
  color: "#1f2937",
  fontWeight: 600,
  cursor: "pointer",
};

const generateId = () => Math.random().toString(36).substring(2, 9);
const viewMetaKey = (clientId: string | number) =>
  `crm_view_meta_${clientId}`;

const saveViewMeta = (
  clientId: string | number,
  viewId: number,
  meta: { filtersJson: string; dataFileIds: number[]; segmentIds: number[] }
) => {
  try {
    const existingRaw = localStorage.getItem(viewMetaKey(clientId));
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    existing[String(viewId)] = meta;
    localStorage.setItem(viewMetaKey(clientId), JSON.stringify(existing));
  } catch (error) {
    console.warn("Failed to persist view metadata:", error);
  }
};

const createCondition = (joinWithPrevious: JoinOperator = "AND"): FilterCondition => ({
  id: generateId(),
  field: "",
  operator: "",
  value: "",
  joinWithPrevious,
});

const parseFiltersJson = (filtersJson?: string): FilterCondition[] => {
  if (!filtersJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(filtersJson);
    if (!parsed || !Array.isArray(parsed.conditions)) {
      return [];
    }
    return parsed.conditions as FilterCondition[];
  } catch {
    return [];
  }
};

const normalizeFieldType = (value?: string): FieldType => {
  switch ((value || "").toLowerCase()) {
    case "number":
      return "number";
    case "date":
    case "datetime":
      return "date";
    case "boolean":
      return "boolean";
    case "dropdown":
      return "dropdown";
    case "longtext":
    case "text":
    default:
      return "text";
  }
};

const normalizeCustomFieldKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getRowValue = <T extends Record<string, any>>(row: T, fieldKey: string) => {
  const directValue = row[fieldKey];

  if (directValue !== undefined) {
    return directValue;
  }

  if (!fieldKey.startsWith("custom_")) {
    return directValue;
  }

  const customKey = fieldKey.replace(/^custom_/, "");
  const customFields =
    row.customFields && typeof row.customFields === "object"
      ? row.customFields
      : {};

  if (customKey in customFields) {
    return customFields[customKey];
  }

  const normalizedTarget = normalizeCustomFieldKey(customKey);
  const matchedEntry = Object.entries(customFields).find(
    ([key]) => normalizeCustomFieldKey(key) === normalizedTarget
  );

  if (matchedEntry) {
    return matchedEntry[1];
  }

  if (customKey in row) {
    return row[customKey];
  }

  return directValue;
};

const isCompleteCondition = (condition: FilterCondition) =>
  condition.field.trim() &&
  condition.operator.trim() &&
  String(condition.value ?? "").trim() !== "";

function FilterBuilder<T extends Record<string, any>>({
  data,
  fields,
  onFiltered,
  initialFiltersJson,
  onFiltersJsonChange,
  hideApplyButton = false,
  saveViewConfig,
}: Props<T>) {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    createCondition(),
  ]);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [isSavingView, setIsSavingView] = useState(false);

  const completeConditions = useMemo(
    () => conditions.filter((condition) => isCompleteCondition(condition)),
    [conditions]
  );

  const filtersJson = useMemo(
    () =>
      JSON.stringify({
        logic: "CHAIN",
        conditions: completeConditions.map((condition, index) => ({
          ...condition,
          joinWithPrevious: index === 0 ? undefined : condition.joinWithPrevious || "AND",
        })),
      }),
    [completeConditions]
  );

  useEffect(() => {
    const parsed = parseFiltersJson(initialFiltersJson);
    if (parsed.length === 0) {
      setConditions([createCondition()]);
      return;
    }

    const hydrated = parsed.map((condition, index) => ({
      ...condition,
      id: condition.id || generateId(),
      joinWithPrevious: index === 0 ? undefined : condition.joinWithPrevious || "AND",
    }));

    setConditions(hydrated);
  }, [initialFiltersJson]);

  useEffect(() => {
    onFiltersJsonChange?.(filtersJson, completeConditions);
  }, [filtersJson, completeConditions, onFiltersJsonChange]);

  const addCondition = () => {
    setConditions((previous) => [...previous, createCondition("AND")]);
  };

  const removeCondition = (id: string) => {
    setConditions((previous) => {
      const updatedConditions = previous.filter((condition) => condition.id !== id);
      if (updatedConditions.length === 0) {
        return [createCondition()];
      }
      return updatedConditions;
    });
  };

  const updateCondition = (
    id: string,
    key: keyof FilterCondition,
    value: any
  ) => {
    setConditions((previous) =>
      previous.map((condition) => {
        if (condition.id !== id) {
          return condition;
        }

        if (key === "field") {
          return {
            ...condition,
            field: value,
            operator: "",
            value: "",
          };
        }

        return {
          ...condition,
          [key]: value,
        };
      })
    );
  };

  const getField = (key: string) => fields.find((field) => field.key === key);

  const evaluateCondition = (row: T, condition: FilterCondition) => {
    const value = getRowValue(row, condition.field);
    const normalizedFieldType = normalizeFieldType(
      getField(condition.field)?.type
    );

    switch (condition.operator) {
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());

      case "equals":
        if (normalizedFieldType === "boolean") {
          return String(value).toLowerCase() === String(condition.value).toLowerCase();
        }
        return String(value).toLowerCase() === String(condition.value).toLowerCase();

      case "notEquals":
        if (normalizedFieldType === "boolean") {
          return String(value).toLowerCase() !== String(condition.value).toLowerCase();
        }
        return String(value).toLowerCase() !== String(condition.value).toLowerCase();

      case "startsWith":
        return String(value)
          .toLowerCase()
          .startsWith(String(condition.value).toLowerCase());

      case "endsWith":
        return String(value)
          .toLowerCase()
          .endsWith(String(condition.value).toLowerCase());

      case "gt":
        return Number(value) > Number(condition.value);

      case "lt":
        return Number(value) < Number(condition.value);

      case "gte":
        return Number(value) >= Number(condition.value);

      case "lte":
        return Number(value) <= Number(condition.value);

      case "before":
        return new Date(value) < new Date(condition.value);

      case "after":
        return new Date(value) > new Date(condition.value);

      default:
        return true;
    }
  };

  const applyFilters = () => {
    if (completeConditions.length === 0) {
      onFiltered(data);
      return;
    }

    const filtered = data.filter((row) =>
      completeConditions.reduce((result, condition, index) => {
        const conditionResult = evaluateCondition(row, condition);

        if (index === 0) {
          return conditionResult;
        }

        return condition.joinWithPrevious === "OR"
          ? result || conditionResult
          : result && conditionResult;
      }, true)
    );

    onFiltered(filtered);
  };

  const clearFilters = () => {
    setConditions([createCondition()]);
    onFiltered(data);
  };

  const handleSaveView = async () => {
    if (!saveViewConfig || !viewName.trim()) {
      return;
    }

    if (completeConditions.length === 0) {
      saveViewConfig.onError?.("Add at least one complete filter before saving.");
      return;
    }

    setIsSavingView(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/Crm/create-view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: Number(saveViewConfig.clientId),
          name: viewName.trim(),
          description: viewDescription.trim(),
          filtersJson,
          dataFileIds: (saveViewConfig.dataFileIds || []).filter((id) => id !== -1),
          segmentIds: saveViewConfig.segmentIds || [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save filter view");
      }

      const savedView = await response.json();
      if (savedView?.id != null) {
        saveViewMeta(saveViewConfig.clientId, Number(savedView.id), {
          filtersJson,
          dataFileIds: (saveViewConfig.dataFileIds || []).filter(
            (id) => id !== -1
          ),
          segmentIds: saveViewConfig.segmentIds || [],
        });
      }

      setViewName("");
      setViewDescription("");
      setShowSavePanel(false);
      saveViewConfig.onSuccess?.(savedView);
    } catch (error) {
      console.error("Error saving filter view:", error);
      saveViewConfig.onError?.("Failed to save filter. Please try again.");
    } finally {
      setIsSavingView(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid #e5efe5",
          background:
            "linear-gradient(135deg, rgba(239,248,240,1) 0%, rgba(248,252,248,1) 100%)",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#16331a",
            marginBottom: 4,
          }}
        >
          Build Filter Rules
        </div>
        <div style={{ fontSize: 13, color: "#527057" }}>
          Mix AND and OR between conditions to build more flexible contact views.
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {conditions.map((condition, index) => {
          const field = getField(condition.field);
          const normalizedFieldType = normalizeFieldType(field?.type);
          const operators = field
            ? operatorsByType[normalizedFieldType]
            : operatorsByType.text;

          return (
            <div key={condition.id} style={{ marginBottom: index === conditions.length - 1 ? 0 : 16 }}>
              {index > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "0 0 12px 0",
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: "#d8e6d9" }} />
                  <div
                    style={{
                      display: "inline-flex",
                      padding: 4,
                      borderRadius: 999,
                      background: "#eef6ef",
                      border: "1px solid #d5e7d7",
                      gap: 4,
                    }}
                  >
                    {(["AND", "OR"] as JoinOperator[]).map((joinOperator) => (
                      <button
                        key={`${condition.id}-${joinOperator}`}
                        type="button"
                        onClick={() =>
                          updateCondition(condition.id, "joinWithPrevious", joinOperator)
                        }
                        style={{
                          minWidth: 54,
                          height: 32,
                          borderRadius: 999,
                          border: "none",
                          background:
                            (condition.joinWithPrevious || "AND") === joinOperator
                              ? "#3f9f42"
                              : "transparent",
                          color:
                            (condition.joinWithPrevious || "AND") === joinOperator
                              ? "#fff"
                              : "#2f4a33",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {joinOperator}
                      </button>
                    ))}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "#d8e6d9" }} />
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1fr 1fr auto",
                  gap: 12,
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid #e0ece1",
                  background: "#ffffff",
                }}
              >
                <select
                  value={condition.field}
                  onChange={(event) =>
                    updateCondition(condition.id, "field", event.target.value)
                  }
                  style={controlStyle}
                >
                  <option value="">Choose field</option>
                  {fields.map((fieldOption) => (
                    <option key={fieldOption.key} value={fieldOption.key}>
                      {fieldOption.label}
                    </option>
                  ))}
                </select>

                <select
                  value={condition.operator}
                  onChange={(event) =>
                    updateCondition(condition.id, "operator", event.target.value)
                  }
                  style={controlStyle}
                >
                  <option value="">Operator</option>
                  {operators.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>

                {normalizedFieldType === "dropdown" ? (
                  <select
                    value={condition.value}
                    onChange={(event) =>
                      updateCondition(condition.id, "value", event.target.value)
                    }
                    style={controlStyle}
                  >
                    <option value="">Select value</option>
                    {field?.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : normalizedFieldType === "boolean" ? (
                  <select
                    value={condition.value}
                    onChange={(event) =>
                      updateCondition(condition.id, "value", event.target.value)
                    }
                    style={controlStyle}
                  >
                    <option value="">Select value</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={
                      normalizedFieldType === "number"
                        ? "number"
                        : normalizedFieldType === "date"
                        ? "date"
                        : "text"
                    }
                    value={condition.value}
                    onChange={(event) =>
                      updateCondition(condition.id, "value", event.target.value)
                    }
                    placeholder="Enter value"
                    style={controlStyle}
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeCondition(condition.id)}
                  aria-label="Remove condition"
                  style={{
                    width: 44,
                    minWidth: 44,
                    height: 44,
                    borderRadius: 14,
                    border: "1px solid #f1d5d8",
                    background: "#fff5f5",
                    color: "#b42318",
                    fontSize: 22,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  x
                </button>
              </div>
            </div>
          );
        })}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={addCondition}
            style={{
              ...actionButtonStyle,
              borderColor: "#b9d4bc",
              color: "#24572b",
              background: "#f4fbf4",
            }}
          >
            + Add Condition
          </button>

          <button type="button" onClick={clearFilters} style={actionButtonStyle}>
            Clear Filters
          </button>

          {!hideApplyButton && (
            <button
              type="button"
              onClick={applyFilters}
              style={{
                ...actionButtonStyle,
                borderColor: "#3f9f42",
                background: "#3f9f42",
                color: "#fff",
              }}
            >
              Apply Filters
            </button>
          )}

          {saveViewConfig && (
            <button
              type="button"
              onClick={() => setShowSavePanel((previous) => !previous)}
              style={{
                ...actionButtonStyle,
                borderColor: "#c6d9f8",
                background: "#f7faff",
                color: "#2158a8",
              }}
            >
              {showSavePanel ? "Hide Save Panel" : "Save as View"}
            </button>
          )}

          <div
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 999,
              background: "#f6faf6",
              color: "#47624c",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {completeConditions.length} ready rule{completeConditions.length === 1 ? "" : "s"}
          </div>
        </div>

        {saveViewConfig && showSavePanel && (
          <div
            style={{
              marginTop: 18,
              padding: 18,
              borderRadius: 16,
              border: "1px solid #d9e4f7",
              background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            }}
          >
            <div style={{ fontWeight: 700, color: "#1f3d68", marginBottom: 12 }}>
              Save this filter as a reusable view
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <input
                type="text"
                placeholder="View name"
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                style={controlStyle}
              />

              <input
                type="text"
                placeholder="Short description"
                value={viewDescription}
                onChange={(event) => setViewDescription(event.target.value)}
                style={controlStyle}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#5e728f" }}>
              The current chain of AND/OR rules will be stored in `filters_json`.
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowSavePanel(false)}
                style={actionButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveView}
                disabled={isSavingView || !viewName.trim()}
                style={{
                  ...actionButtonStyle,
                  borderColor: "#3f9f42",
                  background: "#3f9f42",
                  color: "#fff",
                  opacity: isSavingView || !viewName.trim() ? 0.7 : 1,
                  cursor:
                    isSavingView || !viewName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {isSavingView ? "Saving..." : "Save View"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterBuilder;

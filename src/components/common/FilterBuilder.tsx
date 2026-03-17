import React, { useMemo, useState } from "react";
import API_BASE_URL from "../../config";

/* ---------------- TYPES ---------------- */

type FieldType = "text" | "number" | "date" | "boolean" | "dropdown";

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
}

export interface Props<T>  {
  data: T[];
  fields: FieldOption[];
  onFiltered: (data: T[]) => void;
  saveViewConfig?: {
    clientId: string | number;
    dataFileIds?: number[];
    segmentIds?: number[];
    onSuccess?: (view: any) => void;
    onError?: (message: string) => void;
  };
}

/* ---------------- OPERATORS ---------------- */

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
    { value: "notEquals", label: "Not Equals" },
  ],
};

const generateId = () => Math.random().toString(36).substring(2, 9);

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

/* ---------------- COMPONENT ---------------- */

function FilterBuilder<T extends Record<string, any>>({
  data,
  fields,
  onFiltered,
  saveViewConfig,
}: Props<T>) {
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [isSavingView, setIsSavingView] = useState(false);

  const [conditions, setConditions] = useState<FilterCondition[]>([
    {
      id: generateId(),
      field: "",
      operator: "",
      value: "",
    },
  ]);

  /* ---------------- CONDITION MANAGEMENT ---------------- */

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: generateId(), field: "", operator: "", value: "" },
    ]);
  };

  const removeCondition = (id: string) => {
    const updatedConditions = conditions.filter((c) => c.id !== id);
    setConditions(updatedConditions.length > 0 ? updatedConditions : [
      { id: generateId(), field: "", operator: "", value: "" },
    ]);
  };

  const updateCondition = (
    id: string,
    key: keyof FilterCondition,
    value: any
  ) => {
    setConditions(
      conditions.map((c) =>
        c.id === id ? { ...c, [key]: value } : c
      )
    );
  };

  const getField = (key: string) => fields.find((f) => f.key === key);

  const completeConditions = useMemo(
    () =>
      conditions.filter(
        (condition) =>
          condition.field.trim() &&
          condition.operator.trim() &&
          String(condition.value ?? "").trim() !== ""
      ),
    [conditions]
  );

  const filtersJson = useMemo(
    () =>
      JSON.stringify({
        logic,
        conditions: completeConditions,
      }),
    [completeConditions, logic]
  );

  /* ---------------- FILTER LOGIC ---------------- */

  const applyFilters = () => {
    if (completeConditions.length === 0) {
      onFiltered(data);
      return;
    }

    const filtered = data.filter((row) => {
      const results = completeConditions.map((cond) => {
        const value = getRowValue(row, cond.field);
        const normalizedFieldType = normalizeFieldType(
          getField(cond.field)?.type
        );

        switch (cond.operator) {
          case "contains":
            return String(value)
              .toLowerCase()
              .includes(String(cond.value).toLowerCase());

          case "equals":
            return String(value).toLowerCase() ===
              String(cond.value).toLowerCase();

          case "notEquals":
            return String(value).toLowerCase() !==
              String(cond.value).toLowerCase();

          case "startsWith":
            return String(value)
              .toLowerCase()
              .startsWith(String(cond.value).toLowerCase());

          case "endsWith":
            return String(value)
              .toLowerCase()
              .endsWith(String(cond.value).toLowerCase());

          case "gt":
            return Number(value) > Number(cond.value);

          case "lt":
            return Number(value) < Number(cond.value);

          case "gte":
            return Number(value) >= Number(cond.value);

          case "lte":
            return Number(value) <= Number(cond.value);

          case "before":
            return new Date(value) < new Date(cond.value);

          case "after":
            return new Date(value) > new Date(cond.value);

          case "true":
            return normalizedFieldType === "boolean"
              ? String(value).toLowerCase() === "true"
              : true;

          case "false":
            return normalizedFieldType === "boolean"
              ? String(value).toLowerCase() === "false"
              : true;

          default:
            return true;
        }
      });

      return logic === "AND"
        ? results.every(Boolean)
        : results.some(Boolean);
    });

    onFiltered(filtered);
  };

  const clearFilters = () => {
    setLogic("AND");
    setConditions([
      {
        id: generateId(),
        field: "",
        operator: "",
        value: "",
      },
    ]);
    onFiltered(data);
  };

  const handleSaveView = async () => {
    if (!saveViewConfig || !viewName.trim()) return;

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
          dataFileIds: (saveViewConfig.dataFileIds || []).filter(
            (id) => id !== -1
          ),
          segmentIds: saveViewConfig.segmentIds || [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save filter view");
      }

      const savedView = await response.json();
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

  /* ---------------- UI ---------------- */

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      {/* LOGIC SELECTOR */}

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 10 }}>Match</label>

        <select
          value={logic}
          onChange={(e) =>
            setLogic(e.target.value as "AND" | "OR")
          }
        >
          <option value="AND">All conditions (AND)</option>
          <option value="OR">Any condition (OR)</option>
        </select>
      </div>

      {/* CONDITIONS */}

      {conditions.map((condition) => {
        const field = getField(condition.field);

        const normalizedFieldType = normalizeFieldType(field?.type);
        const operators = field
          ? operatorsByType[normalizedFieldType]
          : operatorsByType.text;

        return (
          <div
            key={condition.id}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
            }}
          >
            {/* FIELD */}

            <select
              value={condition.field}
              onChange={(e) =>
                updateCondition(
                  condition.id,
                  "field",
                  e.target.value
                )
              }
            >
              <option value="">Field</option>

              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* OPERATOR */}

            <select
              value={condition.operator}
              onChange={(e) =>
                updateCondition(
                  condition.id,
                  "operator",
                  e.target.value
                )
              }
            >
              <option value="">Operator</option>

              {operators.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            {/* VALUE */}

            {normalizedFieldType === "dropdown" ? (
              <select
                value={condition.value}
                onChange={(e) =>
                  updateCondition(
                    condition.id,
                    "value",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>

                {field?.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : normalizedFieldType === "boolean" ? (
              <select
                value={condition.value}
                onChange={(e) =>
                  updateCondition(
                  condition.id,
                  "value",
                  e.target.value
                )
              }
              >
                <option value="">Select</option>
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
                onChange={(e) =>
                  updateCondition(
                    condition.id,
                    "value",
                    e.target.value
                  )
                }
                placeholder="Value"
              />
            )}

            {/* REMOVE */}

            <button
              onClick={() => removeCondition(condition.id)}
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* ACTIONS */}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={addCondition}>+ Add Condition</button>

        <button onClick={clearFilters}>Clear Filters</button>

        <button
          style={{
            background: "#3f9f42",
            color: "#fff",
            padding: "6px 12px",
          }}
          onClick={applyFilters}
        >
          Apply Filters
        </button>

        {saveViewConfig && (
          <button
            onClick={() => setShowSavePanel((prev) => !prev)}
            style={{
              background: "#fff",
              color: "#3f9f42",
              padding: "6px 12px",
              border: "1px solid #3f9f42",
              borderRadius: 4,
            }}
          >
            {showSavePanel ? "Close" : "Save as View"}
          </button>
        )}
      </div>

      {saveViewConfig && showSavePanel && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#f8fafc",
          }}
        >
          <div style={{ marginBottom: 12, fontWeight: 600 }}>
            Save current filters as a view
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="text"
              placeholder="View name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />

            <textarea
              placeholder="Description"
              value={viewDescription}
              onChange={(e) => setViewDescription(e.target.value)}
              rows={3}
            />

            <div style={{ color: "#666", fontSize: 13 }}>
              {completeConditions.length} complete filter
              {completeConditions.length === 1 ? "" : "s"} ready to save
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowSavePanel(false)}>Cancel</button>
              <button
                onClick={handleSaveView}
                disabled={isSavingView || !viewName.trim()}
                style={{
                  background: "#3f9f42",
                  color: "#fff",
                  padding: "6px 12px",
                  border: "1px solid #3f9f42",
                  borderRadius: 4,
                  opacity: isSavingView || !viewName.trim() ? 0.7 : 1,
                  cursor:
                    isSavingView || !viewName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {isSavingView ? "Saving..." : "Save View"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBuilder;

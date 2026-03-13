import React, { useState, useMemo } from "react";

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
    { value: "true", label: "True" },
    { value: "false", label: "False" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not Equals" },
  ],
};

const generateId = () => Math.random().toString(36).substring(2, 9);

/* ---------------- COMPONENT ---------------- */

function FilterBuilder<T extends Record<string, any>>({
  data,
  fields,
  onFiltered,
}: Props<T>) {
  const [logic, setLogic] = useState<"AND" | "OR">("AND");

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
    setConditions(conditions.filter((c) => c.id !== id));
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

  /* ---------------- FILTER LOGIC ---------------- */

  const applyFilters = () => {
    const filtered = data.filter((row) => {
      const results = conditions.map((cond) => {
        const value = row[cond.field];

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

        const operators = field
          ? operatorsByType[field.type]
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

            {field?.type === "dropdown" ? (
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

                {field.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : field?.type === "boolean" ? (
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
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <input
                type={
                  field?.type === "number"
                    ? "number"
                    : field?.type === "date"
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
      </div>
    </div>
  );
}

export default FilterBuilder;
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE_URL from "../../config";
import type {
  FieldType,
  FilterCondition,
  FilterGroup,
  JoinOperator,
} from "./filterTypes";
import {
  buildTrackingIndexesForGroups,
  conditionRequiresCampaign,
  evaluateTrackingCondition,
  getCampaignOptions,
  hasRequiredConditionContext,
} from "../../utils/trackingFilterUtils";

interface FieldOption {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  contextType?: "campaign";
}

type FieldCategoryKey = "system" | "custom" | "email";

interface FieldCategory {
  key: FieldCategoryKey;
  label: string;
  fields: FieldOption[];
}

export interface Props<T> {
  data: T[];
  fields: FieldOption[];
  onFiltered: (data: T[]) => void;
  initialFiltersJson?: string;
  onFiltersJsonChange?: (filtersJson: string, conditions: FilterCondition[]) => void;
  hideApplyButton?: boolean;
  clientId?: string | number;
  saveViewConfig?: {
    clientId: string | number;
    dataFileIds?: number[];
    segmentIds?: number[];
    useAllDataFiles?: boolean;
    excludedDataFileIds?: number[];
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
  overflow: "visible",
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

const fieldPickerPopoverStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  zIndex: 40,
  width: "min(430px, calc(100vw - 64px))",
  maxWidth: "100%",
  maxHeight: 430,
  borderRadius: 20,
  border: "1px solid #d9e5db",
  background: "#fff",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.14)",
  overflow: "hidden",
};

const generateId = () => Math.random().toString(36).substring(2, 9);
const viewMetaKey = (clientId: string | number) =>
  `crm_view_meta_${clientId}`;

const sortStringsAsc = (values: string[]) =>
  [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

const sortByLabelAsc = <T extends { label: string }>(items: T[]) =>
  [...items].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );

const getFieldCategory = (field: FieldOption): FieldCategoryKey => {
  if (field.key.startsWith("custom_")) {
    return "custom";
  }

  const normalizedKey = field.key.toLowerCase();
  const normalizedLabel = field.label.toLowerCase();

  if (normalizedKey === "email") {
    return "system";
  }

  if (
    field.contextType === "campaign" ||
    normalizedKey.startsWith("tracking_") ||
    (normalizedKey.includes("email") && normalizedKey !== "email") ||
    (normalizedLabel.includes("email") && normalizedKey !== "email")
  ) {
    return "email";
  }

  return "system";
};

const getFieldCategories = (sortedFields: FieldOption[]): FieldCategory[] => {
  const categories: FieldCategory[] = [
    { key: "system", label: "System Fields", fields: [] },
    { key: "custom", label: "Custom Fields", fields: [] },
    { key: "email", label: "Email", fields: [] },
  ];

  sortedFields.forEach((field) => {
    const category = categories.find(
      (entry) => entry.key === getFieldCategory(field)
    );
    category?.fields.push(field);
  });

  return categories.filter((category) => category.fields.length > 0);
};

const saveViewMeta = (
  clientId: string | number,
  viewId: number,
  meta: {
    filtersJson: string;
    dataFileIds: number[];
    segmentIds: number[];
    useAllDataFiles?: boolean;
    excludedDataFileIds?: number[];
  }
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

const createGroup = (joinWithPrevious: JoinOperator = "AND"): FilterGroup => ({
  id: generateId(),
  conditions: [createCondition()],
  joinWithPrevious,
});

const parseFiltersJson = (filtersJson?: string): FilterGroup[] => {
  if (!filtersJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(filtersJson);
    if (!parsed) {
      return [];
    }

    if (Array.isArray(parsed.groups)) {
      return parsed.groups as FilterGroup[];
    }

    if (Array.isArray(parsed.conditions)) {
      return [
        {
          id: generateId(),
          conditions: parsed.conditions as FilterCondition[],
        },
      ];
    }

    return [];
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
  String(condition.value ?? "").trim() !== "" &&
  hasRequiredConditionContext(condition);

function FilterBuilder<T extends Record<string, any>>({
  data,
  fields,
  onFiltered,
  initialFiltersJson,
  onFiltersJsonChange,
  hideApplyButton = false,
  clientId,
  saveViewConfig,
}: Props<T>) {
  const [groups, setGroups] = useState<FilterGroup[]>([createGroup()]);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [isSavingView, setIsSavingView] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [activeFieldPicker, setActiveFieldPicker] = useState<{
    groupId: string;
    conditionId: string;
  } | null>(null);
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  const [activeFieldCategory, setActiveFieldCategory] =
    useState<FieldCategoryKey>("system");
  const [campaignOptions, setCampaignOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const fieldPickerRef = useRef<HTMLDivElement | null>(null);

  const sortedFields = useMemo(() => sortByLabelAsc(fields), [fields]);
  const fieldCategories = useMemo(
    () => getFieldCategories(sortedFields),
    [sortedFields]
  );
  const sortedFieldOptions = useMemo(() => {
    const map = new Map<string, string[]>();
    fields.forEach((field) => {
      if (field.options && field.options.length > 0) {
        map.set(field.key, sortStringsAsc(field.options));
      }
    });
    return map;
  }, [fields]);
  const resolvedClientId = clientId ?? saveViewConfig?.clientId;
  const hasCampaignAwareFields = useMemo(
    () => fields.some((field) => field.contextType === "campaign"),
    [fields]
  );

  const completeGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          conditions: group.conditions.filter((condition) =>
            isCompleteCondition(condition)
          ),
        }))
        .filter((group) => group.conditions.length > 0),
    [groups]
  );

  const completeConditions = useMemo(
    () => completeGroups.flatMap((group) => group.conditions),
    [completeGroups]
  );

  const filtersJson = useMemo(
    () =>
      JSON.stringify({
        logic: "GROUPS",
        groups: completeGroups.map((group, groupIndex) => ({
          id: group.id,
          joinWithPrevious:
            groupIndex === 0 ? undefined : group.joinWithPrevious || "AND",
          conditions: group.conditions.map((condition, index) => ({
            ...condition,
            joinWithPrevious:
              index === 0 ? undefined : condition.joinWithPrevious || "AND",
          })),
        })),
      }),
    [completeGroups]
  );

  useEffect(() => {
    const parsed = parseFiltersJson(initialFiltersJson);
    if (parsed.length === 0) {
      setGroups([createGroup()]);
      return;
    }

    const hydratedGroups = parsed.map((group, groupIndex) => ({
      id: group.id || generateId(),
      joinWithPrevious:
        groupIndex === 0 ? undefined : group.joinWithPrevious || "AND",
      conditions: (group.conditions || []).map((condition, index) => ({
        ...condition,
        id: condition.id || generateId(),
        joinWithPrevious:
          index === 0 ? undefined : condition.joinWithPrevious || "AND",
      })),
    }));

    setGroups(
      hydratedGroups.length > 0 ? hydratedGroups : [createGroup()]
    );
  }, [initialFiltersJson]);

  useEffect(() => {
    onFiltersJsonChange?.(filtersJson, completeConditions);
  }, [filtersJson, completeConditions, onFiltersJsonChange]);

  useEffect(() => {
    if (!activeFieldPicker) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        fieldPickerRef.current &&
        !fieldPickerRef.current.contains(event.target as Node)
      ) {
        setActiveFieldPicker(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [activeFieldPicker]);

  useEffect(() => {
    if (!hasCampaignAwareFields || !resolvedClientId) {
      setCampaignOptions([]);
      return;
    }

    let isMounted = true;

    getCampaignOptions(resolvedClientId)
      .then((options) => {
        if (isMounted) {
          setCampaignOptions(options);
        }
      })
      .catch((error) => {
        console.error("Failed to load campaign options:", error);
        if (isMounted) {
          setCampaignOptions([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hasCampaignAwareFields, resolvedClientId]);

  const addGroup = () => {
    setGroups((previous) => [...previous, createGroup("AND")]);
  };

  const removeGroup = (groupId: string) => {
    setGroups((previous) => {
      const updatedGroups = previous.filter((group) => group.id !== groupId);
      if (updatedGroups.length === 0) {
        return [createGroup()];
      }
      return updatedGroups;
    });
  };

  const addCondition = (groupId: string) => {
    setGroups((previous) =>
      previous.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [...group.conditions, createCondition("AND")],
            }
          : group
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setGroups((previous) =>
      previous.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        const updatedConditions = group.conditions.filter(
          (condition) => condition.id !== conditionId
        );

        return {
          ...group,
          conditions:
            updatedConditions.length === 0 ? [createCondition()] : updatedConditions,
        };
      })
    );
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    key: keyof FilterCondition,
    value: any
  ) => {
    setGroups((previous) =>
      previous.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          conditions: group.conditions.map((condition) => {
            if (condition.id !== conditionId) {
              return condition;
            }

            if (key === "field") {
              return {
                ...condition,
                field: value,
                operator: "",
                value: "",
                context: undefined,
              };
            }

            return {
              ...condition,
              [key]: value,
            };
          }),
        };
      })
    );
  };

  const updateGroupJoin = (groupId: string, value: JoinOperator) => {
    setGroups((previous) =>
      previous.map((group, index) =>
        group.id === groupId && index !== 0
          ? { ...group, joinWithPrevious: value }
          : group
      )
    );
  };

  const getField = (key: string) => fields.find((field) => field.key === key);

  const openFieldPicker = (
    groupId: string,
    conditionId: string,
    selectedFieldKey?: string
  ) => {
    const selectedField = selectedFieldKey ? getField(selectedFieldKey) : undefined;
    const fallbackCategory = selectedField
      ? getFieldCategory(selectedField)
      : fieldCategories[0]?.key || "system";

    setActiveFieldPicker({ groupId, conditionId });
    setActiveFieldCategory(fallbackCategory);
    setFieldSearchTerm("");
  };

  const filteredFieldCategories = useMemo(() => {
    const normalizedSearch = fieldSearchTerm.trim().toLowerCase();

    return fieldCategories
      .map((category) => ({
        ...category,
        fields: category.fields.filter((field) =>
          normalizedSearch.length === 0
            ? true
            : field.label.toLowerCase().includes(normalizedSearch) ||
              field.key.toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((category) => category.fields.length > 0);
  }, [fieldCategories, fieldSearchTerm]);

  useEffect(() => {
    if (filteredFieldCategories.length === 0) {
      return;
    }

    const categoryExists = filteredFieldCategories.some(
      (category) => category.key === activeFieldCategory
    );

    if (!categoryExists) {
      setActiveFieldCategory(filteredFieldCategories[0].key);
    }
  }, [filteredFieldCategories, activeFieldCategory]);

  const evaluateCondition = (
    row: T,
    condition: FilterCondition,
    campaignIndexes: Awaited<ReturnType<typeof buildTrackingIndexesForGroups>>
  ) => {
    if (conditionRequiresCampaign(condition)) {
      return evaluateTrackingCondition(
        row as Record<string, any>,
        condition,
        campaignIndexes
      );
    }

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

  const applyFilters = async () => {
    setIsApplyingFilters(true);

    try {
      const campaignIndexes =
        resolvedClientId && completeGroups.length > 0
          ? await buildTrackingIndexesForGroups(resolvedClientId, completeGroups)
          : new Map();

      if (completeGroups.length === 0) {
        onFiltered(data);
        return;
      }

      const filtered = data.filter((row) =>
        completeGroups.reduce((groupResult, group, groupIndex) => {
          const conditionResult = group.conditions.reduce(
            (result, condition, index) => {
              const evaluation = evaluateCondition(row, condition, campaignIndexes);

              if (index === 0) {
                return evaluation;
              }

              return condition.joinWithPrevious === "OR"
                ? result || evaluation
                : result && evaluation;
            },
            true as boolean
          );

          if (groupIndex === 0) {
            return conditionResult;
          }

          return group.joinWithPrevious === "OR"
            ? groupResult || conditionResult
            : groupResult && conditionResult;
        }, true as boolean)
      );

      onFiltered(filtered);
    } catch (error) {
      console.error("Failed to apply filters:", error);
    } finally {
      setIsApplyingFilters(false);
    }
  };

  const clearFilters = () => {
    setGroups([createGroup()]);
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
          useAllDataFiles: saveViewConfig.useAllDataFiles || false,
          excludedDataFileIds: saveViewConfig.excludedDataFileIds || [],
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
          useAllDataFiles: saveViewConfig.useAllDataFiles,
          excludedDataFileIds: saveViewConfig.excludedDataFileIds,
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
          Build filter rules
        </div>
        <div style={{ fontSize: 13, color: "#527057" }}>
          Mix AND and OR inside groups, then combine groups for advanced logic.
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {groups.map((group, groupIndex) => (
          <div
            key={group.id}
            style={{ marginBottom: groupIndex === groups.length - 1 ? 0 : 24 }}
          >
            {groupIndex > 0 && (
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
                      key={`${group.id}-${joinOperator}`}
                      type="button"
                      onClick={() => updateGroupJoin(group.id, joinOperator)}
                      style={{
                        minWidth: 54,
                        height: 32,
                        borderRadius: 999,
                        border: "none",
                        background:
                          (group.joinWithPrevious || "AND") === joinOperator
                            ? "#3f9f42"
                            : "transparent",
                        color:
                          (group.joinWithPrevious || "AND") === joinOperator
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
                border: "1px solid #e0ece1",
                borderRadius: 16,
                padding: 16,
                background: "#ffffff",
              }}
            >
              {groups.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#24572b",
                      fontSize: 14,
                    }}
                  >
                    Group {groupIndex + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    style={{
                      border: "1px solid #f1d5d8",
                      background: "#fff5f5",
                      color: "#b42318",
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Remove group
                  </button>
                </div>
              )}

              {group.conditions.map((condition, index) => {
                const field = getField(condition.field);
                const normalizedFieldType = normalizeFieldType(field?.type);
                const requiresCampaign = field?.contextType === "campaign";
                const isFieldPickerOpen =
                  activeFieldPicker?.groupId === group.id &&
                  activeFieldPicker?.conditionId === condition.id;
                const operators = field
                  ? operatorsByType[normalizedFieldType]
                  : operatorsByType.text;
                const sortedOperators = sortByLabelAsc(operators);
                const dropdownOptions = field?.options
                  ? sortedFieldOptions.get(field.key) || sortStringsAsc(field.options)
                  : [];
                const visibleFieldCategories = filteredFieldCategories;
                const selectedFieldCategory =
                  visibleFieldCategories.find(
                    (category) => category.key === activeFieldCategory
                  ) || visibleFieldCategories[0];

                return (
                  <div
                    key={condition.id}
                    style={{
                      marginBottom:
                        index === group.conditions.length - 1
                          ? isFieldPickerOpen
                            ? 440
                            : 0
                          : isFieldPickerOpen
                          ? 456
                          : 16,
                      position: "relative",
                      zIndex: isFieldPickerOpen ? 5 : 1,
                    }}
                  >
                    {index > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          margin: "0 0 12px 0",
                        }}
                      >
                        <div
                          style={{ flex: 1, height: 1, background: "#d8e6d9" }}
                        />
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
                          {(["AND", "OR"] as JoinOperator[]).map(
                            (joinOperator) => (
                              <button
                                key={`${condition.id}-${joinOperator}`}
                                type="button"
                                onClick={() =>
                                  updateCondition(
                                    group.id,
                                    condition.id,
                                    "joinWithPrevious",
                                    joinOperator
                                  )
                                }
                                style={{
                                  minWidth: 54,
                                  height: 32,
                                  borderRadius: 999,
                                  border: "none",
                                  background:
                                    (condition.joinWithPrevious || "AND") ===
                                    joinOperator
                                      ? "#3f9f42"
                                      : "transparent",
                                  color:
                                    (condition.joinWithPrevious || "AND") ===
                                    joinOperator
                                      ? "#fff"
                                      : "#2f4a33",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                {joinOperator}
                              </button>
                            )
                          )}
                        </div>
                        <div
                          style={{ flex: 1, height: 1, background: "#d8e6d9" }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: requiresCampaign
                          ? "1.2fr 1fr 1fr 1fr auto"
                          : "1.3fr 1fr 1fr auto",
                        gap: 12,
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid #e0ece1",
                        background: "#ffffff",
                        overflow: "visible",
                      }}
                    >
                      <div
                        style={{ position: "relative", minWidth: 0 }}
                        ref={isFieldPickerOpen ? fieldPickerRef : null}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            isFieldPickerOpen
                              ? setActiveFieldPicker(null)
                              : openFieldPicker(group.id, condition.id, condition.field)
                          }
                          style={{
                            ...controlStyle,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: condition.field ? "#1f2937" : "#6b7280",
                            }}
                          >
                            {field?.label || "Choose field"}
                          </span>
                          <span
                            style={{
                              marginLeft: 10,
                              color: "#5b6f5f",
                              fontSize: 12,
                            }}
                          >
                            {isFieldPickerOpen ? "▲" : "▼"}
                          </span>
                        </button>

                        {isFieldPickerOpen && (
                          <div style={fieldPickerPopoverStyle}>
                            <div
                              style={{
                                padding: 14,
                                borderBottom: "1px solid #e7efe8",
                              }}
                            >
                              <input
                                value={fieldSearchTerm}
                                onChange={(event) =>
                                  setFieldSearchTerm(event.target.value)
                                }
                                placeholder="Search fields"
                                autoFocus
                                style={{
                                  ...controlStyle,
                                  minHeight: 42,
                                  borderRadius: 14,
                                }}
                              />
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "170px minmax(0, 1fr)",
                                height: 300,
                              }}
                            >
                              <div
                                style={{
                                  borderRight: "1px solid #e7efe8",
                                  background: "#fbfdfb",
                                  overflowY: "auto",
                                  padding: 10,
                                  minHeight: 0,
                                }}
                              >
                                {visibleFieldCategories.map((category) => (
                                  <button
                                    key={category.key}
                                    type="button"
                                    onClick={() =>
                                      setActiveFieldCategory(category.key)
                                    }
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "12px 14px",
                                      borderRadius: 14,
                                      border: "none",
                                      background:
                                        category.key ===
                                        (selectedFieldCategory?.key || activeFieldCategory)
                                          ? "#edf7ee"
                                          : "transparent",
                                      color: "#1f2937",
                                      fontWeight:
                                        category.key ===
                                        (selectedFieldCategory?.key || activeFieldCategory)
                                          ? 700
                                          : 600,
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    <span>{category.label}</span>
                                    <span style={{ color: "#5f7664" }}>›</span>
                                  </button>
                                ))}
                              </div>

                              <div
                                style={{
                                  overflowY: "auto",
                                  padding: 10,
                                  background: "#fff",
                                  minHeight: 0,
                                }}
                              >
                                {selectedFieldCategory ? (
                                  <>
                                    <div
                                      style={{
                                        padding: "8px 12px 10px",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        letterSpacing: 0.3,
                                        textTransform: "uppercase",
                                        color: "#5f7664",
                                      }}
                                    >
                                      {selectedFieldCategory.label}
                                    </div>
                                    {selectedFieldCategory.fields.map((fieldOption) => (
                                      <button
                                        key={fieldOption.key}
                                        type="button"
                                        onClick={() => {
                                          updateCondition(
                                            group.id,
                                            condition.id,
                                            "field",
                                            fieldOption.key
                                          );
                                          setActiveFieldPicker(null);
                                          setFieldSearchTerm("");
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "12px 14px",
                                          borderRadius: 14,
                                          border: "none",
                                          background:
                                            condition.field === fieldOption.key
                                              ? "#f2fbf2"
                                              : "transparent",
                                          color: "#1f2937",
                                          fontWeight:
                                            condition.field === fieldOption.key
                                              ? 700
                                              : 500,
                                          cursor: "pointer",
                                          textAlign: "left",
                                        }}
                                      >
                                        {fieldOption.label}
                                      </button>
                                    ))}
                                    <div style={{ height: 12 }} />
                                  </>
                                ) : (
                                  <div
                                    style={{
                                      padding: "16px 14px",
                                      color: "#6b7280",
                                      fontSize: 14,
                                    }}
                                  >
                                    No matching fields found.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <select
                        value={condition.operator}
                        onChange={(event) =>
                          updateCondition(
                            group.id,
                            condition.id,
                            "operator",
                            event.target.value
                          )
                        }
                        style={controlStyle}
                      >
                        <option value="">Operator</option>
                        {sortedOperators.map((operator) => (
                          <option key={operator.value} value={operator.value}>
                            {operator.label}
                          </option>
                        ))}
                      </select>

                      {normalizedFieldType === "dropdown" ? (
                        <select
                          value={condition.value}
                          onChange={(event) =>
                            updateCondition(
                              group.id,
                              condition.id,
                              "value",
                              event.target.value
                            )
                          }
                          style={controlStyle}
                        >
                          <option value="">Select value</option>
                          {dropdownOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : normalizedFieldType === "boolean" ? (
                        <select
                          value={condition.value}
                          onChange={(event) =>
                            updateCondition(
                              group.id,
                              condition.id,
                              "value",
                              event.target.value
                            )
                          }
                          style={controlStyle}
                        >
                          <option value="">Select value</option>
                          <option value="false">False</option>
                          <option value="true">True</option>
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
                            updateCondition(
                              group.id,
                              condition.id,
                              "value",
                              event.target.value
                            )
                          }
                          placeholder="Enter value"
                          style={controlStyle}
                        />
                      )}

                      {requiresCampaign && (
                        <select
                          value={String(condition.context?.campaignId || "")}
                          onChange={(event) => {
                            const selectedCampaign = campaignOptions.find(
                              (option) =>
                                String(option.id) === event.target.value
                            );

                            updateCondition(group.id, condition.id, "context", {
                              campaignId: event.target.value,
                              campaignName: selectedCampaign?.name || "",
                            });
                          }}
                          style={controlStyle}
                        >
                          <option value="">Select campaign</option>
                          {campaignOptions.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          removeCondition(group.id, condition.id)
                        }
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

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => addCondition(group.id)}
                  style={{
                    ...actionButtonStyle,
                    borderColor: "#b9d4bc",
                    color: "#24572b",
                    background: "#f4fbf4",
                  }}
                >
                  + Add condition
                </button>
              </div>
            </div>
          </div>
        ))}

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
            onClick={addGroup}
            style={{
              ...actionButtonStyle,
              borderColor: "#b9d4bc",
              color: "#24572b",
              background: "#f4fbf4",
            }}
          >
            + Add group
          </button>

          <button type="button" onClick={clearFilters} style={actionButtonStyle}>
            Clear filters
          </button>

          {!hideApplyButton && (
            <button
              type="button"
              onClick={applyFilters}
              disabled={isApplyingFilters}
              style={{
                ...actionButtonStyle,
                borderColor: "#3f9f42",
                background: "#3f9f42",
                color: "#fff",
                opacity: isApplyingFilters ? 0.7 : 1,
                cursor: isApplyingFilters ? "not-allowed" : "pointer",
              }}
            >
              {isApplyingFilters ? "Applying..." : "Apply filters"}
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
              {showSavePanel ? "Hide save panel" : "Save as view"}
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
            {completeConditions.length} ready rule
            {completeConditions.length === 1 ? "" : "s"}
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
                {isSavingView ? "Saving..." : "Save view"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterBuilder;
export type { FilterCondition } from "./filterTypes";

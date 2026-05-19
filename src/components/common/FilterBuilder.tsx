import { useEffect, useMemo, useRef, useState } from "react";
import "./FilterBuilder.css";
import API_BASE_URL from "../../config";
import type {
  FieldType,
  FilterCondition,
  FilterGroup,
  JoinOperator,
} from "./filterTypes";
import {
  ALL_CAMPAIGNS_ID,
  buildTrackingIndexesForGroups,
  conditionRequiresCampaign,
  evaluateTrackingCondition,
  getCampaignOptions,
  hasRequiredConditionContext,
} from "../../utils/trackingFilterUtils";
import type { CampaignOption } from "../../utils/trackingFilterUtils";

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
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "gte", label: ">=" },
    { value: "lte", label: "<=" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  boolean: [
    { value: "equals", label: "Is" },
    { value: "notEquals", label: "Is not" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  dropdown: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not equals" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
};

const isValueOptionalOperator = (operator?: string) =>
  operator === "isEmpty" || operator === "isNotEmpty";


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
  (isValueOptionalOperator(condition.operator) ||
    String(condition.value ?? "").trim() !== "") &&
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
  const [isCollapsed, setIsCollapsed] = useState(true);
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
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const fieldPickerRef = useRef<HTMLDivElement | null>(null);
  const rulesPanelId = useMemo(() => `filter-rules-${generateId()}`, []);

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
    if (isCollapsed) {
      setActiveFieldPicker(null);
    }
  }, [isCollapsed]);

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

      case "isEmpty":
        return (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        );

      case "isNotEmpty":
        return !(
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        );

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

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        aria-expanded={false}
        aria-controls={rulesPanelId}
        className="fb-trigger"
      >
        + Build view
      </button>
    );
  }

  return (
    <div className="fb-card">
      {/* Header */}
      <div className="fb-header">
        <div className="fb-header__title">
          <span className="fb-header__dot" />
          Filter rules
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          aria-expanded
          aria-controls={rulesPanelId}
          className="fb-collapse-btn"
        >
          Collapse
        </button>
      </div>

      {/* Body */}
      <div id={rulesPanelId} hidden={isCollapsed} className="fb-body">
        {groups.map((group, groupIndex) => (
          <div key={group.id} style={{ marginBottom: groupIndex === groups.length - 1 ? 0 : 12 }}>
            {/* Group-level AND/OR join */}
            {groupIndex > 0 && (
              <div className="fb-join" style={{ margin: "10px 0" }}>
                <div className="fb-join__line" />
                <div className="fb-join__toggle">
                  {(["AND", "OR"] as JoinOperator[]).map((joinOperator) => (
                    <button
                      key={`${group.id}-${joinOperator}`}
                      type="button"
                      onClick={() => updateGroupJoin(group.id, joinOperator)}
                      className={`fb-join__btn${(group.joinWithPrevious || "AND") === joinOperator ? " is-active" : ""}`}
                    >
                      {joinOperator}
                    </button>
                  ))}
                </div>
                <div className="fb-join__line" />
              </div>
            )}

            {/* Group box */}
            <div className="fb-group">
              {groups.length > 1 && (
                <div className="fb-group__header">
                  <span className="fb-group__label">Group {groupIndex + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    className="fb-remove-group-btn"
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
                const operators = field ? operatorsByType[normalizedFieldType] : operatorsByType.text;
                const sortedOperators = sortByLabelAsc(operators);
                const dropdownOptions = field?.options
                  ? sortedFieldOptions.get(field.key) || sortStringsAsc(field.options)
                  : [];
                const isValueOptional = isValueOptionalOperator(condition.operator);
                const visibleFieldCategories = filteredFieldCategories;
                const selectedFieldCategory =
                  visibleFieldCategories.find((c) => c.key === activeFieldCategory) ||
                  visibleFieldCategories[0];

                return (
                  <div
                    key={condition.id}
                    style={{
                      marginBottom: index === group.conditions.length - 1
                        ? isFieldPickerOpen ? 390 : 0
                        : isFieldPickerOpen ? 406 : 8,
                      position: "relative",
                      zIndex: isFieldPickerOpen ? 5 : 1,
                    }}
                  >
                    {/* Condition-level AND/OR join */}
                    {index > 0 && (
                      <div className="fb-join" style={{ margin: "8px 0" }}>
                        <div className="fb-join__line" />
                        <div className="fb-join__toggle">
                          {(["AND", "OR"] as JoinOperator[]).map((joinOperator) => (
                            <button
                              key={`${condition.id}-${joinOperator}`}
                              type="button"
                              onClick={() => updateCondition(group.id, condition.id, "joinWithPrevious", joinOperator)}
                              className={`fb-join__btn${(condition.joinWithPrevious || "AND") === joinOperator ? " is-active" : ""}`}
                            >
                              {joinOperator}
                            </button>
                          ))}
                        </div>
                        <div className="fb-join__line" />
                      </div>
                    )}

                    {/* Condition grid */}
                    <div className={`fb-condition${requiresCampaign ? " fb-condition--5col" : " fb-condition--4col"}`}>
                      {/* Field picker */}
                      <div style={{ position: "relative", minWidth: 0 }} ref={isFieldPickerOpen ? fieldPickerRef : null}>
                        <button
                          type="button"
                          onClick={() =>
                            isFieldPickerOpen
                              ? setActiveFieldPicker(null)
                              : openFieldPicker(group.id, condition.id, condition.field)
                          }
                          className="fb-control fb-control--field"
                        >
                          <span className={`fb-control__label${condition.field ? "" : " fb-control__label--placeholder"}`}>
                            {field?.label || "Choose field"}
                          </span>
                          <span className="fb-control__arrow">{isFieldPickerOpen ? "▲" : "▼"}</span>
                        </button>

                        {isFieldPickerOpen && (
                          <div className="fb-field-picker">
                            <div className="fb-field-picker__search">
                              <input
                                value={fieldSearchTerm}
                                onChange={(e) => setFieldSearchTerm(e.target.value)}
                                placeholder="Search fields…"
                                autoFocus
                              />
                            </div>
                            <div className="fb-field-picker__layout">
                              <div className="fb-field-picker__cats">
                                {visibleFieldCategories.map((category) => (
                                  <button
                                    key={category.key}
                                    type="button"
                                    onClick={() => setActiveFieldCategory(category.key)}
                                    className={`fb-field-picker__cat-btn${category.key === (selectedFieldCategory?.key || activeFieldCategory) ? " is-active" : ""}`}
                                  >
                                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {category.label}
                                    </span>
                                    <span>›</span>
                                  </button>
                                ))}
                              </div>
                              <div className="fb-field-picker__fields">
                                {selectedFieldCategory ? (
                                  <>
                                    <div className="fb-field-picker__section-label">
                                      {selectedFieldCategory.label}
                                    </div>
                                    {selectedFieldCategory.fields.map((fieldOption) => (
                                      <button
                                        key={fieldOption.key}
                                        type="button"
                                        onClick={() => {
                                          updateCondition(group.id, condition.id, "field", fieldOption.key);
                                          setActiveFieldPicker(null);
                                          setFieldSearchTerm("");
                                        }}
                                        className={`fb-field-picker__field-btn${condition.field === fieldOption.key ? " is-active" : ""}`}
                                      >
                                        {fieldOption.label}
                                      </button>
                                    ))}
                                    <div style={{ height: 8 }} />
                                  </>
                                ) : (
                                  <div style={{ padding: "14px 12px", color: "var(--dt-ink-faint, #6b7280)", fontSize: 13 }}>
                                    No matching fields found.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Operator */}
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(group.id, condition.id, "operator", e.target.value)}
                        className="fb-control"
                      >
                        <option value="">Operator</option>
                        {sortedOperators.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      {/* Value */}
                      {isValueOptional ? (
                        <input
                          type="text"
                          value=""
                          disabled
                          placeholder="No value needed"
                          className="fb-control fb-control--disabled"
                        />
                      ) : normalizedFieldType === "dropdown" ? (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(group.id, condition.id, "value", e.target.value)}
                          className="fb-control"
                        >
                          <option value="">Select value</option>
                          {dropdownOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : normalizedFieldType === "boolean" ? (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(group.id, condition.id, "value", e.target.value)}
                          className="fb-control"
                        >
                          <option value="">Select value</option>
                          <option value="false">False</option>
                          <option value="true">True</option>
                        </select>
                      ) : (
                        <input
                          type={normalizedFieldType === "number" ? "number" : normalizedFieldType === "date" ? "date" : "text"}
                          value={condition.value}
                          onChange={(e) => updateCondition(group.id, condition.id, "value", e.target.value)}
                          placeholder="Enter value"
                          className="fb-control"
                        />
                      )}

                      {/* Campaign context */}
                      {requiresCampaign && (
                        <select
                          value={String(condition.context?.campaignId || "")}
                          onChange={(e) => {
                            const selectedCampaign = campaignOptions.find((opt) => String(opt.id) === e.target.value);
                            updateCondition(group.id, condition.id, "context", {
                              campaignId: e.target.value,
                              campaignName: selectedCampaign?.name || "",
                            });
                          }}
                          className="fb-control"
                        >
                          <option value="">Select campaign</option>
                          {campaignOptions.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.id === ALL_CAMPAIGNS_ID ? "All campaigns" : campaign.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Remove condition */}
                      <button
                        type="button"
                        onClick={() => removeCondition(group.id, condition.id)}
                        aria-label="Remove condition"
                        className="fb-remove-btn"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}

              <button type="button" onClick={() => addCondition(group.id)} className="fb-add-cond-btn">
                + Add condition
              </button>
            </div>
          </div>
        ))}

        {/* Footer actions */}
        <div className="fb-footer">
          <button type="button" onClick={addGroup} className="fb-btn">
            + Add group
          </button>
          <button type="button" onClick={clearFilters} className="fb-btn">
            Clear filters
          </button>
          {!hideApplyButton && (
            <button
              type="button"
              onClick={applyFilters}
              disabled={isApplyingFilters}
              className="fb-btn fb-btn--primary"
            >
              {isApplyingFilters ? "Applying…" : "Apply filters"}
            </button>
          )}
          {saveViewConfig && (
            <button
              type="button"
              onClick={() => setShowSavePanel((prev) => !prev)}
              className="fb-btn fb-btn--save"
            >
              {showSavePanel ? "Hide save panel" : "Save as view"}
            </button>
          )}
          <span className="fb-rules-count">
            {completeConditions.length} rule{completeConditions.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Save view panel */}
        {saveViewConfig && showSavePanel && (
          <div className="fb-save-panel">
            <div className="fb-save-panel__title">Save filter as a reusable view</div>
            <div className="fb-save-panel__grid">
              <input
                type="text"
                placeholder="View name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                className="fb-control"
              />
              <input
                type="text"
                placeholder="Short description"
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
                className="fb-control"
              />
            </div>
            <div className="fb-save-panel__actions">
              <button type="button" onClick={() => setShowSavePanel(false)} className="fb-btn">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveView}
                disabled={isSavingView || !viewName.trim()}
                className="fb-btn fb-btn--primary"
              >
                {isSavingView ? "Saving…" : "Save view"}
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

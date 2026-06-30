export type FieldType = "text" | "number" | "date" | "boolean" | "dropdown";
export type JoinOperator = "AND" | "OR";

export interface FilterConditionContext {
  campaignId?: string | number;
  campaignName?: string;
}

// `value` holds a string for single-value operators, or a string[] for
// multi-select dropdown conditions (matches if the row equals ANY selected value).
export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  joinWithPrevious?: JoinOperator;
  context?: FilterConditionContext;
}

export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  joinWithPrevious?: JoinOperator;
}

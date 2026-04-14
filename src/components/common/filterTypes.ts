export type FieldType = "text" | "number" | "date" | "boolean" | "dropdown";
export type JoinOperator = "AND" | "OR";

export interface FilterConditionContext {
  campaignId?: string | number;
  campaignName?: string;
}

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

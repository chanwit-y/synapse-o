export const NODE_TYPES = ["input", "variable", "condition", "process", "output", "api"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ApiConfig {
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  method: "GET",
  url: "",
  headers: "{}",
  body: "",
};

export const DATA_TYPES = ["string", "number", "boolean", "array", "object", "date"] as const;
export type DataType = (typeof DATA_TYPES)[number];

export interface Variable {
  id: string;
  name: string;
  dataType: DataType;
}

export const CONDITION_OPERATORS = ["==", "!=", "<", ">", "<=", ">="] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export type LogicOperator = "AND" | "OR";

export interface ConditionRule {
  id: string;
  type: "rule";
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface ConditionGroup {
  id: string;
  type: "group";
  logic: LogicOperator;
  children: ConditionItem[];
}

export type ConditionItem = ConditionRule | ConditionGroup;

export const DEFAULT_ROOT_GROUP: ConditionGroup = {
  id: "root",
  type: "group",
  logic: "AND",
  children: [],
};

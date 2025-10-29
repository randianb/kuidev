/**
 * 可视化查询构建器类型定义
 */

// 操作符类型
export type Operator = 
  | '=' | '!=' | '>' | '<' | '>=' | '<='
  | '包含' | '不包含' | '开头是' | '开头不是' 
  | '结尾是' | '结尾不是' 
  | '是 null' | '不是 null' 
  | '是空的' | '是非空的' 
  | '介于' | '不介于' 
  | '在列表' | '不在列表' 
  | '[自定义]';

// 字段类型
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';

// 字段定义
export interface FieldDefinition {
  key: string;
  title: string;
  type: FieldType;
  options?: Array<{ label: string; value: any }>; // 用于 select 类型
}

// 单个条件
export interface Condition {
  id: string;          // 唯一标识
  type: 'condition';   // 类型标识
  field: string;       // 字段名
  operator: Operator;  // 操作符
  value?: any;         // 值（可能是单个值、数组或表达式）
  customExpression?: string; // 自定义表达式（当 operator 为 '[自定义]' 时使用）
}

// 条件组
export interface ConditionGroup {
  id: string;
  type: 'group';
  logical: 'AND' | 'OR';
  children: (Condition | ConditionGroup)[];
}

// 查询根节点（总是一个组）
export type QueryRoot = ConditionGroup;

// 操作符配置
export interface OperatorConfig {
  operator: Operator;
  label: string;
  valueType: 'none' | 'single' | 'double' | 'array' | 'custom';
  supportedFieldTypes: FieldType[];
  description?: string;
}

// 查询构建器配置
export interface QueryBuilderConfig {
  fields: FieldDefinition[];
  operators?: OperatorConfig[];
  maxDepth?: number;
  allowCustomExpressions?: boolean;
  allowEmptyGroups?: boolean;
  showTextPreview?: boolean;
  showValidation?: boolean;
  enableScenarios?: boolean;
  autoExecute?: boolean;
}

// 查询构建器事件
export interface QueryBuilderEvents {
  onQueryChange?: (query: QueryRoot) => void;
  onExecute?: (query: QueryRoot) => Promise<QueryExecutionResult>;
  onExport?: (query: QueryRoot) => void;
  onExportText?: (text: string, query: QueryRoot) => void;
  onReset?: (query: QueryRoot) => void;
}

// 查询场景
export interface QueryScenario {
  id: string;
  name: string;
  description?: string;
  query: QueryRoot;
  createdAt: string;
  updatedAt?: string;
}

// 查询执行结果
export interface QueryExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  totalCount?: number;
  filteredCount?: number;
  executionTime?: number;
}
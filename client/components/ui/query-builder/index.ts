/**
 * 查询构建器模块导出
 */

// 导出所有组件
export { QueryBuilder } from './QueryBuilder';
export { ConditionRow } from './ConditionRow';
export { GroupNode } from './GroupNode';
export { QueryEngine } from './QueryEngine';
export { ScenarioManager } from './ScenarioManager';
export { TextExporter } from './TextExporter';

// 类型定义
export type {
  Operator,
  FieldType,
  FieldDefinition,
  Condition,
  ConditionGroup,
  QueryRoot,
  OperatorConfig,
  QueryBuilderConfig,
  QueryBuilderEvents,
  QueryScenario,
  QueryExecutionResult
} from './types';

// 工具函数和配置
export {
  generateId,
  createCondition,
  createConditionGroup,
  createRootQuery,
  cloneQuery,
  findNodeInQuery,
  findParentInQuery,
  addConditionToGroup,
  addGroupToGroup,
  removeNodeFromQuery,
  updateConditionInQuery,
  updateGroupInQuery,
  validateQuery,
  getQueryDepth,
  countConditions,
  queryToText
} from './utils';

// 配置常量
export { 
  DEFAULT_OPERATORS,
  getOperatorsForFieldType,
  getOperatorConfig,
  operatorNeedsValue,
  operatorNeedsDoubleValue,
  operatorNeedsArrayValue,
  operatorNeedsCustomExpression
} from './config';
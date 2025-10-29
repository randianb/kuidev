import { Condition, ConditionGroup, QueryRoot, FieldDefinition } from './types';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 创建新的条件
 */
export function createCondition(field?: string, operator?: string, value?: any): Condition {
  return {
    id: generateId(),
    type: 'condition',
    field: field || '',
    operator: operator as any || '=',
    value: value
  };
}

/**
 * 创建新的条件组
 */
export function createConditionGroup(logical: 'AND' | 'OR' = 'AND', children: (Condition | ConditionGroup)[] = []): ConditionGroup {
  return {
    id: generateId(),
    type: 'group',
    logical,
    children
  };
}

/**
 * 创建根查询对象
 */
export function createRootQuery(): QueryRoot {
  return createConditionGroup('AND', [createCondition()]);
}

/**
 * 深度克隆查询对象
 */
export function cloneQuery(query: QueryRoot): QueryRoot {
  return JSON.parse(JSON.stringify(query));
}

/**
 * 在查询树中查找节点
 */
export function findNodeInQuery(query: QueryRoot, nodeId: string): Condition | ConditionGroup | null {
  if (query.id === nodeId) {
    return query;
  }

  for (const child of query.children) {
    if (child.id === nodeId) {
      return child;
    }
    
    if ('type' in child && child.type === 'group') {
      const found = findNodeInQuery(child, nodeId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * 在查询树中查找父节点
 */
export function findParentInQuery(query: QueryRoot, nodeId: string): ConditionGroup | null {
  for (const child of query.children) {
    if (child.id === nodeId) {
      return query;
    }
    
    if ('type' in child && child.type === 'group') {
      const found = findParentInQuery(child, nodeId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * 添加条件到指定组
 */
export function addConditionToGroup(query: QueryRoot, groupId: string, condition: Condition): QueryRoot {
  const newQuery = cloneQuery(query);
  const group = findNodeInQuery(newQuery, groupId) as ConditionGroup;
  
  if (group && group.type === 'group') {
    group.children.push(condition);
  }
  
  return newQuery;
}

/**
 * 添加条件组到指定组
 */
export function addGroupToGroup(query: QueryRoot, parentGroupId: string, childGroup: ConditionGroup): QueryRoot {
  const newQuery = cloneQuery(query);
  const parentGroup = findNodeInQuery(newQuery, parentGroupId) as ConditionGroup;
  
  if (parentGroup && parentGroup.type === 'group') {
    parentGroup.children.push(childGroup);
  }
  
  return newQuery;
}

/**
 * 从查询中移除节点
 */
export function removeNodeFromQuery(query: QueryRoot, nodeId: string): QueryRoot {
  const newQuery = cloneQuery(query);
  
  function removeFromGroup(group: ConditionGroup): boolean {
    const index = group.children.findIndex(child => child.id === nodeId);
    if (index !== -1) {
      group.children.splice(index, 1);
      return true;
    }
    
    for (const child of group.children) {
      if ('type' in child && child.type === 'group') {
        if (removeFromGroup(child)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  removeFromGroup(newQuery);
  return newQuery;
}

/**
 * 更新查询中的条件
 */
export function updateConditionInQuery(query: QueryRoot, conditionId: string, updates: Partial<Condition>): QueryRoot {
  const newQuery = cloneQuery(query);
  const condition = findNodeInQuery(newQuery, conditionId) as Condition;
  
  if (condition && !('type' in condition)) {
    Object.assign(condition, updates);
  }
  
  return newQuery;
}

/**
 * 更新查询中的条件组
 */
export function updateGroupInQuery(query: QueryRoot, groupId: string, updates: Partial<ConditionGroup>): QueryRoot {
  const newQuery = cloneQuery(query);
  const group = findNodeInQuery(newQuery, groupId) as ConditionGroup;
  
  if (group && group.type === 'group') {
    Object.assign(group, updates);
  }
  
  return newQuery;
}

/**
 * 验证查询是否有效
 */
export function validateQuery(query: QueryRoot, fields: FieldDefinition[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fieldKeys = fields.map(f => f.key);

  function validateNode(node: Condition | ConditionGroup, depth: number = 0): void {
    if (depth > 10) {
      errors.push('查询嵌套层级过深（超过10层）');
      return;
    }

    if ('type' in node && node.type === 'group') {
      // 验证条件组
      if (!node.children || node.children.length === 0) {
        errors.push(`条件组 ${node.id} 不能为空`);
      } else {
        node.children.forEach(child => validateNode(child, depth + 1));
      }
    } else {
      // 验证条件
      const condition = node as Condition;
      if (!condition.field) {
        errors.push(`条件 ${condition.id} 缺少字段`);
      } else if (!fieldKeys.includes(condition.field)) {
        errors.push(`条件 ${condition.id} 使用了无效的字段: ${condition.field}`);
      }
      
      if (!condition.operator) {
        errors.push(`条件 ${condition.id} 缺少操作符`);
      }
      
      // 根据操作符验证值
      if (condition.operator && !['是 null', '不是 null', '是空的', '是非空的'].includes(condition.operator)) {
        if (condition.value === undefined || condition.value === null || condition.value === '') {
          errors.push(`条件 ${condition.id} 缺少值`);
        }
      }
    }
  }

  validateNode(query);
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 计算查询的深度
 */
export function getQueryDepth(query: QueryRoot): number {
  function getDepth(node: Condition | ConditionGroup, currentDepth: number = 0): number {
    if ('type' in node && node.type === 'group') {
      let maxChildDepth = currentDepth;
      for (const child of node.children) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(child, currentDepth + 1));
      }
      return maxChildDepth;
    }
    return currentDepth;
  }
  
  return getDepth(query);
}

/**
 * 统计查询中的条件数量
 */
export function countConditions(query: QueryRoot): number {
  function count(node: Condition | ConditionGroup): number {
    if ('type' in node && node.type === 'group') {
      // 检查 children 是否存在且为数组
      if (!node.children || !Array.isArray(node.children)) {
        return 0;
      }
      return node.children.reduce((sum, child) => sum + count(child), 0);
    }
    return 1;
  }
  
  return count(query);
}

/**
 * 将查询转换为可读的文本描述
 */
export function queryToText(query: QueryRoot, fields?: FieldDefinition[]): string {
  const fieldMap = new Map((fields || []).map(f => [f.key, f.title]));
  
  function nodeToText(node: Condition | ConditionGroup): string {
    if ('type' in node && node.type === 'group') {
      if (node.children.length === 0) return '';
      
      const childTexts = node.children
        .map(child => nodeToText(child))
        .filter(text => text.length > 0);
      
      if (childTexts.length === 0) return '';
      if (childTexts.length === 1) return childTexts[0];
      
      return `(${childTexts.join(` ${node.logical} `)})`;
    } else {
      const condition = node as Condition;
      const fieldTitle = fieldMap.get(condition.field) || condition.field;
      let valueText = '';
      
      if (condition.operator === '[自定义]') {
        valueText = condition.customExpression || '';
      } else if (!['是 null', '不是 null', '是空的', '是非空的'].includes(condition.operator)) {
        if (Array.isArray(condition.value)) {
          valueText = `[${condition.value.join(', ')}]`;
        } else if (condition.operator === '介于' || condition.operator === '不介于') {
          const [min, max] = Array.isArray(condition.value) ? condition.value : [condition.value, ''];
          valueText = `${min} 和 ${max}`;
        } else {
          valueText = String(condition.value || '');
        }
      }
      
      return valueText ? `${fieldTitle} ${condition.operator} ${valueText}` : `${fieldTitle} ${condition.operator}`;
    }
  }
  
  return nodeToText(query);
}
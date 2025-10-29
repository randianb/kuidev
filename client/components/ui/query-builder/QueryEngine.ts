import { QueryRoot, Condition, ConditionGroup, FieldDefinition, QueryExecutionResult } from './types';

// 查询执行引擎
export class QueryEngine {
  private fields: FieldDefinition[];

  constructor(fields: FieldDefinition[]) {
    this.fields = fields;
  }

  // 执行查询，过滤数据
  execute<T = any>(data: T[], query: QueryRoot): QueryExecutionResult<T[]> {
    try {
      if (!data || !Array.isArray(data)) {
        return {
          success: false,
          error: '数据必须是数组格式'
        };
      }

      if (!query || !query.children || query.children.length === 0) {
        return {
          success: true,
          data: data
        };
      }

      const filteredData = data.filter(item => this.evaluateGroup(item, query));

      return {
        success: true,
        data: filteredData,
        totalCount: data.length,
        filteredCount: filteredData.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '查询执行失败'
      };
    }
  }

  // 评估条件组
  private evaluateGroup(item: any, group: ConditionGroup): boolean {
    if (!group.children || group.children.length === 0) {
      return true;
    }

    const results = group.children.map(child => {
      if (child.type === 'group') {
        return this.evaluateGroup(item, child as ConditionGroup);
      } else {
        return this.evaluateCondition(item, child as Condition);
      }
    });

    // 根据逻辑操作符组合结果
    if (group.logical === 'AND') {
      return results.every(result => result);
    } else {
      return results.some(result => result);
    }
  }

  // 评估单个条件
  private evaluateCondition(item: any, condition: Condition): boolean {
    const { field, operator, value, customExpression } = condition;

    // 获取字段值
    const fieldValue = this.getFieldValue(item, field);
    const fieldDef = this.fields.find(f => f.key === field);

    // 处理自定义表达式
    if (operator === '[自定义]' && customExpression) {
      return this.evaluateCustomExpression(item, customExpression);
    }

    // 处理空值检查
    if (operator === '是 null') {
      return fieldValue == null;
    }
    if (operator === '不是 null') {
      return fieldValue != null;
    }
    if (operator === '是空的') {
      return fieldValue === '' || fieldValue == null;
    }
    if (operator === '是非空的') {
      return fieldValue !== '' && fieldValue != null;
    }

    // 如果字段值为空，其他操作符都返回 false
    if (fieldValue == null) {
      return false;
    }

    // 类型转换
    const normalizedFieldValue = this.normalizeValue(fieldValue, fieldDef?.type);
    const normalizedValue = this.normalizeValue(value, fieldDef?.type);

    switch (operator) {
      case '=':
        return normalizedFieldValue === normalizedValue;
      
      case '!=':
        return normalizedFieldValue !== normalizedValue;
      
      case '>':
        return this.compareValues(normalizedFieldValue, normalizedValue) > 0;
      
      case '<':
        return this.compareValues(normalizedFieldValue, normalizedValue) < 0;
      
      case '>=':
        return this.compareValues(normalizedFieldValue, normalizedValue) >= 0;
      
      case '<=':
        return this.compareValues(normalizedFieldValue, normalizedValue) <= 0;
      
      case '包含':
        return String(normalizedFieldValue).toLowerCase().includes(String(normalizedValue).toLowerCase());
      
      case '不包含':
        return !String(normalizedFieldValue).toLowerCase().includes(String(normalizedValue).toLowerCase());
      
      case '开头是':
        return String(normalizedFieldValue).toLowerCase().startsWith(String(normalizedValue).toLowerCase());
      
      case '开头不是':
        return !String(normalizedFieldValue).toLowerCase().startsWith(String(normalizedValue).toLowerCase());
      
      case '结尾是':
        return String(normalizedFieldValue).toLowerCase().endsWith(String(normalizedValue).toLowerCase());
      
      case '结尾不是':
        return !String(normalizedFieldValue).toLowerCase().endsWith(String(normalizedValue).toLowerCase());
      
      case '介于':
        if (Array.isArray(normalizedValue) && normalizedValue.length === 2) {
          const [min, max] = normalizedValue;
          return this.compareValues(normalizedFieldValue, min) >= 0 && 
                 this.compareValues(normalizedFieldValue, max) <= 0;
        }
        return false;
      
      case '不介于':
        if (Array.isArray(normalizedValue) && normalizedValue.length === 2) {
          const [min, max] = normalizedValue;
          return this.compareValues(normalizedFieldValue, min) < 0 || 
                 this.compareValues(normalizedFieldValue, max) > 0;
        }
        return true;
      
      case '在列表':
        if (Array.isArray(normalizedValue)) {
          return normalizedValue.some(v => this.normalizeValue(v, fieldDef?.type) === normalizedFieldValue);
        }
        return false;
      
      case '不在列表':
        if (Array.isArray(normalizedValue)) {
          return !normalizedValue.some(v => this.normalizeValue(v, fieldDef?.type) === normalizedFieldValue);
        }
        return true;
      
      default:
        console.warn(`未知的操作符: ${operator}`);
        return false;
    }
  }

  // 获取字段值（支持嵌套路径）
  private getFieldValue(item: any, fieldPath: string): any {
    const keys = fieldPath.split('.');
    let value = item;
    
    for (const key of keys) {
      if (value == null) return null;
      value = value[key];
    }
    
    return value;
  }

  // 值标准化
  private normalizeValue(value: any, fieldType?: string): any {
    if (value == null) return null;

    switch (fieldType) {
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      
      case 'date':
        if (value instanceof Date) return value;
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date(0) : date;
        }
        return new Date(0);
      
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      
      default:
        return value;
    }
  }

  // 值比较
  private compareValues(a: any, b: any): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    // 日期比较
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // 数字比较
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // 字符串比较
    const strA = String(a);
    const strB = String(b);
    return strA.localeCompare(strB);
  }

  // 评估自定义表达式
  private evaluateCustomExpression(item: any, expression: string): boolean {
    try {
      // 简单的表达式评估器
      // 注意：这里只是一个基础实现，实际项目中应该使用更安全的表达式解析器
      
      // 替换字段引用
      let processedExpression = expression;
      
      // 查找所有字段引用 ${fieldName}
      const fieldReferences = expression.match(/\$\{([^}]+)\}/g);
      if (fieldReferences) {
        for (const ref of fieldReferences) {
          const fieldName = ref.slice(2, -1); // 移除 ${ 和 }
          const fieldValue = this.getFieldValue(item, fieldName);
          
          // 根据值类型进行适当的替换
          let replacement: string;
          if (typeof fieldValue === 'string') {
            replacement = `"${fieldValue.replace(/"/g, '\\"')}"`;
          } else if (fieldValue == null) {
            replacement = 'null';
          } else {
            replacement = String(fieldValue);
          }
          
          processedExpression = processedExpression.replace(ref, replacement);
        }
      }

      // 使用 Function 构造器评估表达式（注意：这在生产环境中可能不安全）
      const result = new Function('return ' + processedExpression)();
      return Boolean(result);
    } catch (error) {
      console.warn('自定义表达式评估失败:', expression, error);
      return false;
    }
  }

  // 生成 SQL 查询（可选功能）
  generateSQL(query: QueryRoot, tableName: string = 'data'): string {
    if (!query.children || query.children.length === 0) {
      return `SELECT * FROM ${tableName}`;
    }

    const whereClause = this.groupToSQL(query);
    return `SELECT * FROM ${tableName} WHERE ${whereClause}`;
  }

  private groupToSQL(group: ConditionGroup): string {
    if (!group.children || group.children.length === 0) {
      return '1=1';
    }

    const clauses = group.children.map(child => {
      if (child.type === 'group') {
        return `(${this.groupToSQL(child as ConditionGroup)})`;
      } else {
        return this.conditionToSQL(child as Condition);
      }
    });

    return clauses.join(` ${group.logical} `);
  }

  private conditionToSQL(condition: Condition): string {
    const { field, operator, value } = condition;

    switch (operator) {
      case '=':
        return `${field} = ${this.sqlValue(value)}`;
      case '!=':
        return `${field} != ${this.sqlValue(value)}`;
      case '>':
        return `${field} > ${this.sqlValue(value)}`;
      case '<':
        return `${field} < ${this.sqlValue(value)}`;
      case '包含':
        return `${field} LIKE '%${String(value).replace(/'/g, "''")}%'`;
      case '不包含':
        return `${field} NOT LIKE '%${String(value).replace(/'/g, "''")}%'`;
      case '开头是':
        return `${field} LIKE '${String(value).replace(/'/g, "''")}%'`;
      case '结尾是':
        return `${field} LIKE '%${String(value).replace(/'/g, "''")}'`;
      case '是 null':
        return `${field} IS NULL`;
      case '不是 null':
        return `${field} IS NOT NULL`;
      case '介于':
        if (Array.isArray(value) && value.length === 2) {
          return `${field} BETWEEN ${this.sqlValue(value[0])} AND ${this.sqlValue(value[1])}`;
        }
        return '1=0';
      case '在列表':
        if (Array.isArray(value)) {
          const values = value.map(v => this.sqlValue(v)).join(', ');
          return `${field} IN (${values})`;
        }
        return '1=0';
      default:
        return '1=1';
    }
  }

  private sqlValue(value: any): string {
    if (value == null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    return `'${String(value).replace(/'/g, "''")}'`;
  }
}
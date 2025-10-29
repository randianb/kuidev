import { OperatorConfig, FieldType } from './types';

/**
 * 默认操作符配置
 */
export const DEFAULT_OPERATORS: OperatorConfig[] = [
  // 比较操作符
  {
    operator: '=',
    label: '等于',
    valueType: 'single',
    supportedFieldTypes: ['text', 'number', 'date', 'boolean', 'select'],
    description: '字段值等于指定值'
  },
  {
    operator: '!=',
    label: '不等于',
    valueType: 'single',
    supportedFieldTypes: ['text', 'number', 'date', 'boolean', 'select'],
    description: '字段值不等于指定值'
  },
  {
    operator: '>',
    label: '大于',
    valueType: 'single',
    supportedFieldTypes: ['number', 'date'],
    description: '字段值大于指定值'
  },
  {
    operator: '<',
    label: '小于',
    valueType: 'single',
    supportedFieldTypes: ['number', 'date'],
    description: '字段值小于指定值'
  },
  {
    operator: '>=',
    label: '大于等于',
    valueType: 'single',
    supportedFieldTypes: ['number', 'date'],
    description: '字段值大于或等于指定值'
  },
  {
    operator: '<=',
    label: '小于等于',
    valueType: 'single',
    supportedFieldTypes: ['number', 'date'],
    description: '字段值小于或等于指定值'
  },

  // 文本操作符
  {
    operator: '包含',
    label: '包含',
    valueType: 'single',
    supportedFieldTypes: ['text'],
    description: '字段值包含指定文本'
  },
  {
    operator: '不包含',
    label: '不包含',
    valueType: 'single',
    supportedFieldTypes: ['text'],
    description: '字段值不包含指定文本'
  },
  {
    operator: '开头是',
    label: '开头是',
    valueType: 'single',
    supportedFieldTypes: ['text'],
    description: '字段值以指定文本开头'
  },
  {
    operator: '开头不是',
    label: '开头不是',
    valueType: 'single',
    supportedFieldTypes: ['text'],
    description: '字段值不以指定文本开头'
  },
  {
    operator: '结尾是',
    label: '结尾是',
    valueType: 'single',
    supportedFieldTypes: ['text'],
    description: '字段值以指定文本结尾'
  },
  {
    operator: '结尾不是',
    label: '结尾不是',
    valueType: 'single',
    supportedFieldTypes: ['text'],
    description: '字段值不以指定文本结尾'
  },

  // 空值操作符
  {
    operator: '是 null',
    label: '是 null',
    valueType: 'none',
    supportedFieldTypes: ['text', 'number', 'date', 'boolean', 'select'],
    description: '字段值为 null'
  },
  {
    operator: '不是 null',
    label: '不是 null',
    valueType: 'none',
    supportedFieldTypes: ['text', 'number', 'date', 'boolean', 'select'],
    description: '字段值不为 null'
  },
  {
    operator: '是空的',
    label: '是空的',
    valueType: 'none',
    supportedFieldTypes: ['text'],
    description: '字段值为空字符串'
  },
  {
    operator: '是非空的',
    label: '是非空的',
    valueType: 'none',
    supportedFieldTypes: ['text'],
    description: '字段值不为空字符串'
  },

  // 范围操作符
  {
    operator: '介于',
    label: '介于',
    valueType: 'double',
    supportedFieldTypes: ['number', 'date'],
    description: '字段值在指定范围内'
  },
  {
    operator: '不介于',
    label: '不介于',
    valueType: 'double',
    supportedFieldTypes: ['number', 'date'],
    description: '字段值不在指定范围内'
  },

  // 列表操作符
  {
    operator: '在列表',
    label: '在列表中',
    valueType: 'array',
    supportedFieldTypes: ['text', 'number', 'select'],
    description: '字段值在指定列表中'
  },
  {
    operator: '不在列表',
    label: '不在列表中',
    valueType: 'array',
    supportedFieldTypes: ['text', 'number', 'select'],
    description: '字段值不在指定列表中'
  },

  // 自定义操作符
  {
    operator: '[自定义]',
    label: '自定义表达式',
    valueType: 'custom',
    supportedFieldTypes: ['text', 'number', 'date', 'boolean', 'select'],
    description: '使用自定义表达式进行过滤'
  }
];

/**
 * 根据字段类型获取支持的操作符
 */
export function getOperatorsForFieldType(fieldType: FieldType): OperatorConfig[] {
  return DEFAULT_OPERATORS.filter(op => op.supportedFieldTypes.includes(fieldType));
}

/**
 * 获取操作符配置
 */
export function getOperatorConfig(operator: string): OperatorConfig | undefined {
  return DEFAULT_OPERATORS.find(op => op.operator === operator);
}

/**
 * 检查操作符是否需要值输入
 */
export function operatorNeedsValue(operator: string): boolean {
  const config = getOperatorConfig(operator);
  return config ? config.valueType !== 'none' : true;
}

/**
 * 检查操作符是否需要双值输入（如范围）
 */
export function operatorNeedsDoubleValue(operator: string): boolean {
  const config = getOperatorConfig(operator);
  return config ? config.valueType === 'double' : false;
}

/**
 * 检查操作符是否需要数组值输入
 */
export function operatorNeedsArrayValue(operator: string): boolean {
  const config = getOperatorConfig(operator);
  return config ? config.valueType === 'array' : false;
}

/**
 * 检查操作符是否需要自定义表达式
 */
export function operatorNeedsCustomExpression(operator: string): boolean {
  const config = getOperatorConfig(operator);
  return config ? config.valueType === 'custom' : false;
}
import { NodeMeta } from '../types';

// 表单字段验证状态
export interface FieldValidation {
  nodeId: string;
  fieldName: string;
  required: boolean;
  value: any;
  isValid: boolean;
  errorMessage?: string;
}

// 表单验证管理器
class FormValidationManager {
  private fields: Map<string, FieldValidation> = new Map();
  private listeners: Set<() => void> = new Set();

  // 注册字段
  registerField(nodeId: string, fieldName: string, required: boolean, value: any = '') {
    const key = `${nodeId}-${fieldName}`;
    this.fields.set(key, {
      nodeId,
      fieldName,
      required,
      value,
      isValid: !required || this.isValueValid(value),
      errorMessage: !required || this.isValueValid(value) ? undefined : '此字段为必填项'
    });
    this.notifyListeners();
  }

  // 更新字段值
  updateFieldValue(nodeId: string, fieldName: string, value: any) {
    const key = `${nodeId}-${fieldName}`;
    const field = this.fields.get(key);
    if (field) {
      field.value = value;
      field.isValid = !field.required || this.isValueValid(value);
      field.errorMessage = field.isValid ? undefined : '此字段为必填项';
      this.notifyListeners();
    }
  }

  // 移除字段
  unregisterField(nodeId: string, fieldName: string) {
    const key = `${nodeId}-${fieldName}`;
    this.fields.delete(key);
    this.notifyListeners();
  }

  // 获取字段验证状态
  getFieldValidation(nodeId: string, fieldName: string): FieldValidation | undefined {
    const key = `${nodeId}-${fieldName}`;
    return this.fields.get(key);
  }

  // 获取所有无效字段
  getInvalidFields(): FieldValidation[] {
    return Array.from(this.fields.values()).filter(field => !field.isValid);
  }

  // 验证所有字段
  validateAll(): boolean {
    const invalidFields = this.getInvalidFields();
    return invalidFields.length === 0;
  }

  // 显示验证错误
  showValidationErrors(): string[] {
    const invalidFields = this.getInvalidFields();
    return invalidFields.map(field => 
      `${field.fieldName || '字段'}: ${field.errorMessage || '此字段为必填项'}`
    );
  }

  // 检查值是否有效
  private isValueValid(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  // 添加监听器
  addListener(listener: () => void) {
    this.listeners.add(listener);
  }

  // 移除监听器
  removeListener(listener: () => void) {
    this.listeners.delete(listener);
  }

  // 通知监听器
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // 清空所有字段
  clear() {
    this.fields.clear();
    this.notifyListeners();
  }
}

// 全局表单验证管理器实例
export const formValidationManager = new FormValidationManager();

// 获取节点中的表单字段
export function getFormFieldsFromNode(node: NodeMeta): Array<{fieldName: string, required: boolean}> {
  const formComponents = ['Input', 'Textarea', 'Switch', 'Slider', 'Select', 'Transfer', 'Upload'];
  
  if (!formComponents.includes(node.type)) {
    return [];
  }

  const fields = [];
  
  // 根据组件类型确定字段名
  switch (node.type) {
    case 'Input':
    case 'Textarea':
      fields.push({ fieldName: 'value', required: !!node.props?.required });
      break;
    case 'Switch':
      fields.push({ fieldName: 'checked', required: !!node.props?.required });
      break;
    case 'Slider':
      fields.push({ fieldName: 'value', required: !!node.props?.required });
      break;
    case 'Select':
      fields.push({ fieldName: 'value', required: !!node.props?.required });
      break;
    case 'Transfer':
      fields.push({ fieldName: 'targetKeys', required: !!node.props?.required });
      break;
    case 'Upload':
      fields.push({ fieldName: 'fileList', required: !!node.props?.required });
      break;
  }

  return fields;
}

// 递归收集所有表单字段
export function collectAllFormFields(node: NodeMeta): Array<{nodeId: string, fieldName: string, required: boolean}> {
  const result: Array<{nodeId: string, fieldName: string, required: boolean}> = [];
  
  // 收集当前节点的表单字段
  const fields = getFormFieldsFromNode(node);
  fields.forEach(field => {
    result.push({
      nodeId: node.id,
      fieldName: field.fieldName,
      required: field.required
    });
  });
  
  // 递归收集子节点的表单字段
  if (node.children) {
    node.children.forEach(child => {
      result.push(...collectAllFormFields(child));
    });
  }
  
  return result;
}
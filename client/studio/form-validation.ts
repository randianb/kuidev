import type { NodeMeta } from './types';

/**
 * 字段验证配置接口
 */
export interface FieldValidation {
  nodeId: string;
  fieldName: string;
  required: boolean;
  value: any;
  errorMessage?: string;
  hasBlurred?: boolean; // 是否已经失去焦点
  isValid?: boolean; // 验证状态
}

/**
 * 表单验证管理器
 */
export class FormValidationManager {
  private fields = new Map<string, FieldValidation>();
  private validationListeners = new Map<string, Array<(isValid: boolean, errorMessage?: string) => void>>();
  private globalListeners: Array<() => void> = [];

  /**
   * 注册或更新字段
   */
  registerField(nodeId: string, fieldName: string, required: boolean = false): void {
    const key = `${nodeId}-${fieldName}`;
    const existingField = this.fields.get(key);
    
    this.fields.set(key, {
      nodeId,
      fieldName,
      required,
      value: existingField?.value,
      errorMessage: existingField?.errorMessage,
      hasBlurred: existingField?.hasBlurred || false,
      isValid: existingField?.isValid !== undefined ? existingField.isValid : true
    });
  }

  /**
   * 更新字段值
   */
  updateFieldValue(nodeId: string, fieldName: string, value: any): void {
    const key = `${nodeId}-${fieldName}`;
    const field = this.fields.get(key);
    
    if (field) {
      field.value = value;
      this.fields.set(key, field);
      
      // 如果字段已经失去焦点，则触发验证
      if (field.required && field.hasBlurred) {
        this.validateField(nodeId, fieldName);
      }
    }
  }

  /**
   * 获取字段验证状态
   */
  getFieldValidation(nodeId: string, fieldName: string): FieldValidation | undefined {
    const key = `${nodeId}-${fieldName}`;
    return this.fields.get(key);
  }

  /**
   * 移除字段
   */
  removeField(nodeId: string, fieldName: string): void {
    const key = `${nodeId}-${fieldName}`;
    this.fields.delete(key);
    this.validationListeners.delete(key);
  }

  /**
   * 注销字段
   */
  unregisterField(nodeId: string, fieldName: string): void {
    this.removeField(nodeId, fieldName);
  }

  /**
   * 标记字段失去焦点
   */
  markFieldBlurred(nodeId: string, fieldName: string): void {
    const key = `${nodeId}-${fieldName}`;
    const field = this.fields.get(key);
    
    if (field) {
      field.hasBlurred = true;
      this.fields.set(key, field);
      
      // 失去焦点时触发验证
      if (field.required) {
        this.validateField(nodeId, fieldName);
      }
    }
  }

  /**
   * 验证字段
   */
  validateField(nodeId: string, fieldName: string): boolean {
    const key = `${nodeId}-${fieldName}`;
    const field = this.fields.get(key);
    
    if (!field) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    // 只有在字段已失去焦点且为必填字段时才进行验证
    if (field.required && field.hasBlurred) {
      if (this.isEmpty(field.value)) {
        isValid = false;
        errorMessage = '此字段为必填';
      }
    }
    
    // 更新字段验证状态和错误信息
    field.isValid = isValid;
    field.errorMessage = errorMessage;
    this.fields.set(key, field);
    
    // 通知监听器
    const listeners = this.validationListeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(isValid, errorMessage));
    }
    
    // 通知全局监听器
    this.notifyListeners();
    
    return isValid;
  }

  /**
   * 检查值是否为空
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'boolean') return false; // boolean值不算空
    if (typeof value === 'number') return false; // 数字值不算空
    return false;
  }

  /**
   * 添加监听器
   */
  addListener(callback: () => void): void {
    // 简化的监听器实现，直接存储回调函数
    if (!this.globalListeners) {
      this.globalListeners = [];
    }
    this.globalListeners.push(callback);
  }

  /**
   * 移除监听器
   */
  removeListener(callback: () => void): void {
    if (this.globalListeners) {
      const index = this.globalListeners.indexOf(callback);
      if (index > -1) {
        this.globalListeners.splice(index, 1);
      }
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    if (this.globalListeners) {
      this.globalListeners.forEach(callback => callback());
    }
  }

  /**
   * 添加验证监听器
   */
  addValidationListener(nodeId: string, fieldName: string, callback: (isValid: boolean, errorMessage?: string) => void): void {
    const key = `${nodeId}-${fieldName}`;
    if (!this.validationListeners.has(key)) {
      this.validationListeners.set(key, []);
    }
    this.validationListeners.get(key)!.push(callback);
  }

  /**
   * 移除验证监听器
   */
  removeValidationListener(nodeId: string, fieldName: string): void {
    const key = `${nodeId}-${fieldName}`;
    this.validationListeners.delete(key);
  }

  /**
   * 触发所有字段的验证
   */
  triggerValidation(): void {
    this.fields.forEach((field, key) => {
      if (field.required) {
        const [nodeId, fieldName] = key.split('-');
        this.validateField(nodeId, fieldName);
      }
    });
  }
}

// 全局实例
export const formValidationManager = new FormValidationManager();

/**
 * 从节点元数据中提取表单字段信息
 */
export function getFormFieldsFromNode(node: NodeMeta): FieldValidation[] {
  const fields: FieldValidation[] = [];
  
  // 检查当前节点是否包含表单字段信息
  if (node.props?.fieldName) {
    fields.push({
      nodeId: node.id,
      fieldName: node.props.fieldName,
      required: node.props.required || false,
      value: node.props.value
    });
  }
  
  return fields;
}

/**
 * 递归收集所有表单字段
 */
export function collectAllFormFields(rootNode: NodeMeta): FieldValidation[] {
  const allFields: FieldValidation[] = [];
  
  function traverse(node: NodeMeta) {
    // 收集当前节点的字段
    allFields.push(...getFormFieldsFromNode(node));
    
    // 递归处理子节点
    if (node.children) {
      node.children.forEach(child => traverse(child));
    }
  }
  
  traverse(rootNode);
  return allFields;
}
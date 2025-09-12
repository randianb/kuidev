import { formValidationManager } from './form-validation';
import type { NodeMeta } from './types';

/**
 * 表单提交处理器
 * 用于在表单提交时验证所有必填字段
 */
export class FormSubmitHandler {
  /**
   * 验证表单并显示错误信息
   * @param rootNode 根节点，用于收集所有表单字段
   * @returns 验证是否通过
   */
  static validateAndSubmit(rootNode: NodeMeta): boolean {
    // 收集所有表单字段
    const formFields = this.collectFormFields(rootNode);
    
    let hasErrors = false;
    
    // 验证每个必填字段
    formFields.forEach(field => {
      if (field.required) {
        const isValid = formValidationManager.validateField(field.nodeId, field.fieldName);
        if (!isValid) {
          hasErrors = true;
        }
      }
    });
    
    // 触发所有字段的验证状态更新
    formValidationManager.triggerValidation();
    
    return !hasErrors;
  }
  
  /**
   * 从节点树中收集所有表单字段
   */
  private static collectFormFields(node: NodeMeta): Array<{nodeId: string, fieldName: string, required: boolean}> {
    const fields: Array<{nodeId: string, fieldName: string, required: boolean}> = [];
    
    // 检查当前节点是否是表单字段
    if (this.isFormField(node) && node.props?.fieldName) {
      fields.push({
        nodeId: node.id,
        fieldName: node.props.fieldName,
        required: node.props?.required || false
      });
    }
    
    // 递归检查子节点
    if (node.children) {
      node.children.forEach(child => {
        fields.push(...this.collectFormFields(child));
      });
    }
    
    return fields;
  }
  
  /**
   * 判断节点是否是表单字段
   */
  private static isFormField(node: NodeMeta): boolean {
    const formFieldTypes = [
      'Input', 'Textarea', 'Switch', 'Slider', 
      'Select', 'Transfer', 'Upload'
    ];
    return formFieldTypes.includes(node.type);
  }
}

/**
 * 全局表单提交函数
 * 可以在事件处理器中调用
 */
export function submitForm(rootNode: NodeMeta): boolean {
  return FormSubmitHandler.validateAndSubmit(rootNode);
}
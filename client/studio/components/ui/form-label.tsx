import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formValidationManager, FieldValidation } from '../../form-validation';

interface FormLabelProps {
  label?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  nodeId?: string;
  fieldName?: string;
}

export function FormLabel({ label, required, className, children, nodeId, fieldName }: FormLabelProps) {
  const [validation, setValidation] = useState<FieldValidation | undefined>();

  useEffect(() => {
    if (nodeId && fieldName) {
      // 注册字段
      formValidationManager.registerField(nodeId, fieldName, !!required);
      
      // 监听验证状态变化
      const updateValidation = () => {
        const fieldValidation = formValidationManager.getFieldValidation(nodeId, fieldName);
        setValidation(fieldValidation);
      };
      
      formValidationManager.addListener(updateValidation);
      updateValidation();
      
      return () => {
        formValidationManager.removeListener(updateValidation);
        formValidationManager.unregisterField(nodeId, fieldName);
      };
    }
  }, [nodeId, fieldName, required]);

  if (!label) {
    return (
      <div className={className}>
        {children}
        {validation && validation.hasBlurred && !validation.isValid && validation.errorMessage && (
          <p className="text-sm text-red-500 mt-1">{validation.errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {validation && validation.hasBlurred && !validation.isValid && validation.errorMessage && (
        <p className="text-sm text-red-500">{validation.errorMessage}</p>
      )}
    </div>
  );
}
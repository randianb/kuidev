import React from 'react';
import { Button } from '@/components/ui/button';
import { FormSubmitHandler } from '../../form-submit-handler';
import type { NodeMeta } from '../../types';

interface SubmitButtonProps {
  children?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  rootNode?: NodeMeta;
  onSubmit?: (isValid: boolean) => void;
  onClick?: () => void;
}

export function SubmitButton({
  children = '提交',
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
  rootNode,
  onSubmit,
  onClick,
  ...props
}: SubmitButtonProps) {
  const handleClick = () => {
    // 执行自定义点击事件
    if (onClick) {
      onClick();
    }
    
    // 如果提供了根节点，执行表单验证
    if (rootNode) {
      const isValid = FormSubmitHandler.validateAndSubmit(rootNode);
      
      if (onSubmit) {
        onSubmit(isValid);
      }
      
      if (isValid) {
        console.log('表单验证通过，可以提交');
      } else {
        console.log('表单验证失败，请检查必填项');
      }
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Condition, FieldDefinition, Operator } from './types';
import { 
  getOperatorsForFieldType, 
  operatorNeedsValue, 
  operatorNeedsDoubleValue, 
  operatorNeedsArrayValue,
  operatorNeedsCustomExpression 
} from './config';

interface ConditionRowProps {
  condition: Condition;
  fields: FieldDefinition[];
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  className?: string;
  showRemoveButton?: boolean;
}

export function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
  className,
  showRemoveButton = true
}: ConditionRowProps) {
  const [localCondition, setLocalCondition] = useState<Condition>(condition);

  // 同步外部变化
  useEffect(() => {
    setLocalCondition(condition);
  }, [condition]);

  // 获取当前字段定义
  const currentField = fields.find(f => f.key === localCondition.field);
  
  // 获取当前字段支持的操作符
  const availableOperators = currentField 
    ? getOperatorsForFieldType(currentField.type)
    : [];

  // 更新条件并通知父组件
  const updateCondition = (updates: Partial<Condition>) => {
    const newCondition = { ...localCondition, ...updates };
    setLocalCondition(newCondition);
    onChange(newCondition);
  };

  // 字段变化处理
  const handleFieldChange = (fieldKey: string) => {
    const field = fields.find(f => f.key === fieldKey);
    if (!field) return;

    const supportedOperators = getOperatorsForFieldType(field.type);
    const newOperator = supportedOperators.length > 0 ? supportedOperators[0].operator : '=';
    
    updateCondition({
      field: fieldKey,
      operator: newOperator,
      value: undefined,
      customExpression: undefined
    });
  };

  // 操作符变化处理
  const handleOperatorChange = (operator: Operator) => {
    const updates: Partial<Condition> = { operator };
    
    // 清除不需要的值
    if (!operatorNeedsValue(operator)) {
      updates.value = undefined;
    }
    if (!operatorNeedsCustomExpression(operator)) {
      updates.customExpression = undefined;
    }
    
    updateCondition(updates);
  };

  // 值变化处理
  const handleValueChange = (value: any) => {
    updateCondition({ value });
  };

  // 自定义表达式变化处理
  const handleCustomExpressionChange = (customExpression: string) => {
    updateCondition({ customExpression });
  };

  // 渲染值输入组件
  const renderValueInput = () => {
    if (!operatorNeedsValue(localCondition.operator)) {
      return null;
    }

    if (operatorNeedsCustomExpression(localCondition.operator)) {
      return (
        <Textarea
          placeholder="输入自定义表达式..."
          value={localCondition.customExpression || ''}
          onChange={(e) => handleCustomExpressionChange(e.target.value)}
          className="min-h-[80px]"
        />
      );
    }

    if (operatorNeedsArrayValue(localCondition.operator)) {
      return <ArrayValueInput value={localCondition.value} onChange={handleValueChange} />;
    }

    if (operatorNeedsDoubleValue(localCondition.operator)) {
      return <RangeValueInput 
        value={localCondition.value} 
        onChange={handleValueChange}
        fieldType={currentField?.type || 'text'}
      />;
    }

    // 单值输入
    return <SingleValueInput 
      value={localCondition.value}
      onChange={handleValueChange}
      field={currentField}
    />;
  };

  return (
    <div className={cn("border rounded-lg bg-background overflow-hidden", className)}>
      <div className="flex items-start gap-2 p-3 min-w-[480px]">
        {/* 字段选择 */}
        <div className="min-w-[120px] flex-shrink-0">
          <Select value={localCondition.field} onValueChange={handleFieldChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="选择字段" />
            </SelectTrigger>
            <SelectContent>
              {fields.map(field => (
                <SelectItem key={field.key} value={field.key}>
                  {field.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作符选择 */}
        <div className="min-w-[90px] flex-shrink-0">
          <Select value={localCondition.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="操作符" />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map(op => (
                <SelectItem key={op.operator} value={op.operator}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 值输入 */}
        <div className="flex-1 min-w-[150px]">
          {renderValueInput()}
        </div>

        {/* 删除按钮 */}
        {showRemoveButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// 单值输入组件
function SingleValueInput({ 
  value, 
  onChange, 
  field 
}: { 
  value: any; 
  onChange: (value: any) => void; 
  field?: FieldDefinition;
}) {
  if (!field) {
    return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }

  switch (field.type) {
    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        />
      );

    case 'date':
      return (
        <DatePicker
          value={value ? new Date(value) : undefined}
          onChange={(date) => onChange(date?.toISOString())}
        />
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-sm">{value ? '是' : '否'}</span>
        </div>
      );

    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择值" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multiselect':
      return (
        <MultiSelectInput
          options={field.options || []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );

    default:
      return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

// 范围值输入组件
function RangeValueInput({ 
  value, 
  onChange, 
  fieldType 
}: { 
  value: any; 
  onChange: (value: [any, any]) => void; 
  fieldType: string;
}) {
  const [min, max] = Array.isArray(value) ? value : ['', ''];

  const handleMinChange = (newMin: any) => {
    onChange([newMin, max]);
  };

  const handleMaxChange = (newMax: any) => {
    onChange([min, newMax]);
  };

  if (fieldType === 'number') {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="最小值"
          value={min || ''}
          onChange={(e) => handleMinChange(e.target.value ? Number(e.target.value) : undefined)}
        />
        <span className="text-muted-foreground">到</span>
        <Input
          type="number"
          placeholder="最大值"
          value={max || ''}
          onChange={(e) => handleMaxChange(e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>
    );
  }

  if (fieldType === 'date') {
    return (
      <div className="flex items-center gap-2">
        <DatePicker
          value={min ? new Date(min) : undefined}
          onChange={(date) => handleMinChange(date?.toISOString())}
        />
        <span className="text-muted-foreground">到</span>
        <DatePicker
          value={max ? new Date(max) : undefined}
          onChange={(date) => handleMaxChange(date?.toISOString())}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="起始值"
        value={min || ''}
        onChange={(e) => handleMinChange(e.target.value)}
      />
      <span className="text-muted-foreground">到</span>
      <Input
        placeholder="结束值"
        value={max || ''}
        onChange={(e) => handleMaxChange(e.target.value)}
      />
    </div>
  );
}

// 数组值输入组件
function ArrayValueInput({ 
  value, 
  onChange 
}: { 
  value: any; 
  onChange: (value: any[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const values = Array.isArray(value) ? value : [];

  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="输入值后按回车添加"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button type="button" size="sm" onClick={addValue}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((val, index) => (
            <Badge key={index} variant="secondary" className="cursor-pointer">
              {String(val)}
              <X 
                className="h-3 w-3 ml-1" 
                onClick={() => removeValue(index)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// 多选输入组件
function MultiSelectInput({ 
  options, 
  value, 
  onChange 
}: { 
  options: Array<{ label: string; value: any }>; 
  value: any[]; 
  onChange: (value: any[]) => void;
}) {
  const toggleValue = (optionValue: any) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
        {options.map(option => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              checked={value.includes(option.value)}
              onCheckedChange={() => toggleValue(option.value)}
            />
            <span className="text-sm">{option.label}</span>
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((val, index) => {
            const option = options.find(opt => opt.value === val);
            return (
              <Badge key={index} variant="secondary">
                {option?.label || String(val)}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
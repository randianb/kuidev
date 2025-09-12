import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";

export interface TransferItem {
  key: string;
  title: string;
  disabled?: boolean;
}

export interface TransferProps {
  dataSource: TransferItem[];
  targetKeys?: string[];
  selectedKeys?: string[];
  onChange?: (targetKeys: string[], direction: 'left' | 'right', moveKeys: string[]) => void;
  onSelectChange?: (sourceSelectedKeys: string[], targetSelectedKeys: string[]) => void;
  render?: (item: TransferItem) => React.ReactNode;
  titles?: [string, string];
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export function Transfer({
  dataSource = [],
  targetKeys = [],
  selectedKeys = [],
  onChange,
  onSelectChange,
  render,
  titles = ['Source', 'Target'],
  showSearch = false,
  searchPlaceholder = 'Search items',
  className
}: TransferProps) {
  const [sourceSelectedKeys, setSourceSelectedKeys] = useState<string[]>([]);
  const [targetSelectedKeys, setTargetSelectedKeys] = useState<string[]>([]);
  const [leftFilter, setLeftFilter] = useState('');
  const [rightFilter, setRightFilter] = useState('');

  const leftDataSource = dataSource.filter(item => !targetKeys.includes(item.key));
  const rightDataSource = dataSource.filter(item => targetKeys.includes(item.key));

  const filteredLeftData = leftDataSource.filter(item => 
    item.title.toLowerCase().includes(leftFilter.toLowerCase())
  );
  const filteredRightData = rightDataSource.filter(item => 
    item.title.toLowerCase().includes(rightFilter.toLowerCase())
  );

  const handleSelectChange = (keys: string[], side: 'left' | 'right') => {
    if (side === 'left') {
      setSourceSelectedKeys(keys);
      onSelectChange?.(keys, targetSelectedKeys);
    } else {
      setTargetSelectedKeys(keys);
      onSelectChange?.(sourceSelectedKeys, keys);
    }
  };

  const handleMove = (direction: 'left' | 'right') => {
    const moveKeys = direction === 'right' ? sourceSelectedKeys : targetSelectedKeys;
    const newTargetKeys = direction === 'right' 
      ? [...targetKeys, ...moveKeys]
      : targetKeys.filter(key => !moveKeys.includes(key));
    
    onChange?.(newTargetKeys, direction, moveKeys);
    
    if (direction === 'right') {
      setSourceSelectedKeys([]);
    } else {
      setTargetSelectedKeys([]);
    }
  };

  const renderPanel = (data: TransferItem[], selectedKeys: string[], side: 'left' | 'right') => {
    const checkboxRef = useRef<React.ElementRef<typeof CheckboxPrimitive.Root>>(null);
    
    const handleSelectAll = (checked: boolean) => {
      const allKeys = data.filter(item => !item.disabled).map(item => item.key);
      handleSelectChange(checked ? allKeys : [], side);
    };

    const handleItemSelect = (key: string, checked: boolean) => {
      const newKeys = checked 
        ? [...selectedKeys, key]
        : selectedKeys.filter(k => k !== key);
      handleSelectChange(newKeys, side);
    };

    const checkedCount = selectedKeys.length;
    const checkableCount = data.filter(item => !item.disabled).length;
    const checkAllChecked = checkableCount > 0 && checkedCount === checkableCount;
    const checkAllIndeterminate = checkedCount > 0 && checkedCount < checkableCount;
    
    // Note: Radix UI Checkbox doesn't support indeterminate state directly
    // The visual state is handled by the checked prop and styling

    return (
      <div className="flex flex-col border rounded-md h-64 w-48">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{titles[side === 'left' ? 0 : 1]}</span>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{data.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              ref={checkboxRef}
              checked={checkAllChecked}
              onCheckedChange={handleSelectAll}
              disabled={checkableCount === 0}
            />
            <span className="text-sm">Select all</span>
          </div>
          {showSearch && (
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={side === 'left' ? leftFilter : rightFilter}
                onChange={(e) => side === 'left' ? setLeftFilter(e.target.value) : setRightFilter(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {data.map(item => (
            <div
              key={item.key}
              className={cn(
                "flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !item.disabled && handleItemSelect(item.key, !selectedKeys.includes(item.key))}
            >
              <Checkbox
                checked={selectedKeys.includes(item.key)}
                disabled={item.disabled}
                onCheckedChange={(checked) => handleItemSelect(item.key, !!checked)}
              />
              <span className="text-sm flex-1">
                {render ? render(item) : item.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {renderPanel(filteredLeftData, sourceSelectedKeys, 'left')}
      
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={sourceSelectedKeys.length === 0}
          onClick={() => handleMove('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={targetSelectedKeys.length === 0}
          onClick={() => handleMove('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      {renderPanel(filteredRightData, targetSelectedKeys, 'right')}
    </div>
  );
}
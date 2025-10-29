import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConditionGroup, Condition, FieldDefinition } from './types';
import { ConditionRow } from './ConditionRow';
import { createCondition, createConditionGroup } from './utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface GroupNodeProps {
  group: ConditionGroup;
  fields: FieldDefinition[];
  onChange: (group: ConditionGroup) => void;
  onRemove?: () => void;
  depth?: number;
  maxDepth?: number;
  showRemoveButton?: boolean;
  className?: string;
}

export function GroupNode({
  group,
  fields,
  onChange,
  onRemove,
  depth = 0,
  maxDepth = 5,
  showRemoveButton = true,
  className
}: GroupNodeProps) {

  // 更新组逻辑操作符
  const handleLogicalChange = (logical: 'AND' | 'OR') => {
    onChange({ ...group, logical });
  };

  // 添加条件
  const handleAddCondition = () => {
    const newCondition = createCondition(fields[0]?.key || '');
    onChange({
      ...group,
      children: [...(group.children || []), newCondition]
    });
  };

  // 添加子组
  const handleAddGroup = () => {
    if (depth >= maxDepth) return;

    const newGroup = createConditionGroup();
    onChange({
      ...group,
      children: [...(group.children || []), newGroup]
    });
  };

  // 更新子节点
  const handleChildChange = (index: number, child: Condition | ConditionGroup) => {
    const newChildren = [...(group.children || [])];
    newChildren[index] = child;
    onChange({ ...group, children: newChildren });
  };

  // 删除子节点
  const handleChildRemove = (index: number) => {
    const newChildren = (group.children || []).filter((_, i) => i !== index);
    onChange({ ...group, children: newChildren });
  };

  // 获取缩进样式
  const getIndentStyle = () => {
    return {
      marginLeft: `${depth * 20}px`,
      borderLeft: depth > 0 ? '2px solid hsl(var(--border))' : 'none',
      paddingLeft: depth > 0 ? '16px' : '0'
    };
  };

  // 获取组标题颜色
  const getGroupColor = () => {
    const colors = [
      'border-blue-200 bg-blue-50',
      'border-green-200 bg-green-50',
      'border-purple-200 bg-purple-50',
      'border-orange-200 bg-orange-50',
      'border-pink-200 bg-pink-50'
    ];
    return colors[depth % colors.length];
  };

  return (
    <Card className={cn("relative h-full", getGroupColor(), className)} style={getIndentStyle()}>

      <CardContent className="flex flex-col h-full  p-4">
        {/* 组头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                分组 {depth + 1}
              </span>
            </div>

            {/* 逻辑操作符选择 */}
            <Select value={group.logical} onValueChange={handleLogicalChange}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground">
              ({group.children?.length || 0} 个条件)
            </span>
          </div>

          {/* 删除组按钮 */}
          {showRemoveButton && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 可滚动的子节点列表 */}
        <ScrollArea className="flex-1 h-0">
          <div className="space-y-3 pr-2 pb-2">
            {(group.children || []).map((child, index) => (
              <div key={child.id} className="relative">
                {/* 逻辑连接符显示 */}
                {index > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <div className="px-2 py-1 bg-background border rounded text-xs font-medium text-muted-foreground">
                      {group.logical}
                    </div>
                  </div>
                )}

                {/* 渲染子节点 */}
                {child.type === 'group' ? (
                  <GroupNode
                    group={child as ConditionGroup}
                    fields={fields}
                    onChange={(updatedChild) => handleChildChange(index, updatedChild)}
                    onRemove={() => handleChildRemove(index)}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    showRemoveButton={(group.children?.length || 0) > 1}
                  />
                ) : (
                  <ConditionRow
                    condition={child as Condition}
                    fields={fields}
                    onChange={(updatedChild) => handleChildChange(index, updatedChild)}
                    onRemove={() => handleChildRemove(index)}
                    showRemoveButton={(group.children?.length || 0) > 1}
                  />
                )}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* 添加按钮 */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-dashed flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加条件
          </Button>

          {depth < maxDepth && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddGroup}
              className="flex-1"
            >
              <Layers className="h-4 w-4 mr-1" />
              添加分组
            </Button>
          )}
        </div>

        {/* 深度限制提示 */}
        {depth >= maxDepth && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            已达到最大嵌套深度 ({maxDepth})
          </div>
        )}
      </CardContent>
    </Card>
  );
}
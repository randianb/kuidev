import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from "lucide-react";

export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  disabled?: boolean;
  icon?: React.ReactNode;
  isLeaf?: boolean;
}

export interface TreeProps {
  treeData: TreeNode[];
  defaultExpandedKeys?: string[];
  defaultSelectedKeys?: string[];
  expandedKeys?: string[];
  selectedKeys?: string[];
  onExpand?: (expandedKeys: string[], info: { expanded: boolean; node: TreeNode }) => void;
  onSelect?: (selectedKeys: string[], info: { selected: boolean; node: TreeNode }) => void;
  showIcon?: boolean;
  showLine?: boolean;
  checkable?: boolean;
  checkedKeys?: string[];
  onCheck?: (checkedKeys: string[], info: { checked: boolean; node: TreeNode }) => void;
  className?: string;
  height?: number;
}

export function Tree({
  treeData = [],
  defaultExpandedKeys = [],
  defaultSelectedKeys = [],
  expandedKeys,
  selectedKeys,
  onExpand,
  onSelect,
  showIcon = true,
  showLine = false,
  checkable = false,
  checkedKeys = [],
  onCheck,
  className,
  height
}: TreeProps) {
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(defaultExpandedKeys);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(defaultSelectedKeys);
  const [internalCheckedKeys, setInternalCheckedKeys] = useState<string[]>(checkedKeys || []);

  const currentExpandedKeys = expandedKeys ?? internalExpandedKeys;
  const currentSelectedKeys = selectedKeys ?? internalSelectedKeys;
  const currentCheckedKeys = checkedKeys ?? internalCheckedKeys;

  const handleExpand = (node: TreeNode) => {
    const expanded = !currentExpandedKeys.includes(node.key);
    const newExpandedKeys = expanded
      ? [...currentExpandedKeys, node.key]
      : currentExpandedKeys.filter(key => key !== node.key);
    
    if (!expandedKeys) {
      setInternalExpandedKeys(newExpandedKeys);
    }
    onExpand?.(newExpandedKeys, { expanded, node });
  };

  const handleSelect = (node: TreeNode) => {
    if (node.disabled) return;
    
    const selected = !currentSelectedKeys.includes(node.key);
    const newSelectedKeys = selected
      ? [node.key] // 单选模式
      : [];
    
    if (!selectedKeys) {
      setInternalSelectedKeys(newSelectedKeys);
    }
    onSelect?.(newSelectedKeys, { selected, node });
  };

  const handleCheck = (node: TreeNode) => {
    if (node.disabled) return;
    
    const checked = !currentCheckedKeys.includes(node.key);
    const newCheckedKeys = checked
      ? [...currentCheckedKeys, node.key]
      : currentCheckedKeys.filter(key => key !== node.key);
    
    if (checkedKeys === undefined) {
      setInternalCheckedKeys(newCheckedKeys);
    }
    onCheck?.(newCheckedKeys, { checked, node });
  };

  const renderIcon = (node: TreeNode, isExpanded: boolean) => {
    if (node.icon) {
      return node.icon;
    }
    
    if (node.isLeaf) {
      return <File className="h-4 w-4 text-muted-foreground" />;
    }
    
    return isExpanded 
      ? <FolderOpen className="h-4 w-4 text-blue-500" />
      : <Folder className="h-4 w-4 text-blue-500" />;
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = currentExpandedKeys.includes(node.key);
    const isSelected = currentSelectedKeys.includes(node.key);
    const isChecked = currentCheckedKeys.includes(node.key);
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = level * 24;

    return (
      <div key={node.key} className="select-none">
        <div
          className={cn(
            "flex items-center py-1 px-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm",
            isSelected && "bg-accent text-accent-foreground",
            node.disabled && "opacity-50 cursor-not-allowed",
            showLine && level > 0 && "border-l border-border ml-3"
          )}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
        >
          {/* 展开/收起按钮 */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand(node);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="h-4 w-4" />
          )}

          {/* 复选框 */}
          {checkable && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleCheck(node)}
              className="mr-2 h-4 w-4"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* 图标 */}
          {showIcon && (
            <span className="mr-2">
              {renderIcon(node, isExpanded)}
            </span>
          )}

          {/* 标题 */}
          <span
            className="flex-1 text-sm"
            onClick={() => handleSelect(node)}
          >
            {node.title}
          </span>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={cn("tree-container", className)}
      style={{ height: height ? `${height}px` : undefined, overflow: height ? 'auto' : undefined }}
    >
      {treeData.map(node => renderTreeNode(node))}
    </div>
  );
}

// 默认导出
export default Tree;
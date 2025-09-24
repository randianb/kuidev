import React from 'react';
import { TableHead } from '@/components/ui/table';
import { GripVertical, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DragState, ColumnDragHandlers } from '../hooks/use-column-drag';

interface DraggableTableHeaderProps {
  index: number;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  dragState: DragState;
  handlers: ColumnDragHandlers;
  onSort?: () => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  columnKey?: string;
  enableDrag?: boolean;
  children?: React.ReactNode;
}

export function DraggableTableHeader({
  index,
  title,
  width,
  align,
  sortable,
  className,
  style,
  dragState,
  handlers,
  onSort,
  sortConfig,
  columnKey,
  enableDrag = true,
  children,
}: DraggableTableHeaderProps) {
  const isDragging = dragState.dragIndex === index;
  const isHovered = dragState.hoverIndex === index;
  const isDropTarget = dragState.isDragging && dragState.dragIndex !== index;

  const handleDragStart = (e: React.DragEvent) => {
    if (!enableDrag) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    handlers.onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDrag || !dragState.isDragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handlers.onDragOver(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableDrag) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (!isNaN(dragIndex) && dragIndex !== index) {
      handlers.onDrop(dragIndex, index);
    }
  };

  const handleDragEnd = () => {
    if (!enableDrag) return;
    handlers.onDragEnd();
  };

  return (
    <TableHead
      className={cn(
        'relative group select-none',
        className,
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        isDragging && 'opacity-50 bg-blue-50 dark:bg-blue-950/30',
        isHovered && isDropTarget && 'bg-blue-100 dark:bg-blue-900/50',
        enableDrag && 'cursor-move'
      )}
      style={{ width, ...style }}
      draggable={enableDrag}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-1">
        {/* 拖拽手柄 */}
        {enableDrag && (
          <GripVertical 
            className={cn(
              "h-4 w-4 text-muted-foreground/50 transition-opacity",
              "opacity-0 group-hover:opacity-100",
              isDragging && "opacity-100"
            )} 
          />
        )}
        
        {/* 标题和排序 */}
        <span 
          className={cn(
            "flex items-center gap-1 flex-1",
            sortable && "cursor-pointer hover:text-foreground"
          )}
          onClick={onSort}
        >
          {title}
          {sortable && (
            <ArrowUpDown className={cn(
              "h-3 w-3",
              sortConfig?.key === columnKey ? "opacity-100" : "opacity-50"
            )} />
          )}
        </span>
      </div>
      
      {/* 子内容（如筛选框等） */}
      {children}
      
      {/* 拖拽指示器 */}
      {isHovered && isDropTarget && (
        <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded pointer-events-none" />
      )}
    </TableHead>
  );
}
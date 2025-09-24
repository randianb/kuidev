import { useState, useCallback } from 'react';

export interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  hoverIndex: number | null;
}

export interface ColumnDragHandlers {
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  onDrop: (dragIndex: number, hoverIndex: number) => void;
}

export function useColumnDrag<T extends { key: string }>(
  columns: T[],
  onColumnsChange: (newColumns: T[]) => void
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    hoverIndex: null,
  });

  const handleDragStart = useCallback((index: number) => {
    setDragState({
      isDragging: true,
      dragIndex: index,
      hoverIndex: null,
    });
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragState(prev => ({
      ...prev,
      hoverIndex: index,
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      dragIndex: null,
      hoverIndex: null,
    });
  }, []);

  const handleDrop = useCallback((dragIndex: number, hoverIndex: number) => {
    if (dragIndex === hoverIndex) return;

    const newColumns = [...columns];
    const draggedColumn = newColumns[dragIndex];
    
    // 移除拖拽的列
    newColumns.splice(dragIndex, 1);
    // 在新位置插入
    newColumns.splice(hoverIndex, 0, draggedColumn);
    
    onColumnsChange(newColumns);
    handleDragEnd();
  }, [columns, onColumnsChange, handleDragEnd]);

  const handlers: ColumnDragHandlers = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
  };

  return {
    dragState,
    handlers,
  };
}
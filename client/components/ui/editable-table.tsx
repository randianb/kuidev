import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { LookupSelector } from "@/components/ui/lookup-selector";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Save, X, Upload, Link, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { bus } from "@/lib/eventBus";
import { useColumnDrag } from "@/studio/hooks/use-column-drag";
import { DraggableTableHeader } from "@/studio/components/draggable-table-header";

interface EditableColumn {
  key: string;
  title: string;
  type: 'text' | 'number' | 'richtext' | 'date' | 'select' | 'multiselect' | 'lookup' | 'progress' | 'link' | 'image' | 'file' | 'autonumber';
  width?: string;
  required?: boolean;
  editable?: boolean;
  options?: Array<{ label: string; value: string }>;
  lookupConfig?: {
    dataSource: any[];
    columns: Array<{ key: string; title: string; width?: string }>;
    displayField: string;
    multiple?: boolean;
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface EditableTableProps {
  columns: EditableColumn[];
  data: any[];
  onChange?: (data: any[]) => void;
  onCellChange?: (rowIndex: number, columnKey: string, oldValue: any, newValue: any) => void;
  onRefresh?: () => void;
  className?: string;
  allowAdd?: boolean;
  allowDelete?: boolean;
  allowEdit?: boolean;
  allowRefresh?: boolean;
  pageSize?: number;
  listId?: string;
  componentId?: string;
  nodeId?: string;
  stickyActions?: boolean; // 是否固定操作列到最右侧
  actionsWidth?: string; // 操作列宽度
  enableColumnDrag?: boolean; // 是否启用列拖拽
  onColumnOrderChange?: (newColumns: EditableColumn[]) => void; // 列顺序变化回调
}

export function EditableTable({
  columns,
  data = [],
  onChange,
  onCellChange,
  onRefresh,
  className,
  allowAdd = true,
  allowDelete = true,
  allowEdit = true,
  allowRefresh = true,
  pageSize = 10,
  listId,
  componentId,
  nodeId,
  stickyActions = false,
  actionsWidth = 'auto',
  enableColumnDrag = false,
  onColumnOrderChange
}: EditableTableProps) {
  const [tableData, setTableData] = useState(data);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnKey: string } | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localColumns, setLocalColumns] = useState<EditableColumn[]>(columns);
  const [autoNumberCounter, setAutoNumberCounter] = useState(() => {
    // 计算自动编号的起始值
    const autoNumberColumns = columns.filter(col => col.type === 'autonumber');
    if (autoNumberColumns.length === 0) return 1;
    
    const maxNumbers = autoNumberColumns.map(col => {
      const maxValue = Math.max(...data.map(row => parseInt(row[col.key]) || 0));
      return maxValue;
    });
    
    return Math.max(...maxNumbers, 0) + 1;
  });

  // 列拖拽功能
  const { dragState, handleDragStart, handleDragOver, handleDragEnd, handleDrop } = useColumnDrag({
    columns: localColumns,
    onColumnOrderChange: (newColumns) => {
      setLocalColumns(newColumns);
      onColumnOrderChange?.(newColumns);
    }
  });

  useEffect(() => {
    setTableData(data);
  }, [data]);

  // 同步外部传入的columns
  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  // 列表刷新功能
  useEffect(() => {
    const handleListRefresh = (payload: any) => {
      // 检查是否需要刷新当前列表
      const shouldRefresh = 
        !payload || // 刷新所有列表
        payload.listId === listId ||
        payload.componentId === componentId ||
        payload.nodeId === nodeId;

      if (shouldRefresh) {
        console.log('刷新列表数据:', { listId, componentId, nodeId });
        handleRefresh();
      }
    };

    const handleRefreshAll = () => {
      console.log('刷新所有列表数据');
      handleRefresh();
    };

    const unsubRefresh = bus.subscribe('list.refresh', handleListRefresh);
    const unsubRefreshAll = bus.subscribe('list.refresh.all', handleRefreshAll);

    return () => {
      unsubRefresh();
      unsubRefreshAll();
    };
  }, [listId, componentId, nodeId]);

  // 刷新处理函数
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('列表刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalPages = Math.ceil(tableData.length / pageSize);
  const paginatedData = tableData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleCellEdit = (rowIndex: number, columnKey: string, currentValue: any) => {
    if (!allowEdit) return;
    
    const column = localColumns.find(col => col.key === columnKey);
    if (!column || column.editable === false) return;

    setEditingCell({ rowIndex, columnKey });
    setEditingValue(currentValue);
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const newData = [...tableData];
    const actualRowIndex = (currentPage - 1) * pageSize + editingCell.rowIndex;
    const oldValue = newData[actualRowIndex][editingCell.columnKey];
    
    newData[actualRowIndex] = {
      ...newData[actualRowIndex],
      [editingCell.columnKey]: editingValue
    };

    setTableData(newData);
    onChange?.(newData);
    
    // 调用 onCellChange 事件
    onCellChange?.(actualRowIndex, editingCell.columnKey, oldValue, editingValue);
    
    setEditingCell(null);
    setEditingValue(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue(null);
  };

  const handleAddRow = () => {
    if (!allowAdd) return;

    const newRow: any = {};
    localColumns.forEach(column => {
      if (column.type === 'autonumber') {
        newRow[column.key] = autoNumberCounter;
      } else {
        newRow[column.key] = '';
      }
    });

    const newData = [...tableData, newRow];
    setTableData(newData);
    onChange?.(newData);
    setAutoNumberCounter(prev => prev + 1);
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!allowDelete) return;

    const actualRowIndex = (currentPage - 1) * pageSize + rowIndex;
    const newData = tableData.filter((_, index) => index !== actualRowIndex);
    setTableData(newData);
    onChange?.(newData);
  };

  const renderCellEditor = (column: EditableColumn, value: any) => {
    switch (column.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            autoFocus
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            min={column.validation?.min}
            max={column.validation?.max}
            autoFocus
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={setEditingValue}>
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <DatePicker
            value={value ? new Date(value) : undefined}
            onChange={(date) => setEditingValue(date?.toISOString().split('T')[0])}
          />
        );

      case 'richtext':
        return (
          <RichTextEditor
            value={value || ''}
            onChange={setEditingValue}
            placeholder="输入富文本内容..."
          />
        );

      case 'lookup':
        return (
          <LookupSelector
            value={value}
            onChange={setEditingValue}
            multiple={column.lookupConfig?.multiple}
            dataSource={column.lookupConfig?.dataSource || []}
            columns={column.lookupConfig?.columns || []}
            displayField={column.lookupConfig?.displayField || 'name'}
          />
        );

      case 'progress':
        return (
          <Input
            type="number"
            value={value || 0}
            onChange={(e) => setEditingValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            min={0}
            max={100}
            autoFocus
          />
        );

      case 'link':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            placeholder="https://..."
            autoFocus
          />
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            autoFocus
          />
        );
    }
  };

  const renderCellContent = (row: any, column: EditableColumn, rowIndex: number) => {
    const value = row[column.key];
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === column.key;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {renderCellEditor(column, editingValue)}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleCellSave}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCellCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }

    const handleClick = () => {
      if (column.type !== 'autonumber') {
        handleCellEdit(rowIndex, column.key, value);
      }
    };

    switch (column.type) {
      case 'autonumber':
        return <Badge variant="secondary">{value}</Badge>;

      case 'date':
        return (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            {value ? new Date(value).toLocaleDateString('zh-CN') : '-'}
          </div>
        );

      case 'richtext':
        return (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            <div 
              className="truncate max-w-[200px]"
              dangerouslySetInnerHTML={{ 
                __html: value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : '-'
              }}
            />
          </div>
        );

      case 'progress':
        return (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            <div className="flex items-center gap-2">
              <Progress value={value || 0} className="flex-1" />
              <span className="text-sm text-muted-foreground">{value || 0}%</span>
            </div>
          </div>
        );

      case 'link':
        return value ? (
          <div className="flex items-center gap-2">
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Link className="h-3 w-3" />
              链接
            </a>
            <Button size="sm" variant="ghost" onClick={handleClick}>
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            <span className="text-muted-foreground">点击添加链接</span>
          </div>
        );

      case 'image':
        return value ? (
          <div className="flex items-center gap-2">
            <img src={value} alt="" className="h-8 w-8 rounded object-cover" />
            <Button size="sm" variant="ghost" onClick={handleClick}>
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Upload className="h-3 w-3" />
              上传图片
            </div>
          </div>
        );

      case 'file':
        return value ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-blue-600">
              <FileText className="h-3 w-3" />
              文件
            </div>
            <Button size="sm" variant="ghost" onClick={handleClick}>
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Upload className="h-3 w-3" />
              上传文件
            </div>
          </div>
        );

      case 'select':
      case 'multiselect':
        const option = column.options?.find(opt => opt.value === value);
        return (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            {option ? option.label : value || '-'}
          </div>
        );

      case 'lookup':
        return (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            {value ? (
              Array.isArray(value) ? 
                `已选择 ${value.length} 项` : 
                value[column.lookupConfig?.displayField || 'name'] || value.id
            ) : '-'}
          </div>
        );

      default:
        return (
          <div className="cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={handleClick}>
            {value || '-'}
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 工具栏 */}
      {(allowAdd || allowRefresh) && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {allowAdd && (
              <Button onClick={handleAddRow} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                添加行
              </Button>
            )}
            {allowRefresh && (
              <Button 
                onClick={handleRefresh} 
                size="sm" 
                variant="outline"
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                刷新
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            共 {tableData.length} 条记录
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="border rounded-md">
        <div className={cn(
          "relative",
          stickyActions ? "overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" : "overflow-x-auto"
        )}
        style={{ 
          maxWidth: '100%',
          ...(stickyActions && { minWidth: 'fit-content' })
        }}>
          <Table 
             containerClassName="min-w-full"
             style={{ 
               minWidth: stickyActions ? `${columns.length * 150 + 80}px` : 'auto'
             }}
           >
            <TableHeader>
              <TableRow>
                {localColumns.map((column, index) => (
                  enableColumnDrag ? (
                    <DraggableTableHeader
                      key={column.key}
                      column={{
                        key: column.key,
                        title: column.title,
                        width: column.width,
                        sortable: false,
                        filterable: false
                      }}
                      index={index}
                      dragState={dragState}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                    >
                      <div className="flex items-center gap-1">
                        {column.title}
                        {column.required && <span className="text-red-500">*</span>}
                      </div>
                    </DraggableTableHeader>
                  ) : (
                    <TableHead key={column.key} style={{ width: column.width }}>
                      <div className="flex items-center gap-1">
                        {column.title}
                        {column.required && <span className="text-red-500">*</span>}
                      </div>
                    </TableHead>
                  )
                ))}
                {allowDelete && (
                  <TableHead 
                    className={cn(
                      "w-16",
                      stickyActions && "sticky right-0 bg-background border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]"
                    )}
                    style={{ width: actionsWidth }}
                  >
                    操作
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={localColumns.length + (allowDelete ? 1 : 0)} 
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {localColumns.map(column => (
                    <TableCell key={column.key}>
                      {renderCellContent(row, column, rowIndex)}
                    </TableCell>
                  ))}
                  {allowDelete && (
                    <TableCell 
                      className={cn(
                        stickyActions && "sticky right-0 bg-background border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]"
                      )}
                      style={{ width: actionsWidth }}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            第 {currentPage} 页 / 共 {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
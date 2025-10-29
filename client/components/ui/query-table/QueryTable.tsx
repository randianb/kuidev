import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  Filter, 
  Download, 
  Save, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QueryBuilder } from '../query-builder';
import { QueryEngine } from '../query-builder/QueryEngine';
import type { 
  FieldDefinition, 
  QueryRoot, 
  QueryBuilderConfig, 
  QueryBuilderEvents,
  QueryScenario,
  QueryExecutionResult
} from '../query-builder/types';

export interface QueryTableColumn {
  key: string;
  title: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: 'text' | 'link' | 'image' | 'badge' | 'date' | 'currency';
  sortable?: boolean;
  filterable?: boolean;
  ellipsis?: boolean;
}

export interface QueryTableProps {
  // 基础表格属性
  columns: QueryTableColumn[];
  data: any[];
  loading?: boolean;
  error?: string | null;
  
  // 查询构建器属性
  enableQueryBuilder?: boolean;
  fields?: FieldDefinition[];
  initialQuery?: QueryRoot;
  queryBuilderConfig?: Partial<QueryBuilderConfig>;
  
  // 表格功能
  enableSearch?: boolean;
  enableSelection?: boolean;
  selectionMode?: 'single' | 'multiple';
  showRowNumber?: boolean;
  
  // 分页
  pageSize?: number;
  showPager?: boolean;
  
  // 样式
  className?: string;
  variant?: 'default' | 'striped' | 'compact';
  size?: 'default' | 'lg';
  
  // 事件
  onRowClick?: (row: any, index: number) => void;
  onRowSelect?: (selectedRows: any[]) => void;
  onQueryChange?: (query: QueryRoot) => void;
  onQueryExecute?: (result: QueryExecutionResult<any>) => void;
  onExportData?: (data: any[]) => void;
}

export function QueryTable({
  columns,
  data,
  loading = false,
  error = null,
  enableQueryBuilder = true,
  fields = [],
  initialQuery,
  queryBuilderConfig = {},
  enableSearch = true,
  enableSelection = false,
  selectionMode = 'multiple',
  showRowNumber = false,
  pageSize = 10,
  showPager = true,
  className,
  variant = 'default',
  size = 'default',
  onRowClick,
  onRowSelect,
  onQueryChange,
  onQueryExecute,
  onExportData
}: QueryTableProps) {
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState<QueryRoot | undefined>(initialQuery);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [queryEngine] = useState(() => new QueryEngine(fields.length > 0 ? fields : []));

  // 自动生成字段定义（如果未提供）
  const autoFields = useMemo((): FieldDefinition[] => {
    if (fields.length > 0) return fields;
    
    return columns.map(col => ({
      key: col.key,
      title: col.title,
      type: inferFieldType(data, col.key)
    }));
  }, [fields, columns, data]);

  // 推断字段类型
  function inferFieldType(data: any[], key: string): FieldDefinition['type'] {
    if (data.length === 0) return 'text';
    
    const sample = data.find(row => row[key] != null)?.[key];
    if (sample == null) return 'text';
    
    if (typeof sample === 'number') return 'number';
    if (typeof sample === 'boolean') return 'boolean';
    if (sample instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(sample))) return 'date';
    
    return 'text';
  }

  // 数据处理：查询过滤 + 搜索
  const processedData = useMemo(() => {
    let filtered = [...data];
    
    // 应用查询构建器过滤
    if (currentQuery && enableQueryBuilder) {
      try {
        const result = queryEngine.execute(filtered, currentQuery);
        filtered = result.data || [];
        
        // 触发查询执行事件
        if (onQueryExecute) {
          onQueryExecute(result);
        }
      } catch (err) {
        console.error('Query execution failed:', err);
      }
    }
    
    // 应用搜索过滤
    if (enableSearch && searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(row => {
        return columns.some(col => {
          const value = String(row[col.key] || '').toLowerCase();
          return value.includes(searchLower);
        });
      });
    }
    
    return filtered;
  }, [data, currentQuery, searchText, enableQueryBuilder, enableSearch, columns, queryEngine, onQueryExecute]);

  // 分页数据
  const pagedData = useMemo(() => {
    if (!showPager) return processedData;
    
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize, showPager]);

  // 查询构建器事件处理
  const queryBuilderEvents: QueryBuilderEvents = {
    onChange: useCallback((query: QueryRoot) => {
      setCurrentQuery(query);
      setPage(1); // 重置页码
      onQueryChange?.(query);
    }, [onQueryChange]),
    
    onExecute: useCallback(async (query: QueryRoot) => {
      try {
        const result = queryEngine.executeQuery(data, query);
        onQueryExecute?.(result);
        return result;
      } catch (err) {
        console.error('Query execution failed:', err);
        throw err;
      }
    }, [data, queryEngine, onQueryExecute]),
    
    onExportText: useCallback((text: string) => {
      navigator.clipboard.writeText(text);
      // 可以添加 toast 提示
    }, []),
    
    onReset: useCallback(() => {
      setCurrentQuery(undefined);
      setPage(1);
      onQueryChange?.(undefined as any);
    }, [onQueryChange])
  };

  // 行选择处理
  const handleRowSelect = useCallback((rowIndex: number) => {
    if (!enableSelection) return;
    
    const newSelectedRows = new Set(selectedRows);
    
    if (selectionMode === 'single') {
      newSelectedRows.clear();
      if (!selectedRows.has(rowIndex)) {
        newSelectedRows.add(rowIndex);
      }
    } else {
      if (selectedRows.has(rowIndex)) {
        newSelectedRows.delete(rowIndex);
      } else {
        newSelectedRows.add(rowIndex);
      }
    }
    
    setSelectedRows(newSelectedRows);
    
    // 触发选择事件
    const selectedData = Array.from(newSelectedRows).map(index => pagedData[index]).filter(Boolean);
    onRowSelect?.(selectedData);
  }, [enableSelection, selectionMode, selectedRows, pagedData, onRowSelect]);

  // 全选处理
  const handleSelectAll = useCallback(() => {
    if (!enableSelection || selectionMode === 'single') return;
    
    const newSelectedRows = new Set<number>();
    if (selectedRows.size < pagedData.length) {
      pagedData.forEach((_, index) => newSelectedRows.add(index));
    }
    
    setSelectedRows(newSelectedRows);
    
    const selectedData = Array.from(newSelectedRows).map(index => pagedData[index]).filter(Boolean);
    onRowSelect?.(selectedData);
  }, [enableSelection, selectionMode, selectedRows, pagedData, onRowSelect]);

  // 导出数据
  const handleExportData = useCallback(() => {
    onExportData?.(processedData);
  }, [processedData, onExportData]);

  // 渲染单元格内容
  const renderCellContent = useCallback((row: any, column: QueryTableColumn) => {
    const value = row?.[column.key];
    
    switch (column.render) {
      case 'link':
        return (
          <a 
            href={value} 
            className="text-blue-600 hover:underline" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {value}
          </a>
        );
      case 'image':
        return <img src={value} alt="" className="h-8 w-8 rounded object-cover" />;
      case 'badge':
        return <Badge variant="secondary">{value}</Badge>;
      case 'date':
        return new Date(value).toLocaleDateString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
      case 'currency':
        return `¥${Number(value || 0).toLocaleString()}`;
      default:
        return String(value ?? "");
    }
  }, []);

  // 分页器
  const renderPager = useCallback(() => {
    if (!showPager) return null;
    
    const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
    
    return (
      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            disabled={page <= 1 || loading} 
            onClick={() => setPage(1)}
          >
            首页
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            disabled={page <= 1 || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            上一页
          </Button>
        </div>
        
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          第 {page} 页 / 共 {totalPages} 页 (共 {processedData.length} 条)
        </span>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            下一页
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(totalPages)}
          >
            末页
          </Button>
        </div>
      </div>
    );
  }, [showPager, processedData.length, pageSize, page, loading]);

  // 检查是否全选
  const isAllSelected = enableSelection && selectionMode === 'multiple' && 
    pagedData.length > 0 && pagedData.every((_, index) => selectedRows.has(index));
  
  const isIndeterminate = enableSelection && selectionMode === 'multiple' && 
    selectedRows.size > 0 && !isAllSelected;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          {enableSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          )}
          
          {/* 查询构建器切换 */}
          {enableQueryBuilder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQueryBuilder(!showQueryBuilder)}
            >
              {showQueryBuilder ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showQueryBuilder ? '隐藏' : '显示'}查询构建器
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 导出按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={processedData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>
          
          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 查询构建器 */}
      {enableQueryBuilder && (
        <Collapsible open={showQueryBuilder} onOpenChange={setShowQueryBuilder}>
          <CollapsibleContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <QueryBuilder
                fields={autoFields}
                initialQuery={currentQuery}
                config={{
                  allowEmptyGroups: false,
                  showTextPreview: true,
                  showValidation: true,
                  enableScenarios: false,
                  autoExecute: true,
                  ...queryBuilderConfig
                }}
                events={{
                  onQueryChange: (query) => {
                    setCurrentQuery(query);
                    if (onQueryChange) {
                      onQueryChange(query);
                    }
                  },
                  onExecute: async (query) => {
                    const result = queryEngine.execute(data, query);
                    if (onQueryExecute) {
                      onQueryExecute(result);
                    }
                    return result;
                  }
                }}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 表格 */}
      <div className="w-full overflow-x-auto">
        <Table className={cn(
          size === "lg" && "table-size-lg",
          variant === "compact" && "table-compact"
        )}>
          <TableHeader>
            <TableRow>
              {/* 选择列 */}
              {enableSelection && (
                <TableHead className="w-12">
                  {selectionMode === "multiple" && (
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="全选"
                      className="mx-auto"
                      ref={(el) => {
                        if (el) {
                          (el as HTMLInputElement).indeterminate = isIndeterminate;
                        }
                      }}
                    />
                  )}
                </TableHead>
              )}
              
              {/* 序号列 */}
              {showRowNumber && (
                <TableHead className="w-16 text-center">序号</TableHead>
              )}
              
              {/* 数据列 */}
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right"
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (enableSelection ? 1 : 0) + (showRowNumber ? 1 : 0)} 
                  className="text-center py-8"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">加载中...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (enableSelection ? 1 : 0) + (showRowNumber ? 1 : 0)} 
                  className="text-center py-8"
                >
                  <div className="text-red-500">
                    <div className="font-medium">加载失败</div>
                    <div className="text-sm text-muted-foreground mt-1">{error}</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : pagedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (enableSelection ? 1 : 0) + (showRowNumber ? 1 : 0)} 
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    "cursor-pointer",
                    variant === "striped" && index % 2 === 1 && "bg-muted/30",
                    enableSelection && selectedRows.has(index) && "bg-blue-50 dark:bg-blue-950/30"
                  )}
                  onClick={() => {
                    onRowClick?.(row, index);
                  }}
                >
                  {/* 选择列 */}
                  {enableSelection && (
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedRows.has(index)}
                        onCheckedChange={() => handleRowSelect(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  
                  {/* 序号列 */}
                  {showRowNumber && (
                    <TableCell className="w-16 text-center text-muted-foreground">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                  )}
                  
                  {/* 数据列 */}
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key}
                      className={cn(
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right",
                        column.ellipsis && "truncate max-w-0"
                      )}
                      style={{ width: column.width }}
                    >
                      {renderCellContent(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页器 */}
      {renderPager()}
    </div>
  );
}
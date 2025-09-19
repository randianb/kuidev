import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LookupItem {
  id: string;
  [key: string]: any;
}

interface LookupSelectorProps {
  value?: LookupItem | LookupItem[];
  onChange?: (value: LookupItem | LookupItem[] | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
  dataSource?: LookupItem[];
  columns?: Array<{
    key: string;
    title: string;
    width?: string;
  }>;
  displayField?: string;
  searchFields?: string[];
  pageSize?: number;
}

export function LookupSelector({
  value,
  onChange,
  placeholder = "点击选择...",
  disabled = false,
  className,
  multiple = false,
  dataSource = [],
  columns = [
    { key: 'id', title: 'ID', width: '100px' },
    { key: 'name', title: '名称' },
    { key: 'description', title: '描述' }
  ],
  displayField = 'name',
  searchFields = ['name', 'description'],
  pageSize = 10
}: LookupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<LookupItem[]>(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });

  // 过滤数据
  const filteredData = dataSource.filter(item => {
    if (!searchText) return true;
    return searchFields.some(field => 
      String(item[field] || '').toLowerCase().includes(searchText.toLowerCase())
    );
  });

  // 分页数据
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 重置分页当搜索条件改变时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const handleSelect = (item: LookupItem) => {
    if (multiple) {
      const isSelected = selectedItems.some(selected => selected.id === item.id);
      let newSelection: LookupItem[];
      
      if (isSelected) {
        newSelection = selectedItems.filter(selected => selected.id !== item.id);
      } else {
        newSelection = [...selectedItems, item];
      }
      
      setSelectedItems(newSelection);
    } else {
      setSelectedItems([item]);
      onChange?.(item);
      setIsOpen(false);
    }
  };

  const handleConfirm = () => {
    if (multiple) {
      onChange?.(selectedItems.length > 0 ? selectedItems : undefined);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedItems([]);
    onChange?.(undefined);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) return value[0][displayField] || value[0].id;
      return `已选择 ${value.length} 项`;
    }
    
    return value[displayField] || value.id;
  };

  const isItemSelected = (item: LookupItem) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", className)}
          disabled={disabled}
        >
          <div className="flex-1 truncate">
            <span className={!value ? "text-muted-foreground" : ""}>
              {getDisplayText()}
            </span>
          </div>
          <Search className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>选择数据</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
              />
            </div>
            {multiple && (
              <Button variant="outline" onClick={handleClear}>
                清空选择
              </Button>
            )}
          </div>

          {/* 数据表格 */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {multiple && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelection = [...selectedItems];
                            paginatedData.forEach(item => {
                              if (!newSelection.some(s => s.id === item.id)) {
                                newSelection.push(item);
                              }
                            });
                            setSelectedItems(newSelection);
                          } else {
                            const pageIds = paginatedData.map(item => item.id);
                            setSelectedItems(selectedItems.filter(item => !pageIds.includes(item.id)));
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  {columns.map(column => (
                    <TableHead key={column.key} style={{ width: column.width }}>
                      {column.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length + (multiple ? 1 : 0)} 
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchText ? "未找到匹配的数据" : "暂无数据"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map(item => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        isItemSelected(item) && "bg-muted"
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      {multiple && (
                        <TableCell>
                          <Checkbox
                            checked={isItemSelected(item)}
                            onChange={() => {}} // 由行点击处理
                          />
                        </TableCell>
                      )}
                      {columns.map(column => (
                        <TableCell key={column.key}>
                          {String(item[column.key] || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {filteredData.length} 条记录，第 {currentPage} 页 / 共 {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {multiple && selectedItems.length > 0 && (
                <span>已选择 {selectedItems.length} 项</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                取消
              </Button>
              {multiple && (
                <Button onClick={handleConfirm}>
                  确定
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
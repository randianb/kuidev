import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Component } from "react";
import { createNode, createPage, NodeMeta, PageMeta, PageGroup, TemplateKind, CustomComponent, getPageRoots, setPageRoots, addPageRoot, removePageRoot } from "@/studio/types";
import { getPage, loadPages, upsertPage, upsertCustomComponent, loadCustomComponents, deleteCustomComponent as deleteCustomComponentFromStorage, loadPageGroups, savePageGroups, upsertPageGroup, deletePageGroup, getPageGroup } from "@/studio/storage";
import { getCachedPage, getCachedPages, upsertCachedPage, deleteCachedPage, initializePageCache, smartPreloadPages, reorderCachedPages } from "@/studio/page-cache";
import { NodeRenderer } from "@/studio/registry";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CommandK from "@/components/site/CommandK";
import { getHandlers } from "@/lib/handlers";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { bus, EVENT_TOPICS, NavigateToPageEvent } from "@/lib/eventBus";
import { eventHandlerManager } from "@/lib/event-handler-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { ChevronUp, ChevronDown, Edit, X, Copy, Code, FileText, Square, ExternalLink, List, ListTree, Hash } from "lucide-react";
import { PageTreeView } from "@/components/PageTreeView";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import Editor from "@monaco-editor/react";
import { generateUUID } from "@/lib/utils";
import { getSpacingClasses } from "@/studio/utils/spacing";
import { migratePageSpacing } from "@/studio/utils/migration";
import { scadaStencils, createScadaNode } from "@/studio/scada-catalog";

// JavaScript 代码格式化函数
function formatJavaScript(code: string): string {
  try {
    console.log('🔧 开始格式化代码:', code);
    console.log('🔧 代码长度:', code.length);
    
    // 直接处理转义字符，不使用复杂的 JSON 解析
    let unescapedCode = code
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
    
    console.log('🔧 处理转义字符后:', unescapedCode);
    console.log('🔧 处理后长度:', unescapedCode.length);
    
    // 简单的 JavaScript 格式化
    let indentLevel = 0;
    const lines = unescapedCode.split('\n');
    const formattedLines: string[] = [];
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        formattedLines.push('');
        continue;
      }
      
      // 减少缩进（对于结束括号）
      if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']') || trimmedLine.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // 添加缩进
      const indent = '  '.repeat(indentLevel);
      formattedLines.push(indent + trimmedLine);
      
      // 增加缩进（对于开始括号）
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[') || trimmedLine.endsWith('(')) {
        indentLevel++;
      }
    }
    
    const result = formattedLines.join('\n');
    console.log('🎯 格式化完成:', result);
    console.log('🎯 最终长度:', result.length);
    return result;
  } catch (error) {
    console.warn('格式化 JavaScript 代码时出错:', error);
    return code; // 如果格式化失败，返回原始代码
  }
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }>{
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error("ErrorBoundary caught", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 border bg-destructive/10 text-destructive rounded">
          组件渲染出现问题
        </div>
      );
    }
    return this.props.children;
  }
}

// 容器类型定义 - 可以包含子组件的组件类型
const containerTypes = ["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard", "NavigationControls", "NestedPageContainer"];

// 多根节点渲染组件
function MultiRootRenderer({ 
  page, 
  ctx 
}: { 
  page: PageMeta; 
  ctx: any; 
}) {
  const roots = getPageRoots(page);
  
  return (
    <div className="h-full flex flex-col space-y-4">
      {roots.map((root, index) => (
        <div key={root.id} className="relative flex-1 min-h-0">
          {roots.length > 1 && (
            <div className="absolute -top-2 -left-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              根节点 {index + 1}
            </div>
          )}
          <NodeRenderer node={root} ctx={ctx} />
        </div>
      ))}
    </div>
  );
}

function Canvas({
  page,
  setPage,
  select,
  setSelect,
  insertSibling,
  moveBeforeAfter,
  moveAsChild,
  onPanelSizeChange,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
}: {
  page: PageMeta;
  setPage: (p: PageMeta) => void;
  select: string | null;
  setSelect: (id: string | null) => void;
  insertSibling: (id: string, dir: "left" | "right" | "top" | "bottom") => void;
  moveBeforeAfter: (dragId: string, targetId: string, pos: "before" | "after") => void;
  moveAsChild: (dragId: string, parentId: string) => void;
  onPanelSizeChange?: (nodeId: string, sizes: number[]) => void;
  onCopy?: (nodeId: string) => void;
  onPaste?: (parentId: string) => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
}) {
  // 检测页面中是否有任何组件启用了removePadding
  const hasRemovePaddingComponent = useMemo(() => {
    const checkNode = (node: NodeMeta): boolean => {
      // 检查当前节点是否启用了removePadding
      if (node.props?.removePadding === true) {
        return true;
      }
      // 递归检查子节点
      return (node.children ?? []).some(child => checkNode(child));
    };
    return checkNode(page.root);
  }, [page.root]);
  const createChild = (parentId: string, type: string) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        // 支持Container和所有Card变体类型接受子组件
        if (!containerTypes.includes(n.type)) return true; // ignore non-container types
        const node = createNode(type as any);
        if (type === "Listener") node.props = { text: "监听器：已挂载" };
        n.children = [...(n.children ?? []), node];
        return true;
      }
      return (n.children ?? []).some((c) => walk(c));
    };
    const rootCopy = structuredClone(page.root) as NodeMeta;
    walk(rootCopy);
    setPage({ ...page, root: rootCopy, updatedAt: Date.now() });
  };

  const createCustomChild = (parentId: string, customComponent: CustomComponent) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        // 支持Container和所有Card变体类型接受子组件
        if (!containerTypes.includes(n.type)) return true; // ignore non-container types
        
        // 深拷贝自建组件的内容并添加到父容器
        const customNode = structuredClone(customComponent.component) as NodeMeta;
        n.children = [...(n.children ?? []), customNode];
        return true;
      }
      return (n.children ?? []).some((c) => walk(c));
    };
    const rootCopy = structuredClone(page.root) as NodeMeta;
    walk(rootCopy);
    setPage({ ...page, root: rootCopy, updatedAt: Date.now() });
  };
  const createScadaChild = (parentId: string, stencilKey: string) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        if (!containerTypes.includes(n.type)) return true;
        const scadaNode = createScadaNode(stencilKey);
        n.children = [...(n.children ?? []), scadaNode];
        return true;
      }
      return (n.children ?? []).some((c) => walk(c));
    };
    const rootCopy = structuredClone(page.root) as NodeMeta;
    walk(rootCopy);
    setPage({ ...page, root: rootCopy, updatedAt: Date.now() });
  };


  return (
    <div className="h-full overflow-hidden">
      <div className="h-full">
        <MultiRootRenderer
          page={page}
          ctx={{
            design: true,
            onSelect: setSelect,
            selectedId: select,
            insertSibling: (id: string, dir: any) => insertSibling(id, dir),
            moveBeforeAfter,
            moveAsChild,
            createChild,
            createCustomChild,
            createScadaChild,
            rootNode: page.root,
            onPanelSizeChange,
            onCopy,
            onPaste,
            onDelete,
            onDuplicate,
          }}
        />
      </div>
    </div>
  );
}

function SplitPreview({
  page,
  selectedId,
  commit,
  insertSibling,
  moveBeforeAfter,
  moveAsChild,
  setSelectedId,
  onPanelSizeChange,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
}: {
  page: PageMeta;
  selectedId: string | null;
  commit: (p: PageMeta) => void;
  insertSibling: (id: string, dir: "left" | "right" | "top" | "bottom") => void;
  moveBeforeAfter: (dragId: string, targetId: string, pos: "before" | "after") => void;
  moveAsChild: (dragId: string, parentId: string) => void;
  setSelectedId: (id: string | null) => void;
  onPanelSizeChange?: (nodeId: string, sizes: number[]) => void;
  onCopy?: (nodeId: string) => void;
  onPaste?: (parentId: string) => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
}) {
  // 检测页面中是否有任何组件启用了removePadding
  const hasRemovePaddingComponent = useMemo(() => {
    const checkNode = (node: NodeMeta): boolean => {
      // 检查当前节点是否启用了removePadding
      if (node.props?.removePadding === true) {
        return true;
      }
      // 递归检查子节点
      return (node.children ?? []).some(child => checkNode(child));
    };
    return checkNode(page.root);
  }, [page.root]);
  const width = "100%" as const;
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<{ title?: string; content?: any } | null>(null);
  
  const createChild = (parentId: string, type: string) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        // 支持Container和所有Card变体类型接受子组件
        if (!containerTypes.includes(n.type)) return true; // ignore non-container types
        const node = createNode(type as any);
        if (type === "Listener") node.props = { text: "监听器：已挂载" };
        n.children = [...(n.children ?? []), node];
        return true;
      }
      return (n.children ?? []).some((c) => walk(c));
    };
    const rootCopy = structuredClone(page.root) as NodeMeta;
    walk(rootCopy);
    commit({ ...page, root: rootCopy, updatedAt: Date.now() });
  };

  const createCustomChild = (parentId: string, customComponent: CustomComponent) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        // 支持Container和所有Card变体类型接受子组件
        if (!containerTypes.includes(n.type)) return true; // ignore non-container types
        
        // 深拷贝自建组件的内容并添加到父容器
        const customNode = structuredClone(customComponent.component) as NodeMeta;
        n.children = [...(n.children ?? []), customNode];
        return true;
      }
      return (n.children ?? []).some((c) => walk(c));
    };
    const rootCopy = structuredClone(page.root) as NodeMeta;
    walk(rootCopy);
    commit({ ...page, root: rootCopy, updatedAt: Date.now() });
  };
  
  const createScadaChild = (parentId: string, stencilKey: string) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        if (!containerTypes.includes(n.type)) return true;
        const scadaNode = createScadaNode(stencilKey);
        n.children = [...(n.children ?? []), scadaNode];
        return true;
      }
      return (n.children ?? []).some((c) => walk(c));
    };
    const rootCopy = structuredClone(page.root) as NodeMeta;
    walk(rootCopy);
    commit({ ...page, root: rootCopy, updatedAt: Date.now() });
  };

  useEffect(() => {
    const unsub = bus.subscribe("dialog.open", (payload: any) => {
      setDlg(payload || {});
      setOpen(true);
    });
    return () => unsub();
  }, []);
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={55} minSize={30}>
        <div className="h-full overflow-hidden">
          <div className="h-full w-full bg-background flex flex-col" style={{ width }}>
            <div className={`h-full overflow-y-auto overflow-x-hidden ${hasRemovePaddingComponent ? '' : 'p-2'}`}>
              <NodeRenderer
                node={page.root}
                ctx={{
                  design: true,
                  onSelect: setSelectedId,
                  selectedId: selectedId,
                  insertSibling: (id: string, dir: any) => insertSibling(id, dir),
                  moveBeforeAfter,
                  moveAsChild,
                  createChild,
                  createCustomChild,
                  createScadaChild,
                  rootNode: page.root,
                  onPanelSizeChange,
                  onCopy,
                  onPaste,
                  onDelete,
                  onDuplicate,
                }}
              />
            </div>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={45} minSize={30}>
        <div className="h-full overflow-hidden">
          <div className="mx-auto h-full w-full max-w-full rounded border bg-background shadow-sm flex flex-col" style={{ width, overflow: "hidden" }}>
            <div className={`border-b text-xs text-muted-foreground ${hasRemovePaddingComponent ? 'p-1' : 'p-2'}`}>预览</div>
            <div className="flex-1 overflow-auto">
              <MultiRootRenderer page={page} ctx={{ onPanelSizeChange }} />
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{dlg?.title ?? "提示"}</DialogTitle>
              </DialogHeader>
              <div>{String(dlg?.content ?? "")}</div>
            </DialogContent>
          </Dialog>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function CodeEditorDialog({ open, onOpenChange, value, onChange, title = "代码编辑器", language = "javascript", readOnly = false, onMount }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  title?: string | React.ReactNode;
  language?: string;
  readOnly?: boolean;
  onMount?: (editor: any) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="h-[60vh] border rounded">
          <Editor
            height="100%"
            defaultLanguage={language}
            value={value}
            onChange={(val) => onChange(val || "")}
            theme="vs-dark"
            onMount={onMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: readOnly,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 列管理组件
function ColumnManager({
  columns,
  onChange,
}: {
  columns: any[];
  onChange: (columns: any[]) => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addMode, setAddMode] = useState<'form' | 'json'>('form');
  const [multipleColumns, setMultipleColumns] = useState<any[]>([{
    key: '',
    title: '',
    width: undefined,
    align: 'left',
    render: 'text',
    sortable: false,
    ellipsis: false,
  }]);
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState('');

  const addNewColumnToList = () => {
    setMultipleColumns([...multipleColumns, {
      key: '',
      title: '',
      width: undefined,
      align: 'left',
      render: 'text',
      sortable: false,
      ellipsis: false,
    }]);
  };

  const removeColumnFromList = (index: number) => {
    if (multipleColumns.length > 1) {
      setMultipleColumns(multipleColumns.filter((_, i) => i !== index));
    }
  };

  const updateColumnInList = (index: number, updates: any) => {
    const newColumns = [...multipleColumns];
    newColumns[index] = { ...newColumns[index], ...updates };
    setMultipleColumns(newColumns);
  };

  const handleAddColumn = () => {
    if (addMode === 'form') {
      // 验证表单模式的列
      const validColumns = multipleColumns.filter(col => col.key && col.title);
      if (validColumns.length === 0) {
        return;
      }
      onChange([...columns, ...validColumns]);
    } else {
      // 验证JSON模式
      try {
        const parsed = JSON.parse(jsonValue);
        const newColumns = Array.isArray(parsed) ? parsed : [parsed];
        
        // 验证必需字段
        const validColumns = newColumns.filter(col => col.key && col.title);
        if (validColumns.length === 0) {
          setJsonError('至少需要一个包含 key 和 title 字段的有效列配置');
          return;
        }
        
        onChange([...columns, ...validColumns]);
        setJsonError('');
      } catch (error) {
        setJsonError('JSON格式错误，请检查语法');
        return;
      }
    }
    
    // 重置状态
    setShowAddDialog(false);
    setMultipleColumns([{
      key: '',
      title: '',
      width: undefined,
      align: 'left',
      render: 'text',
      sortable: false,
      ellipsis: false,
    }]);
    setJsonValue('');
    setJsonError('');
  };

  const deleteColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    onChange(newColumns);
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    onChange(newColumns);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">列配置</label>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="h-6 px-2">
            添加列
          </Button>
        </div>
        
        {columns.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded">
            暂无列配置，点击"添加列"开始配置
          </div>
        ) : (
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div key={`column-${column.key || column.title || index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{column.title}</span>
                    <span className="text-xs text-muted-foreground">({column.key})</span>
                    {column.sortable && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">可排序</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>宽度: {column.width || 'auto'}</span>
                    <span>对齐: {column.align}</span>
                    <span>类型: {column.render}</span>
                    {column.ellipsis && <span>省略显示</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => moveColumn(index, index - 1)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  )}
                  {index < columns.length - 1 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => moveColumn(index, index + 1)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteColumn(index)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加列弹框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加列</DialogTitle>
          </DialogHeader>
          
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'form' | 'json')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">表单模式</TabsTrigger>
              <TabsTrigger value="json">JSON模式</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">列配置 ({multipleColumns.length}个)</h4>
                <Button size="sm" onClick={addNewColumnToList}>
                  添加列
                </Button>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-4">
                {multipleColumns.map((column, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">列 {index + 1}</span>
                      {multipleColumns.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeColumnFromList(index)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">字段名 *</label>
                        <Input 
                          value={column.key} 
                          onChange={(e) => updateColumnInList(index, {key: e.target.value})}
                          placeholder="例如: name, age, email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">标题 *</label>
                        <Input 
                          value={column.title} 
                          onChange={(e) => updateColumnInList(index, {title: e.target.value})}
                          placeholder="例如: 姓名, 年龄, 邮箱"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">宽度</label>
                        <Input 
                          value={column.width || ''} 
                          onChange={(e) => updateColumnInList(index, {width: e.target.value || undefined})}
                          placeholder="例如: 120, 20%, auto"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">对齐方式</label>
                        <Select 
                          value={column.align} 
                          onValueChange={(v) => updateColumnInList(index, {align: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">左对齐</SelectItem>
                            <SelectItem value="center">居中</SelectItem>
                            <SelectItem value="right">右对齐</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">渲染类型</label>
                        <Select 
                          value={column.render} 
                          onValueChange={(v) => updateColumnInList(index, {render: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">文本</SelectItem>
                            <SelectItem value="link">链接</SelectItem>
                            <SelectItem value="image">图片</SelectItem>
                            <SelectItem value="badge">标签</SelectItem>
                            <SelectItem value="date">日期</SelectItem>
                            <SelectItem value="currency">货币</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={column.sortable}
                          onCheckedChange={(checked) => updateColumnInList(index, {sortable: checked})}
                        />
                        <label className="text-sm">可排序</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={column.ellipsis}
                          onCheckedChange={(checked) => updateColumnInList(index, {ellipsis: checked})}
                        />
                        <label className="text-sm">文本省略</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4">
              <div>
                <label className="text-sm font-medium">JSON配置</label>
                <p className="text-xs text-muted-foreground mb-2">
                  请输入列的JSON配置，必须包含 key 和 title 字段
                </p>
                <Editor
                  height="300px"
                  defaultLanguage="json"
                  value={jsonValue}
                  onChange={(value) => {
                    setJsonValue(value || '');
                    setJsonError('');
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
                {jsonError && (
                  <p className="text-sm text-red-500 mt-2">{jsonError}</p>
                )}
              </div>
              
              <div className="bg-muted p-3 rounded text-xs">
                <p className="font-medium mb-2">示例配置:</p>
                <pre className="text-muted-foreground">{`[
  {
    "key": "name",
    "title": "姓名",
    "width": "120px",
    "align": "left",
    "render": "text",
    "sortable": true,
    "ellipsis": false
  },
  {
    "key": "age",
    "title": "年龄",
    "width": "80px",
    "align": "center",
    "render": "text",
    "sortable": true,
    "ellipsis": false
  }
]`}</pre>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddColumn}>
              添加列
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
    </>
  );
}

// 可编辑表格列管理组件
function EditableColumnManager({
  columns,
  onChange,
}: {
  columns: any[];
  onChange: (columns: any[]) => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addMode, setAddMode] = useState<'form' | 'json'>('form');
  const [multipleColumns, setMultipleColumns] = useState<any[]>([{
    key: '',
    title: '',
    type: 'text',
    width: undefined,
    required: false,
    editable: true,
  }]);
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState('');

  const addNewColumnToList = () => {
    setMultipleColumns([...multipleColumns, {
      key: '',
      title: '',
      type: 'text',
      width: undefined,
      required: false,
      editable: true,
    }]);
  };

  const removeColumnFromList = (index: number) => {
    if (multipleColumns.length > 1) {
      setMultipleColumns(multipleColumns.filter((_, i) => i !== index));
    }
  };

  const updateColumnInList = (index: number, updates: any) => {
    const newColumns = [...multipleColumns];
    newColumns[index] = { ...newColumns[index], ...updates };
    setMultipleColumns(newColumns);
  };

  const handleAddColumn = () => {
    if (addMode === 'form') {
      // 验证表单模式的列
      const validColumns = multipleColumns.filter(col => col.key && col.title);
      if (validColumns.length === 0) {
        return;
      }
      onChange([...columns, ...validColumns]);
    } else {
      // 验证JSON模式
      try {
        const parsed = JSON.parse(jsonValue);
        const newColumns = Array.isArray(parsed) ? parsed : [parsed];
        
        // 验证必需字段
        const validColumns = newColumns.filter(col => col.key && col.title);
        if (validColumns.length === 0) {
          setJsonError('至少需要一个包含 key 和 title 字段的有效列配置');
          return;
        }
        
        onChange([...columns, ...validColumns]);
        setJsonError('');
      } catch (error) {
        setJsonError('JSON格式错误，请检查语法');
        return;
      }
    }
    
    // 重置状态
    setShowAddDialog(false);
    setMultipleColumns([{
      key: '',
      title: '',
      type: 'text',
      width: undefined,
      required: false,
      editable: true,
    }]);
    setJsonValue('');
    setJsonError('');
  };

  const deleteColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    onChange(newColumns);
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    onChange(newColumns);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">列配置</label>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="h-6 px-2">
            添加列
          </Button>
        </div>
        
        {columns.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded">
            暂无列配置，点击"添加列"开始配置
          </div>
        ) : (
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{column.title}</span>
                    <span className="text-xs text-muted-foreground">({column.key})</span>
                    {column.required && <span className="text-xs bg-red-100 text-red-700 px-1 rounded">必填</span>}
                    {!column.editable && <span className="text-xs bg-gray-100 text-gray-700 px-1 rounded">只读</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>宽度: {column.width || 'auto'}</span>
                    <span>类型: {column.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => moveColumn(index, index - 1)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  )}
                  {index < columns.length - 1 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => moveColumn(index, index + 1)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteColumn(index)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加列弹框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加可编辑列</DialogTitle>
          </DialogHeader>
          
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'form' | 'json')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">表单模式</TabsTrigger>
              <TabsTrigger value="json">JSON模式</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">列配置 ({multipleColumns.length}个)</h4>
                <Button size="sm" onClick={addNewColumnToList}>
                  添加列
                </Button>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-4">
                {multipleColumns.map((column, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">列 {index + 1}</span>
                      {multipleColumns.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeColumnFromList(index)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">字段名 *</label>
                        <Input 
                          value={column.key} 
                          onChange={(e) => updateColumnInList(index, {key: e.target.value})}
                          placeholder="例如: name, age, email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">标题 *</label>
                        <Input 
                          value={column.title} 
                          onChange={(e) => updateColumnInList(index, {title: e.target.value})}
                          placeholder="例如: 姓名, 年龄, 邮箱"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">数据类型</label>
                        <Select 
                          value={column.type} 
                          onValueChange={(v) => updateColumnInList(index, {type: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">文本</SelectItem>
                            <SelectItem value="number">数字</SelectItem>
                            <SelectItem value="richtext">富文本</SelectItem>
                            <SelectItem value="date">日期</SelectItem>
                            <SelectItem value="select">下拉选择</SelectItem>
                            <SelectItem value="multiselect">多选</SelectItem>
                            <SelectItem value="lookup">查找</SelectItem>
                            <SelectItem value="progress">进度条</SelectItem>
                            <SelectItem value="link">链接</SelectItem>
                            <SelectItem value="image">图片</SelectItem>
                            <SelectItem value="file">文件</SelectItem>
                            <SelectItem value="autonumber">自动编号</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">宽度</label>
                        <Input 
                          value={column.width || ''} 
                          onChange={(e) => updateColumnInList(index, {width: e.target.value || undefined})}
                          placeholder="例如: 120, 20%, auto"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={column.required}
                            onCheckedChange={(checked) => updateColumnInList(index, {required: checked})}
                          />
                          <label className="text-sm">必填</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={column.editable}
                            onCheckedChange={(checked) => updateColumnInList(index, {editable: checked})}
                          />
                          <label className="text-sm">可编辑</label>
                        </div>
                      </div>
                    </div>
                    
                    {(column.type === 'select' || column.type === 'multiselect') && (
                      <div>
                        <label className="text-sm font-medium">选项配置</label>
                        <Textarea 
                          value={column.options ? JSON.stringify(column.options, null, 2) : '[]'} 
                          onChange={(e) => {
                            try {
                              const options = JSON.parse(e.target.value || '[]');
                              updateColumnInList(index, {options});
                            } catch {}
                          }}
                          placeholder='[{"label": "选项1", "value": "value1"}, {"label": "选项2", "value": "value2"}]'
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4">
              <div>
                <label className="text-sm font-medium">JSON配置</label>
                <p className="text-xs text-muted-foreground mb-2">
                  请输入列的JSON配置，必须包含 key、title 和 type 字段
                </p>
                <Editor
                  height="300px"
                  defaultLanguage="json"
                  value={jsonValue}
                  onChange={(value) => {
                    setJsonValue(value || '');
                    setJsonError('');
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
                {jsonError && (
                  <p className="text-sm text-red-500 mt-2">{jsonError}</p>
                )}
              </div>
              
              <div className="bg-muted p-3 rounded text-xs">
                <p className="font-medium mb-2">示例配置:</p>
                <pre className="text-muted-foreground">{`[
  {
    "key": "name",
    "title": "姓名",
    "type": "text",
    "width": "120px",
    "required": true,
    "editable": true
  },
  {
    "key": "status",
    "title": "状态",
    "type": "select",
    "options": [
      {"label": "进行中", "value": "progress"},
      {"label": "已完成", "value": "completed"}
    ]
  }
]`}</pre>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddColumn}>
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 操作列管理组件
function ActionColumnManager({
  showActions,
  actions,
  onShowActionsChange,
  onActionsChange,
}: {
  showActions: boolean;
  actions: any[];
  onShowActionsChange: (show: boolean) => void;
  onActionsChange: (actions: any[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAction, setEditingAction] = useState<any>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addMode, setAddMode] = useState<'form' | 'json'>('form');
  const [newAction, setNewAction] = useState<any>({
    text: '',
    icon: '',
    variant: 'ghost',
    handler: ''
  });
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState('');
  
  // 代码编辑器状态
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [editingCode, setEditingCode] = useState('');
  const [editingField, setEditingField] = useState('');

  const addAction = () => {
    setShowAddDialog(true);
    setAddMode('form');
    setNewAction({
      text: '操作',
      icon: '',
      variant: 'ghost',
      handler: 'log',
      script: 'console.log("操作按钮被点击了！", payload.row, payload.action);'
    });
    setJsonValue(JSON.stringify({
      text: '操作',
      icon: '',
      variant: 'ghost',
      handler: 'console.log("操作按钮被点击了！", payload.row, payload.action);'
    }, null, 2));
    setJsonError('');
  };

  const handleAddAction = () => {
    if (addMode === 'form') {
      if (!newAction.text) {
        return;
      }
      onActionsChange([...actions, newAction]);
    } else {
      try {
        const parsedAction = JSON.parse(jsonValue);
        if (!parsedAction.text) {
          setJsonError('操作配置必须包含 text 字段');
          return;
        }
        onActionsChange([...actions, parsedAction]);
      } catch (error) {
        setJsonError('JSON 格式错误: ' + (error as Error).message);
        return;
      }
    }
    setShowAddDialog(false);
  };

  const deleteAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    onActionsChange(newActions);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingAction({ ...actions[index] });
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      const newActions = [...actions];
      newActions[editingIndex] = editingAction;
      onActionsChange(newActions);
      setEditingIndex(null);
      setEditingAction({});
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingAction({});
  };

  const moveAction = (fromIndex: number, toIndex: number) => {
    const newActions = [...actions];
    const [movedAction] = newActions.splice(fromIndex, 1);
    newActions.splice(toIndex, 0, movedAction);
    onActionsChange(newActions);
  };

  const saveCode = () => {
    const [fieldType, indexStr] = editingField.split('-');
    if (fieldType === 'action' && indexStr) {
      const index = parseInt(indexStr);
      if (editingIndex === index) {
        // 编辑模式下保存到editingAction
        setEditingAction({...editingAction, script: editingCode});
      } else {
        // 非编辑模式下直接保存到actions
        const newActions = [...actions];
        newActions[index] = {...newActions[index], script: editingCode};
        onActionsChange(newActions);
      }
    }
    setCodeEditorOpen(false);
    setEditingField('');
    setEditingCode('');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs">操作列配置</label>
        <div className="flex items-center gap-2">
          <Switch 
            id="showActions" 
            checked={showActions} 
            onCheckedChange={onShowActionsChange} 
          />
          <label htmlFor="showActions" className="text-xs">显示操作列</label>
        </div>
      </div>
      
      {showActions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">操作按钮</label>
            <Button size="sm" onClick={addAction} className="h-6 px-2">
              添加操作
            </Button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {actions.map((action, index) => (
              <div key={`action-${action.text || action.handler || index}`} className="border rounded p-2 space-y-2">
                {editingIndex === index ? (
                  // 编辑模式
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs">按钮文字</label>
                        <Input 
                          value={editingAction.text || ''} 
                          onChange={(e) => setEditingAction({...editingAction, text: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs">图标</label>
                        <Input 
                          value={editingAction.icon || ''} 
                          onChange={(e) => setEditingAction({...editingAction, icon: e.target.value})}
                          placeholder="edit, delete, view"
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs">按钮样式</label>
                        <Select 
                          value={editingAction.variant || 'ghost'} 
                          onValueChange={(v) => setEditingAction({...editingAction, variant: v})}
                        >
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">默认</SelectItem>
                            <SelectItem value="secondary">次要</SelectItem>
                            <SelectItem value="outline">轮廓</SelectItem>
                            <SelectItem value="ghost">幽灵</SelectItem>
                            <SelectItem value="destructive">危险</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs">事件处理器</label>
                        <div className="space-y-1">
                          <Input 
                            value={editingAction.handler || ''} 
                            onChange={(e) => setEditingAction({...editingAction, handler: e.target.value})}
                            placeholder="handleEdit"
                            className="h-6 text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCode(editingAction.script || "// 编写操作处理脚本\n// 可用变量: payload (包含 row 和 action 数据)\n\nconsole.log('操作被点击:', payload);");
                                setEditingField(`action-${editingIndex}`);
                                setCodeEditorOpen(true);
                              }}
                              className="h-5 px-2 text-xs"
                            >
                              编辑脚本
                            </Button>
                          </div>
                          <div 
                            className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 min-h-[40px] border cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
                            onMouseDown={() => {
                              setEditingCode(editingAction.script || "// 编写操作处理脚本\n// 可用变量: payload (包含 row 和 action 数据)\n\nconsole.log('操作被点击:', payload);");
                              setEditingField(`action-${editingIndex}`);
                              setCodeEditorOpen(true);
                            }}
                            title="点击编辑脚本"
                          >
                            {editingAction.script ? (
                              <div className="whitespace-pre-wrap">{editingAction.script.length > 60 ? editingAction.script.substring(0, 60) + '...' : editingAction.script}</div>
                            ) : (
                              <div className="text-gray-400">点击此处编写JavaScript代码</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button size="sm" onClick={saveEdit} className="h-6 px-2">保存</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-6 px-2">取消</Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-medium">{action.text}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.variant || 'ghost'}
                          {action.icon && ` • ${action.icon}`}
                          {action.handler && ` • ${action.handler}`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {index > 0 && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => moveAction(index, index - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                        )}
                        {index < actions.length - 1 && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => moveAction(index, index + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEdit(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deleteAction(index)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 脚本显示区域 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-muted-foreground">事件脚本:</label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCode(action.script || "// 编写操作处理脚本\n// 可用变量: payload (包含 row 和 action 数据)\n\nconsole.log('操作被点击:', payload);");
                            setEditingField(`action-${index}`);
                            setCodeEditorOpen(true);
                          }}
                          className="h-4 px-1 text-xs"
                        >
                          编辑脚本
                        </Button>
                      </div>
                      <div 
                        className="p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 min-h-[40px] border cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        onMouseDown={() => {
                          setEditingCode(action.script || "// 编写操作处理脚本\n// 可用变量: payload (包含 row 和 action 数据)\n\nconsole.log('操作被点击:', payload);");
                          setEditingField(`action-${index}`);
                          setCodeEditorOpen(true);
                        }}
                        title="点击编辑脚本"
                      >
                        {action.script ? (
                          <div className="whitespace-pre-wrap">{action.script.length > 60 ? action.script.substring(0, 60) + '...' : action.script}</div>
                        ) : (
                          <div className="text-gray-400">点击此处编写JavaScript代码</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {actions.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded">
                暂无操作按钮，点击"添加操作"开始配置
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 添加操作弹框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加操作</DialogTitle>
          </DialogHeader>
          
          <Tabs value={addMode} onValueChange={(value: "form" | "json") => setAddMode(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">表单模式</TabsTrigger>
              <TabsTrigger value="json">JSON模式</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">操作名称</label>
                  <Input
                    value={newAction.label || ''}
                    onChange={(e) => setNewAction({...newAction, label: e.target.value})}
                    placeholder="请输入操作名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">操作类型</label>
                  <Select value={newAction.type || ''} onValueChange={(value) => setNewAction({...newAction, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择操作类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="button">按钮</SelectItem>
                      <SelectItem value="link">链接</SelectItem>
                      <SelectItem value="dropdown">下拉菜单</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">操作颜色</label>
                  <Select value={newAction.variant || ''} onValueChange={(value) => setNewAction({...newAction, variant: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择颜色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">默认</SelectItem>
                      <SelectItem value="destructive">危险</SelectItem>
                      <SelectItem value="outline">轮廓</SelectItem>
                      <SelectItem value="secondary">次要</SelectItem>
                      <SelectItem value="ghost">幽灵</SelectItem>
                      <SelectItem value="link">链接</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4">
              <div>
                <label className="text-sm font-medium">JSON配置</label>
                <div className="mt-2">
                  <Editor
                    height="300px"
                    defaultLanguage="json"
                    value={jsonValue}
                    onChange={(value) => {
                      setJsonValue(value || '');
                      try {
                        JSON.parse(value || '{}');
                        setJsonError('');
                      } catch (e) {
                        setJsonError('JSON格式错误: ' + (e as Error).message);
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollbar: {
                        vertical: 'visible',
                        horizontal: 'visible'
                      }
                    }}
                  />
                </div>
                {jsonError && (
                  <div className="text-sm text-red-500 mt-2">
                    {jsonError}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                   示例: {'{"label": "编辑", "type": "button", "variant": "default"}'}
                 </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddAction}>
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 代码编辑器 */}
      <CodeEditorDialog
        open={codeEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            // 关闭时自动保存
            saveCode();
          } else {
            setCodeEditorOpen(open);
          }
        }}
        value={editingCode}
        onChange={setEditingCode}
        title="操作脚本编辑器"
      />
    </div>
  );
}

function EventsPanel({
  selected,
  update,
}: {
  selected: NodeMeta | null;
  update: (node: NodeMeta) => void;
}) {
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [editingCode, setEditingCode] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showExampleCode, setShowExampleCode] = useState<{[key: string]: boolean}>({});
  
  const handlers = Object.keys(getHandlers());

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以添加一个toast提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };
  
  // 获取事件类型的中文标签
  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      click: "点击",
      hover: "悬停",
      keydown: "按键",
      change: "值变化",
      rowClick: "行点击",
      rowSelect: "行选择",
      rowDoubleClick: "行双击",
      cellClick: "单元格点击",
      headerClick: "表头点击",
      sortChange: "排序变化",
      pageChange: "分页变化",
      selectionChange: "选择变化",
      rowHover: "行悬停",
      actionClick: "操作按钮点击"
    };
    return labels[type] || type;
  };
  
  // 获取事件描述
  const getEventDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      rowClick: "当用户点击表格行时触发",
      rowSelect: "当用户选择/取消选择行时触发",
      rowDoubleClick: "当用户双击表格行时触发",
      cellClick: "当用户点击单元格时触发",
      headerClick: "当用户点击表头时触发",
      sortChange: "当表格排序发生变化时触发",
      pageChange: "当分页发生变化时触发",
      selectionChange: "当选择的行发生变化时触发",
      rowHover: "当鼠标悬停在行上时触发",
      actionClick: "当点击操作列按钮时触发"
    };
    return descriptions[type] || "";
  };
  
  // 保存代码编辑器中的脚本
  const saveCode = () => {
    if (!selected || !editingField) return;
    
    const events = selected.props?.events || [];
    const [fieldType, eventIndexStr] = editingField.split('-');
    const eventIndex = parseInt(eventIndexStr);
    
    if (eventIndex >= 0 && eventIndex < events.length) {
      const next = [...events];
      
      if (fieldType === 'script' || fieldType === 'event') {
        // 事件处理脚本编辑
        next[eventIndex] = { ...next[eventIndex], script: editingCode };
      } else {
        // 处理器参数字段编辑
        const handlerParams = next[eventIndex].handlerParams || {};
        next[eventIndex] = { 
          ...next[eventIndex], 
          handlerParams: { ...handlerParams, [fieldType]: editingCode } 
        };
      }
      
      update({
        ...selected,
        props: { ...selected.props, events: next }
      });
    }
    
    setCodeEditorOpen(false);
    setEditingField(null);
    setEditingCode("");
  };

  // 渲染表格事件的特殊参数配置
  const renderTableEventParams = (ev: any, idx: number, events: any[], set: (k: string, v: any) => void) => {
    const updateEventParam = (paramKey: string, value: any) => {
      const next = [...events];
      const params = next[idx].params || {};
      next[idx] = { ...next[idx], params: { ...params, [paramKey]: value } };
      set("events", next);
    };
    
    const params = ev.params || {};
    
    switch (ev.type) {
      case "rowClick":
      case "rowDoubleClick":
      case "rowHover":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递行数据</label>
              <Switch 
                checked={params.includeRowData !== false}
                onCheckedChange={(checked) => updateEventParam("includeRowData", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递行索引</label>
              <Switch 
                checked={params.includeRowIndex !== false}
                onCheckedChange={(checked) => updateEventParam("includeRowIndex", checked)}
              />
            </div>
          </div>
        );
      
      case "cellClick":
        return (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递单元格值</label>
              <Switch 
                checked={params.includeCellValue !== false}
                onCheckedChange={(checked) => updateEventParam("includeCellValue", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递列信息</label>
              <Switch 
                checked={params.includeColumnInfo !== false}
                onCheckedChange={(checked) => updateEventParam("includeColumnInfo", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递行数据</label>
              <Switch 
                checked={params.includeRowData !== false}
                onCheckedChange={(checked) => updateEventParam("includeRowData", checked)}
              />
            </div>
          </div>
        );
      
      case "headerClick":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递列信息</label>
              <Switch 
                checked={params.includeColumnInfo !== false}
                onCheckedChange={(checked) => updateEventParam("includeColumnInfo", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">触发排序</label>
              <Switch 
                checked={params.triggerSort === true}
                onCheckedChange={(checked) => updateEventParam("triggerSort", checked)}
              />
            </div>
          </div>
        );
      
      case "sortChange":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递排序字段</label>
              <Switch 
                checked={params.includeSortField !== false}
                onCheckedChange={(checked) => updateEventParam("includeSortField", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递排序方向</label>
              <Switch 
                checked={params.includeSortDirection !== false}
                onCheckedChange={(checked) => updateEventParam("includeSortDirection", checked)}
              />
            </div>
          </div>
        );
      
      case "pageChange":
        return (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递页码</label>
              <Switch 
                checked={params.includePageNumber !== false}
                onCheckedChange={(checked) => updateEventParam("includePageNumber", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递页大小</label>
              <Switch 
                checked={params.includePageSize !== false}
                onCheckedChange={(checked) => updateEventParam("includePageSize", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递总数</label>
              <Switch 
                checked={params.includeTotal === true}
                onCheckedChange={(checked) => updateEventParam("includeTotal", checked)}
              />
            </div>
          </div>
        );
      
      case "selectionChange":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递选中行</label>
              <Switch 
                checked={params.includeSelectedRows !== false}
                onCheckedChange={(checked) => updateEventParam("includeSelectedRows", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递选中键</label>
              <Switch 
                checked={params.includeSelectedKeys === true}
                onCheckedChange={(checked) => updateEventParam("includeSelectedKeys", checked)}
              />
            </div>
          </div>
        );
      
      case "actionClick":
        return (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">传递操作类型</label>
              <Switch 
                checked={params.includeActionType !== false}
                onCheckedChange={(checked) => updateEventParam("includeActionType", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递行数据</label>
              <Switch 
                checked={params.includeRowData !== false}
                onCheckedChange={(checked) => updateEventParam("includeRowData", checked)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">传递按钮配置</label>
              <Switch 
                checked={params.includeButtonConfig === true}
                onCheckedChange={(checked) => updateEventParam("includeButtonConfig", checked)}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  const eventTypesByComp: Record<string, string[]> = {
    Button: ["click", "hover", "keydown"],
    Input: ["change", "keydown"],
    Table: ["rowClick", "rowSelect", "rowDoubleClick", "cellClick", "headerClick", "sortChange", "pageChange", "selectionChange", "rowHover", "actionClick"],
    default: ["click", "hover"],
  };

  // 监听代码编辑器打开事件（Hooks 必须在所有条件返回之前）
  useEffect(() => {
    const unsubscribe = bus.subscribe('codeEditor.open', (payload: any) => {
      const { field = 'handler', currentValue = '' } = payload;
      setEditingField(field);
      setEditingCode(currentValue);
      setCodeEditorOpen(true);
    });

    return unsubscribe;
  }, []);

  if (!selected) return <div className="p-4 text-sm text-muted-foreground">选择一个组件以编辑事件</div>;

  const set = (k: string, v: any) => {
    const copy = { ...selected, props: { ...(selected.props ?? {}), [k]: v } } as NodeMeta;
    update(copy);
  };

  const events: any[] = Array.isArray(selected.props?.events) ? selected.props!.events : [];

  const openCodeEditor = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditingCode(currentValue);
    setCodeEditorOpen(true);
  };

  



  return (
    <div className="space-y-3 p-4">
      {selected.type === "Button" && (
        <div className="grid gap-2">
          <label className="text-xs">点击发布事件（pubsub）</label>
          <div className="flex gap-2">
            <Input 
              placeholder="event.name" 
              value={selected.props?.publish ?? ""} 
              onChange={(e) => set("publish", e.target.value)} 
              className="flex-1"
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => openCodeEditor("publish", selected.props?.publish ?? "")}
            >
              编辑代码
            </Button>
          </div>
        </div>
      )}

      <Separator />
      <div className="space-y-2">
        <div className="text-xs">事件订阅</div>
        {(events || []).map((ev, idx) => (
          <div key={idx} className="border rounded p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">事件类型</label>
                <Select
                  value={ev.type}
                  onValueChange={(v) => {
                    const next = [...events];
                    next[idx] = { ...ev, type: v };
                    set("events", next);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择事件类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {(eventTypesByComp[selected.type] || eventTypesByComp.default).map((t) => (
                      <SelectItem key={t} value={t}>
                        {getEventTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">处理器</label>
                  {ev.handler && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const key = `${idx}-example`;
                        setShowExampleCode(prev => ({
                          ...prev,
                          [key]: !prev[key]
                        }));
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      <Code className="w-3 h-3 mr-1" />
                      示例
                    </Button>
                  )}
                </div>
                <Select
                  value={ev.handler}
                  onValueChange={(v) => {
                    const next = [...events];
                    next[idx] = { ...ev, handler: v };
                    set("events", next);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择处理器" />
                  </SelectTrigger>
                  <SelectContent>
                    {handlers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 示例代码显示 */}
                {ev.handler && showExampleCode[`${idx}-example`] && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">示例代码</div>
                    {(() => {
                       // 合并用户配置的参数
                       const customParams = {
                         code: ev.handlerParams?.code || selected.props?.code || 'baseCard',
                         ...(ev.handlerParams || {})
                       };
                       const exampleCode = eventHandlerManager.generateExampleCode(ev.handler, customParams);
                      return (
                        <div className="space-y-2">
                          {/* JavaScript 示例 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">JavaScript 调用</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(exampleCode.javascript)}
                                className="h-5 px-1"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="p-2 bg-gray-50 rounded text-xs font-mono border">
                              <pre className="whitespace-pre-wrap">{exampleCode.javascript}</pre>
                            </div>
                          </div>
                          
                          {/* cURL 示例 (仅对 resolvefetch 显示) */}
                          {ev.handler === 'resolvefetch' && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">cURL 调用</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(exampleCode.curl)}
                                  className="h-5 px-1"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="p-2 bg-gray-50 rounded text-xs font-mono border">
                                <pre className="whitespace-pre-wrap">{exampleCode.curl}</pre>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            {exampleCode.description}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            {/* 表格事件的特殊参数配置 */}
            {selected.type === "Table" && renderTableEventParams(ev, idx, events, set)}
            
            {/* resolvefetch 处理器的参数配置 */}
            {ev.handler === 'resolvefetch' && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">处理器参数</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">获取实际表单数据</label>
                    <Switch 
                      checked={ev.handlerParams?.getFormData === true}
                      onCheckedChange={(checked) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, getFormData: checked } 
                        };
                        set("events", next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">发送表单数据</label>
                    <Switch 
                      checked={ev.handlerParams?.sendFormData === true}
                      onCheckedChange={(checked) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, sendFormData: checked } 
                        };
                        set("events", next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">直接返回表单数据</label>
                    <Switch 
                      checked={ev.handlerParams?.returnFormData === true}
                      onCheckedChange={(checked) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, returnFormData: checked } 
                        };
                        set("events", next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">数据类型</label>
                    <Select
                      value={ev.handlerParams?.type || 'form'}
                      onValueChange={(value) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, type: value } 
                        };
                        set("events", next);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form">form</SelectItem>
                        <SelectItem value="data">data</SelectItem>
                        <SelectItem value="config">config</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">代码/ID</label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingField(`code-${idx}`);
                          setEditingCode(ev.handlerParams?.code || '');
                          setCodeEditorOpen(true);
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <Code className="w-3 h-3 mr-1" />
                        编辑代码
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                      {ev.handlerParams?.code || '点击"编辑代码"按钮设置代码'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">数据ID (可选)</label>
                    <Input
                      placeholder="例如: item-123"
                      value={ev.handlerParams?.id || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, id: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* openDialog 处理器的参数配置 */}
            {ev.handler === 'openDialog' && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">对话框参数</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">标题</label>
                    <Input
                      placeholder="对话框标题"
                      value={ev.handlerParams?.title || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, title: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">类型</label>
                    <Select
                      value={ev.handlerParams?.type || 'info'}
                      onValueChange={(value) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, type: value } 
                        };
                        set("events", next);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">信息</SelectItem>
                        <SelectItem value="success">成功</SelectItem>
                        <SelectItem value="warning">警告</SelectItem>
                        <SelectItem value="error">错误</SelectItem>
                        <SelectItem value="confirm">确认</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">大小</label>
                    <Select
                      value={ev.handlerParams?.size || 'medium'}
                      onValueChange={(value) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, size: value } 
                        };
                        set("events", next);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">小</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="large">大</SelectItem>
                        <SelectItem value="fullscreen">全屏</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">图标</label>
                    <Input
                      placeholder="图标名称"
                      value={ev.handlerParams?.icon || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, icon: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">内容类型</label>
                  <Select
                    value={ev.handlerParams?.contentType || 'text'}
                    onValueChange={(value) => {
                      const next = [...events];
                      const handlerParams = next[idx].handlerParams || {};
                      next[idx] = { 
                        ...next[idx], 
                        handlerParams: { ...handlerParams, contentType: value } 
                      };
                      set("events", next);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">文本内容</SelectItem>
                      <SelectItem value="page">页面内容</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ev.handlerParams?.contentType === 'page' ? (
                  <div>
                    <label className="text-xs text-muted-foreground">选择页面</label>
                    <Select
                      value={ev.handlerParams?.pageId || ''}
                      onValueChange={(value) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        const pages = loadPages();
                        const selectedPage = pages.find(p => p.id === value);
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { 
                            ...handlerParams, 
                            pageId: value,
                            pageName: selectedPage?.name || ''
                          } 
                        };
                        set("events", next);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="选择要显示的页面" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadPages().map((page) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-muted-foreground">内容</label>
                    <div className="border rounded-md p-2 bg-muted/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingField(`content-${idx}`);
                          setEditingCode(ev.handlerParams?.content || '');
                          setCodeEditorOpen(true);
                        }}
                        className="w-full mb-2"
                      >
                        编辑内容
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {ev.handlerParams?.content ? 
                          ev.handlerParams.content.substring(0, 50) + (ev.handlerParams.content.length > 50 ? '...' : '') : 
                          '点击编辑内容'
                        }
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">显示关闭按钮</label>
                    <Switch 
                      checked={ev.handlerParams?.showCloseButton !== false}
                      onCheckedChange={(checked) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, showCloseButton: checked } 
                        };
                        set("events", next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">背景遮罩</label>
                    <Switch 
                      checked={ev.handlerParams?.backdrop !== false}
                      onCheckedChange={(checked) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, backdrop: checked } 
                        };
                        set("events", next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">键盘ESC关闭</label>
                    <Switch 
                      checked={ev.handlerParams?.keyboard !== false}
                      onCheckedChange={(checked) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, keyboard: checked } 
                        };
                        set("events", next);
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">确认按钮文本</label>
                    <Input
                      placeholder="确定"
                      value={ev.handlerParams?.confirmText || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, confirmText: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">取消按钮文本</label>
                    <Input
                      placeholder="取消"
                      value={ev.handlerParams?.cancelText || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, cancelText: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">自动关闭时间(毫秒)</label>
                    <Input
                      type="number"
                      placeholder="0 = 不自动关闭"
                      value={ev.handlerParams?.autoClose || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, autoClose: value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">自定义CSS类名</label>
                    <Input
                      placeholder="custom-dialog-class"
                      value={ev.handlerParams?.className || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, className: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">确认回调脚本</label>
                    <Textarea
                      placeholder="确认按钮点击时执行的JavaScript代码"
                      value={ev.handlerParams?.onConfirm || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, onConfirm: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="min-h-[40px] resize-none font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">取消回调脚本</label>
                    <Textarea
                      placeholder="取消按钮点击时执行的JavaScript代码"
                      value={ev.handlerParams?.onCancel || ''}
                      onChange={(e) => {
                        const next = [...events];
                        const handlerParams = next[idx].handlerParams || {};
                        next[idx] = { 
                          ...next[idx], 
                          handlerParams: { ...handlerParams, onCancel: e.target.value } 
                        };
                        set("events", next);
                      }}
                      className="min-h-[40px] resize-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 导航处理器参数配置 */}
            {ev.handler === 'navigate' && (
              <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                <div className="text-sm font-medium text-gray-700">导航参数配置</div>
                
                {/* 导航类型选择 */}
                <div>
                  <label className="text-xs text-muted-foreground">导航类型</label>
                  <Select
                    value={ev.handlerParams?.type || 'internal'}
                    onValueChange={(value) => {
                      const next = [...events];
                      const handlerParams = next[idx].handlerParams || {};
                      next[idx] = { 
                        ...next[idx], 
                        handlerParams: { ...handlerParams, type: value } 
                      };
                      set("events", next);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="选择导航类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">内部页面导航</SelectItem>
                      <SelectItem value="external">外部URL导航</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 内部页面导航配置 */}
                {ev.handlerParams?.type !== 'external' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">页面ID</label>
                      <Input
                        placeholder="page-id"
                        value={ev.handlerParams?.pageId || ''}
                        onChange={(e) => {
                          const next = [...events];
                          const handlerParams = next[idx].handlerParams || {};
                          next[idx] = { 
                            ...next[idx], 
                            handlerParams: { ...handlerParams, pageId: e.target.value } 
                          };
                          set("events", next);
                        }}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">页面名称</label>
                      <Input
                        placeholder="页面名称"
                        value={ev.handlerParams?.pageName || ''}
                        onChange={(e) => {
                          const next = [...events];
                          const handlerParams = next[idx].handlerParams || {};
                          next[idx] = { 
                            ...next[idx], 
                            handlerParams: { ...handlerParams, pageName: e.target.value } 
                          };
                          set("events", next);
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                {/* 外部URL导航配置 */}
                {ev.handlerParams?.type === 'external' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">目标URL</label>
                      <Input
                        placeholder="https://example.com"
                        value={ev.handlerParams?.url || ''}
                        onChange={(e) => {
                          const next = [...events];
                          const handlerParams = next[idx].handlerParams || {};
                          next[idx] = { 
                            ...next[idx], 
                            handlerParams: { ...handlerParams, url: e.target.value } 
                          };
                          set("events", next);
                        }}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">打开方式</label>
                      <Select
                        value={ev.handlerParams?.target || '_self'}
                        onValueChange={(value) => {
                          const next = [...events];
                          const handlerParams = next[idx].handlerParams || {};
                          next[idx] = { 
                            ...next[idx], 
                            handlerParams: { ...handlerParams, target: value } 
                          };
                          set("events", next);
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="选择打开方式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_self">当前窗口</SelectItem>
                          <SelectItem value="_blank">新窗口</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* 替换历史记录选项 */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={ev.handlerParams?.replace || false}
                    onCheckedChange={(checked) => {
                      const next = [...events];
                      const handlerParams = next[idx].handlerParams || {};
                      next[idx] = { 
                        ...next[idx], 
                        handlerParams: { ...handlerParams, replace: checked } 
                      };
                      set("events", next);
                    }}
                  />
                  <label className="text-xs text-muted-foreground">替换当前历史记录</label>
                </div>
              </div>
            )}
            
            {/* 事件处理脚本配置 */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">事件处理脚本</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCode(ev.script || "// 编写事件处理脚本\n// 可用变量: event (事件数据), node (当前节点), ctx (上下文)\n\nconsole.log('事件触发:', event);");
                    setEditingField(`event-${idx}`);
                    setCodeEditorOpen(true);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  编辑脚本
                </Button>
              </div>
              <div 
                className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 min-h-[60px] border cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
                onMouseDown={() => {
                  setEditingCode(ev.script || "// 编写事件处理脚本\n// 可用变量: payload (事件数据)\n\nconsole.log('事件触发:', payload);");
                  setEditingField(`event-${idx}`);
                  setCodeEditorOpen(true);
                }}
                title="点击编辑脚本"
              >
                {ev.script ? (
                  <div className="whitespace-pre-wrap">{ev.script.length > 100 ? ev.script.substring(0, 100) + '...' : ev.script}</div>
                ) : (
                  <div className="text-gray-400">点击此处编写JavaScript代码</div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {getEventDescription(ev.type)}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = events.filter((_, i) => i !== idx);
                  set("events", next);
                }}
                className="h-6 w-6 p-0 text-red-500"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => set("events", [...events, { type: (eventTypesByComp[selected.type] || eventTypesByComp.default)[0], handler: handlers[0] }])}
          >
            添加事件订阅
          </Button>
        </div>
      </div>

      <CodeEditorDialog
        open={codeEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            // 关闭时自动保存
            if (editingField && editingCode !== (selected?.props?.events?.[parseInt(editingField.split('-')[1])]?.script || "")) {
              saveCode();
            } else {
              setCodeEditorOpen(false);
              setEditingField(null);
              setEditingCode("");
            }
          }
        }}
        value={editingCode}
        onChange={setEditingCode}
        title={`编辑事件处理脚本`}
      />
    </div>
  );
}

function Inspector({
  selected,
  update,
  onCopy,
  onPaste,
  addChild,
  parentId,
  containers,
  moveTo,
  autoClassHint,
  onSaveComponent,
  page,
  updatePage,
}: {
  selected: NodeMeta | null;
  update: (node: NodeMeta) => void;
  onCopy: (n: NodeMeta) => void;
  onPaste: () => void;
  addChild: (n: NodeMeta, layout: "row" | "col") => void;
  parentId: string | null;
  containers: { id: string; label: string }[];
  moveTo: (containerId: string) => void;
  autoClassHint: string | null;
  onSaveComponent: () => void;
  page: PageMeta;
  updatePage: (page: PageMeta) => void;
}) {
  // 如果没有选中组件，显示页面属性编辑
  if (!selected) {
    return (
      <div className="space-y-3 p-4">
        <div className="font-medium text-sm">页面属性</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">页面名称</label>
            <Input
              value={page.name}
              onChange={(e) => updatePage({ ...page, name: e.target.value })}
              placeholder="输入页面名称"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">页面描述</label>
            <Textarea
              value={page.description || ''}
              onChange={(e) => updatePage({ ...page, description: e.target.value })}
              placeholder="输入页面描述"
              className="min-h-[60px] resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">页面类型</label>
            <Select
              value={page.template}
              onValueChange={(value) => updatePage({ ...page, template: value as TemplateKind })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">空白页面</SelectItem>
                <SelectItem value="content">内容页面</SelectItem>
                <SelectItem value="vscode">VSCode风格</SelectItem>
                <SelectItem value="landing">落地页</SelectItem>
                <SelectItem value="email">邮件模板</SelectItem>
                <SelectItem value="home">首页</SelectItem>
                <SelectItem value="admin">管理后台</SelectItem>
                <SelectItem value="grid">网格布局</SelectItem>
                <SelectItem value="dashboard">仪表板</SelectItem>
                <SelectItem value="scada2d">SCADA 2D建模</SelectItem>
                <SelectItem value="scada-engine-assembly">发动机装配车间</SelectItem>
                <SelectItem value="scada-auto-assembly">汽车装配车间</SelectItem>
                <SelectItem value="scada-casting">铸造车间</SelectItem>
                <SelectItem value="scada-machining">机加车间</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            页面ID: {page.id}
          </div>
          <div className="text-xs text-muted-foreground">
            创建时间: {new Date(page.createdAt).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            更新时间: {new Date(page.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  const [local, setLocal] = useState<NodeMeta | null>(selected);
  // JSON草稿状态，用于处理JSON输入框的编辑
  const [jsonDrafts, setJsonDrafts] = useState<{[key: string]: string}>({});
  // 组件挂载状态，用于防止组件卸载后的状态更新
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      setLocal(selected);
      // 当选中组件变化时，清空JSON草稿状态
      setJsonDrafts({});
    }
  }, [selected, isMounted]);

  // 获取可转换的组件类型
  const getConvertibleTypes = (currentType: string) => {
    const typeGroups = {
      // 容器与卡片类组件
      containers: [
        { value: "Container", label: "容器" },
        { value: "Card", label: "基础卡片" },
        { value: "NestedPageContainer", label: "嵌套页面容器" }
        // 暂时隐藏以下卡片类型：
        // { value: "CollapsibleCard", label: "可收缩卡片" },
        // { value: "ActionCard", label: "操作卡片" },
        // { value: "InfoCard", label: "信息卡片" },
        // { value: "StatsCard", label: "统计卡片" }
      ],
      // 表单组件
      forms: [
        { value: "Input", label: "输入框" },
        { value: "Textarea", label: "多行输入" },
        { value: "Select", label: "选择器" },
        { value: "Switch", label: "开关" },
        { value: "Slider", label: "滑块" },
        { value: "NumberInput", label: "数字输入" },
        { value: "RichTextEditor", label: "富文本编辑器" },
        { value: "DatePicker", label: "日期选择器" },
        { value: "MultiSelect", label: "多选框" },
        { value: "Lookup", label: "查找选择器" }
      ],
      // 按钮类组件
      buttons: [
        { value: "Button", label: "按钮" },
        { value: "SubmitButton", label: "提交按钮" }
      ],
      // 展示组件
      display: [
        { value: "Link", label: "链接" },
        { value: "Image", label: "图片" }
      ]
    };

    // 根据当前组件类型返回可转换的类型
    if (typeGroups.containers.some(t => t.value === currentType)) {
      return typeGroups.containers;
    }
    if (typeGroups.forms.some(t => t.value === currentType)) {
      return typeGroups.forms;
    }
    if (typeGroups.buttons.some(t => t.value === currentType)) {
      return typeGroups.buttons;
    }
    if (typeGroups.display.some(t => t.value === currentType)) {
      return typeGroups.display;
    }
    
    // 默认返回当前类型
    return [{ value: currentType, label: currentType }];
  };

  // 转换组件类型
  const convertComponentType = (node: NodeMeta, newType: string) => {
    const converted = { ...node, type: newType as any };
    
    // 保留通用属性
    const commonProps = {
      className: node.props?.className,
      style: node.props?.style,
      text: node.props?.text,
      title: node.props?.title,
      placeholder: node.props?.placeholder,
      value: node.props?.value,
      disabled: node.props?.disabled
    };

    // 容器类组件（可以包含子组件）
    const isSourceContainer = containerTypes.includes(node.type);
    const isTargetContainer = containerTypes.includes(newType);

    // 根据目标类型设置特定属性
    switch (newType) {
      case "Container":
        converted.props = {
          ...commonProps,
          layout: node.layout || "col",
          flexEnabled: node.flexEnabled,
          alignItems: node.alignItems
        };
        // 保留容器特有属性
        converted.layout = node.layout || "col";
        converted.flexEnabled = node.flexEnabled;
        converted.alignItems = node.alignItems;
        converted.locked = node.locked;
        converted.resizable = node.resizable;
        converted.resizableEnabled = node.resizableEnabled;
        converted.panelSizes = node.panelSizes;
        break;
      
      case "NestedPageContainer":
        converted.props = {
          ...commonProps,
          pageId: node.props?.pageId || null,
          // 保留原有的样式属性
          layout: node.layout || "col",
          flexEnabled: node.flexEnabled,
          alignItems: node.alignItems
        };
        // 保留容器特有属性
        converted.layout = node.layout || "col";
        converted.flexEnabled = node.flexEnabled;
        converted.alignItems = node.alignItems;
        converted.locked = node.locked;
        converted.resizable = node.resizable;
        converted.resizableEnabled = node.resizableEnabled;
        converted.panelSizes = node.panelSizes;
        break;
      
      case "Card":
      case "CollapsibleCard":
      case "ActionCard":
      case "InfoCard":
      case "StatsCard":
        converted.props = {
          ...commonProps,
          title: node.props?.title || node.props?.text || "卡片标题",
          description: node.props?.description
        };
        
        if (newType === "CollapsibleCard") {
          converted.props.defaultOpen = true;
        }
        if (newType === "ActionCard") {
          converted.props.showHeaderButton = true;
          converted.props.headerButtonText = "设置";
          converted.props.cancelButtonText = "取消";
          converted.props.confirmButtonText = "确认";
        }
        if (newType === "InfoCard") {
          converted.props.type = "info";
        }
        if (newType === "StatsCard") {
          converted.props.label = "统计标签";
          converted.props.value = "1,234";
        }
        break;
      
      case "Input":
        converted.props = {
          ...commonProps,
          placeholder: node.props?.placeholder || "请输入...",
          value: node.props?.value || (node.props?.checked ? "true" : ""),
          type: node.props?.type || "text"
        };
        // 表单组件不能包含子组件，清空children
        converted.children = undefined;
        break;
      
      case "Textarea":
        converted.props = {
          ...commonProps,
          placeholder: node.props?.placeholder || "请输入...",
          value: node.props?.value || (node.props?.checked ? "true" : ""),
          rows: node.props?.rows || 3
        };
        converted.children = undefined;
        break;
      
      case "Select":
        converted.props = {
          ...commonProps,
          placeholder: node.props?.placeholder || "请选择...",
          value: node.props?.value || "",
          options: node.props?.options || [
            { value: "option1", label: "选项1" },
            { value: "option2", label: "选项2" },
            { value: "option3", label: "选项3" }
          ]
        };
        converted.children = undefined;
        break;
      
      case "Switch":
        converted.props = {
          ...commonProps,
          checked: node.props?.checked !== undefined ? node.props.checked : 
                   node.props?.value === "true" || node.props?.value === true || false,
          label: node.props?.text || node.props?.title || "开关"
        };
        converted.children = undefined;
        break;
      
      case "Slider":
        converted.props = {
          ...commonProps,
          min: node.props?.min || 0,
          max: node.props?.max || 100,
          value: node.props?.value ? Number(node.props.value) || 50 : 50,
          step: node.props?.step || 1
        };
        converted.children = undefined;
        break;
      
      case "Button":
      case "SubmitButton":
        converted.props = {
          ...commonProps,
          text: node.props?.text || node.props?.title || "按钮",
          variant: node.props?.variant || "default"
        };
        converted.children = undefined;
        break;
      
      default:
        converted.props = { ...commonProps };
    }

    // 处理子组件：只有容器类组件可以包含子组件
    if (isTargetContainer && isSourceContainer) {
      // 容器到容器的转换，保留子组件
      converted.children = node.children;
    } else if (!isTargetContainer && isSourceContainer && node.children?.length) {
      // 从容器转换为非容器组件，子组件会丢失，可以在这里添加警告
      console.warn(`转换 ${node.type} 到 ${newType} 将丢失 ${node.children.length} 个子组件`);
    }

    return converted;
  };


  const set = (k: string, v: any) => {
    if (!isMounted || !local) return;
    const copy = { ...local, props: { ...(local.props ?? {}), [k]: v } } as NodeMeta;
    setLocal(copy);
    update(copy);
  };

  // 处理JSON输入的辅助函数
  const handleJsonInput = (key: string, value: string, defaultValue: any = []) => {
    if (!isMounted) return;
    
    // 更新草稿状态
    setJsonDrafts(prev => ({ ...prev, [key]: value }));
    
    // 尝试解析JSON，只有成功时才更新组件属性
    try {
      const parsed = JSON.parse(value || JSON.stringify(defaultValue));
      set(key, parsed);
    } catch {
      // JSON格式错误时不更新组件属性，但保持草稿状态
    }
  };

  // 获取JSON输入框的值
  const getJsonInputValue = (key: string, defaultValue: any = []) => {
    // 如果有草稿状态，使用草稿状态
    if (jsonDrafts[key] !== undefined) {
      return jsonDrafts[key];
    }
    // 否则使用组件属性的格式化值
    return JSON.stringify(local.props?.[key] ?? defaultValue, null, 2);
  };

  const setStyle = (k: string, v: string) => {
    const style = { ...(local.props?.style ?? {}) } as any;
    style[k] = v;
    set("style", style);
  };

  const setCode = (code: string) => {
    const copy = { ...local, code } as NodeMeta;
    setLocal(copy);
    update(copy);
  };

  const setSpacing = (type: 'margin' | 'padding', direction: string, value: string) => {
    const currentSpacing = local[type] || {};
    const newSpacing = { ...currentSpacing };
    
    if (value === '' || value === '0' || value === 'none') {
      delete newSpacing[direction as keyof typeof newSpacing];
    } else {
      (newSpacing as any)[direction] = value;
    }
    
    const copy = { ...local, [type]: Object.keys(newSpacing).length > 0 ? newSpacing : undefined } as NodeMeta;
    setLocal(copy);
    update(copy);
  };

  return (
    <div className="h-full flex flex-col pl-4">
      <div className="flex gap-2 flex-shrink-0 mb-3">
        <Button size="sm" onClick={() => onCopy(local!)}>
          复制
        </Button>
        <Button size="sm" variant="secondary" onClick={onPaste}>
          粘贴
        </Button>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Accordion type="multiple" className="w-full" defaultValue={local.type === "DatePicker" ? ["basic", "style", "datepicker-config", "datepicker-advanced"] : ["basic", "style"]}>
        <AccordionItem value="basic">
          <AccordionTrigger className="text-sm font-medium">
            基础信息
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">ID</div>
              <div className="font-mono text-xs">{local.id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">所在容器</div>
              <div className="font-mono text-xs">{parentId ?? "(root)"}</div>
              {containers.length > 0 && (
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                  <Select onValueChange={(v) => moveTo(v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="移动到容器..." />
                    </SelectTrigger>
                    <SelectContent>
                      {containers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentId && (
                    <Button size="sm" variant="secondary" onClick={() => moveTo(parentId!)}>
                      移到父容器
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-xs">编码(Code)</label>
              <Input value={local.code ?? ""} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-xs">文本/标题</label>
              <Input value={local.props?.text ?? local.props?.title ?? ""} onChange={(e) => set("text", e.target.value)} />
            </div>
            
            {/* 组件类型转换 */}
            <div className="grid gap-2">
              <label className="text-xs">组件类型转换</label>
              <Select 
                value={local.type} 
                onValueChange={(newType) => {
                  const convertedNode = convertComponentType(local, newType as any);
                  update(convertedNode);
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getConvertibleTypes(local.type).map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="style">
          <AccordionTrigger className="text-sm font-medium">
            样式设置
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid gap-1">
              <label className="text-xs">CSS 类名</label>
              <Input value={local.props?.className ?? ""} onChange={(e) => set("className", e.target.value)} />
              {autoClassHint && <div className="text-[11px] text-muted-foreground">系统样式：{autoClassHint}</div>}
            </div>
            
            {/* 外边距设置 */}
            <div className="grid gap-2">
              <label className="text-xs font-medium">外边距 (Margin)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">全部</label>
                  <Select value={local.margin?.all ?? "none"} onValueChange={(v) => setSpacing('margin', 'all', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">水平 (X)</label>
                  <Select value={local.margin?.x ?? "none"} onValueChange={(v) => setSpacing('margin', 'x', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">垂直 (Y)</label>
                  <Select value={local.margin?.y ?? "none"} onValueChange={(v) => setSpacing('margin', 'y', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">上</label>
                  <Select value={local.margin?.top ?? "none"} onValueChange={(v) => setSpacing('margin', 'top', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* 内边距设置 */}
            <div className="grid gap-2">
              <label className="text-xs font-medium">内边距 (Padding)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">全部</label>
                  <Select value={local.padding?.all ?? "none"} onValueChange={(v) => setSpacing('padding', 'all', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">水平 (X)</label>
                  <Select value={local.padding?.x ?? "none"} onValueChange={(v) => setSpacing('padding', 'x', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">垂直 (Y)</label>
                  <Select value={local.padding?.y ?? "none"} onValueChange={(v) => setSpacing('padding', 'y', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">上</label>
                  <Select value={local.padding?.top ?? "none"} onValueChange={(v) => setSpacing('padding', 'top', v)}>
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="0">0 (0px)</SelectItem>
                      <SelectItem value="px">px (1px)</SelectItem>
                      <SelectItem value="0.5">0.5 (2px)</SelectItem>
                      <SelectItem value="1">1 (4px)</SelectItem>
                      <SelectItem value="1.5">1.5 (6px)</SelectItem>
                      <SelectItem value="2">2 (8px)</SelectItem>
                      <SelectItem value="2.5">2.5 (10px)</SelectItem>
                      <SelectItem value="3">3 (12px)</SelectItem>
                      <SelectItem value="3.5">3.5 (14px)</SelectItem>
                      <SelectItem value="4">4 (16px)</SelectItem>
                      <SelectItem value="5">5 (20px)</SelectItem>
                      <SelectItem value="6">6 (24px)</SelectItem>
                      <SelectItem value="7">7 (28px)</SelectItem>
                      <SelectItem value="8">8 (32px)</SelectItem>
                      <SelectItem value="9">9 (36px)</SelectItem>
                      <SelectItem value="10">10 (40px)</SelectItem>
                      <SelectItem value="11">11 (44px)</SelectItem>
                      <SelectItem value="12">12 (48px)</SelectItem>
                      <SelectItem value="14">14 (56px)</SelectItem>
                      <SelectItem value="16">16 (64px)</SelectItem>
                      <SelectItem value="20">20 (80px)</SelectItem>
                      <SelectItem value="24">24 (96px)</SelectItem>
                      <SelectItem value="28">28 (112px)</SelectItem>
                      <SelectItem value="32">32 (128px)</SelectItem>
                      <SelectItem value="36">36 (144px)</SelectItem>
                      <SelectItem value="40">40 (160px)</SelectItem>
                      <SelectItem value="44">44 (176px)</SelectItem>
                      <SelectItem value="48">48 (192px)</SelectItem>
                      <SelectItem value="52">52 (208px)</SelectItem>
                      <SelectItem value="56">56 (224px)</SelectItem>
                      <SelectItem value="60">60 (240px)</SelectItem>
                      <SelectItem value="64">64 (256px)</SelectItem>
                      <SelectItem value="72">72 (288px)</SelectItem>
                      <SelectItem value="80">80 (320px)</SelectItem>
                      <SelectItem value="96">96 (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {local.type === "DatePicker" && (
          <AccordionItem value="datepicker-config">
            <AccordionTrigger className="text-sm font-medium">
              日期选择器配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">标签</label>
                <Input 
                  value={local.props?.label ?? ""} 
                  onChange={(e) => set("label", e.target.value)} 
                  placeholder="选择日期"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">占位符</label>
                <Input 
                  value={local.props?.placeholder ?? ""} 
                  onChange={(e) => set("placeholder", e.target.value)} 
                  placeholder="请选择日期"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">日期格式</label>
                <Select value={local.props?.format ?? "yyyy-MM-dd"} onValueChange={(v) => set("format", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                    <SelectItem value="yyyy/MM/dd">yyyy/MM/dd</SelectItem>
                    <SelectItem value="yyyy/MM">yyyy/MM</SelectItem>
                    <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                    <SelectItem value="yyyy年MM月dd日">yyyy年MM月dd日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">选择模式</label>
                <Select value={local.props?.mode ?? "single"} onValueChange={(v) => set("mode", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">单选</SelectItem>
                    <SelectItem value="multiple">多选</SelectItem>
                    <SelectItem value="range">范围选择</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="disabled" 
                  checked={local.props?.disabled === true} 
                  onCheckedChange={(checked) => set("disabled", checked)} 
                />
                <label htmlFor="disabled" className="text-xs">禁用</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="required" 
                  checked={local.props?.required === true} 
                  onCheckedChange={(checked) => set("required", checked)} 
                />
                <label htmlFor="required" className="text-xs">必填字段</label>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "DatePicker" && (
          <AccordionItem value="datepicker-advanced">
            <AccordionTrigger className="text-sm font-medium">
              高级设置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">语言</label>
                <Select value={local.props?.locale ?? "zh-CN"} onValueChange={(v) => set("locale", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">中文</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                    <SelectItem value="ja-JP">日本語</SelectItem>
                    <SelectItem value="ko-KR">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">一周开始</label>
                <Select value={String(local.props?.weekStartsOn ?? 1)} onValueChange={(v) => set("weekStartsOn", Number(v))}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">周日</SelectItem>
                    <SelectItem value="1">周一</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="showToday" 
                  checked={local.props?.showToday !== false} 
                  onCheckedChange={(checked) => set("showToday", checked)} 
                />
                <label htmlFor="showToday" className="text-xs">显示今天标记</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="showWeekNumbers" 
                  checked={local.props?.showWeekNumbers === true} 
                  onCheckedChange={(checked) => set("showWeekNumbers", checked)} 
                />
                <label htmlFor="showWeekNumbers" className="text-xs">显示周数</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="fixedWeeks" 
                  checked={local.props?.fixedWeeks === true} 
                  onCheckedChange={(checked) => set("fixedWeeks", checked)} 
                />
                <label htmlFor="fixedWeeks" className="text-xs">固定周数显示</label>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">最小日期</label>
                <Input 
                  type="date"
                  value={local.props?.minDate ?? ""} 
                  onChange={(e) => set("minDate", e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">最大日期</label>
                <Input 
                  type="date"
                  value={local.props?.maxDate ?? ""} 
                  onChange={(e) => set("maxDate", e.target.value)} 
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "Grid" && (
          <AccordionItem value="grid-config">
            <AccordionTrigger className="text-sm font-medium">
              栅格配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">列数</label>
                <Input type="number" value={local.props?.cols ?? 12} onChange={(e) => set("cols", Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">间距</label>
                <Input type="number" value={local.props?.gap ?? 4} onChange={(e) => set("gap", Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">响应式布局</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="responsive" 
                    checked={local.props?.responsive !== false} 
                    onCheckedChange={(checked) => set("responsive", checked)} 
                  />
                  <label htmlFor="responsive" className="text-xs">启用响应式</label>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">数据源</label>
                <Select value={local.props?.dataSource ?? "static"} onValueChange={(v) => set("dataSource", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">静态</SelectItem>
                    <SelectItem value="url">接口 URL</SelectItem>
                    <SelectItem value="topic">事件主题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {local.props?.dataSource === "url" && (
                <div className="grid gap-2">
                  <label className="text-xs">URL</label>
                  <Input value={local.props?.url ?? ""} onChange={(e) => set("url", e.target.value)} />
                </div>
              )}
              
              {local.props?.dataSource === "topic" && (
                <div className="grid gap-2">
                  <label className="text-xs">订阅主题</label>
                  <Input value={local.props?.topic ?? ""} onChange={(e) => set("topic", e.target.value)} />
                </div>
              )}
              
              {(local.props?.dataSource ?? "static") === "static" && (
                <div className="grid gap-2">
                  <label className="text-xs">静态数据 JSON(Array)</label>
                  <Textarea 
                    rows={4} 
                    value={getJsonInputValue("data", [])} 
                    onChange={(e) => handleJsonInput("data", e.target.value, [])} 
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <label className="text-xs">字段映射配置</label>
                <Textarea 
                  rows={3} 
                  value={JSON.stringify(local.props?.fieldMapping ?? {}, null, 2)} 
                  onChange={(e) => {
                    try {
                      const v = JSON.parse(e.target.value || "{}");
                      set("fieldMapping", v);
                    } catch {}
                  }} 
                  placeholder='{"childId": {"prop": "text", "field": "name"}}'
                />
                <div className="text-[11px] text-muted-foreground">
                   配置子组件的数据绑定，格式：{'{"子组件ID": {"prop": "属性名", "field": "数据字段"}}'}
                 </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
        
        {local.type === "Button" && (
          <AccordionItem value="button-config">
            <AccordionTrigger className="text-sm font-medium">
              按钮配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">按钮变体</label>
                <Select value={local.props?.variant ?? "default"} onValueChange={(v) => set("variant", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">默认</SelectItem>
                    <SelectItem value="destructive">危险</SelectItem>
                    <SelectItem value="outline">轮廓</SelectItem>
                    <SelectItem value="secondary">次要</SelectItem>
                    <SelectItem value="ghost">幽灵</SelectItem>
                    <SelectItem value="link">链接</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">按钮大小</label>
                <Select value={local.props?.size ?? "default"} onValueChange={(v) => set("size", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">小</SelectItem>
                    <SelectItem value="default">默认</SelectItem>
                    <SelectItem value="lg">大</SelectItem>
                    <SelectItem value="icon">图标</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">图标</label>
                <Input value={local.props?.icon ?? ""} onChange={(e) => set("icon", e.target.value)} placeholder="图标名称 (如: plus, edit, trash, save, search)" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">图标位置</label>
                <Select value={local.props?.iconPosition ?? "left"} onValueChange={(v) => set("iconPosition", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">左侧</SelectItem>
                    <SelectItem value="right">右侧</SelectItem>
                    <SelectItem value="top">上方</SelectItem>
                    <SelectItem value="bottom">下方</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">加载状态</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="loading" 
                    checked={local.props?.loading === true} 
                    onCheckedChange={(checked) => set("loading", checked)} 
                  />
                  <label htmlFor="loading" className="text-xs">显示加载动画</label>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">禁用状态</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="disabled" 
                    checked={local.props?.disabled === true} 
                    onCheckedChange={(checked) => set("disabled", checked)} 
                  />
                  <label htmlFor="disabled" className="text-xs">禁用按钮</label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
        
        {local.type === "Label" && (
          <AccordionItem value="label-config">
            <AccordionTrigger className="text-sm font-medium">
              标签配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">关联表单控件</label>
                <Input value={local.props?.htmlFor ?? ""} onChange={(e) => set("htmlFor", e.target.value)} placeholder="输入控件的ID" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">标签大小</label>
                <Select value={local.props?.size ?? "default"} onValueChange={(v) => set("size", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">小</SelectItem>
                    <SelectItem value="default">默认</SelectItem>
                    <SelectItem value="lg">大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">必填标记</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="required" 
                    checked={local.props?.required === true} 
                    onCheckedChange={(checked) => set("required", checked)} 
                  />
                  <label htmlFor="required" className="text-xs">显示必填标记(*)</label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
        
        {local.type === "Table" && (
          <AccordionItem value="table-config">
            <AccordionTrigger className="text-sm font-medium">
              表格配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">外观</label>
                <Select value={local.props?.variant ?? "default"} onValueChange={(v) => set("variant", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">默认</SelectItem>
                    <SelectItem value="striped">斑马纹</SelectItem>
                    <SelectItem value="compact">紧凑</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">数据源</label>
                <Select value={local.props?.dataSource ?? "static"} onValueChange={(v) => set("dataSource", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">静态</SelectItem>
                    <SelectItem value="url">接口 URL</SelectItem>
                    <SelectItem value="topic">事件主题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {local.props?.dataSource === "url" && (
                <div className="grid gap-2">
                  <label className="text-xs">URL</label>
                  <Input value={local.props?.url ?? ""} onChange={(e) => set("url", e.target.value)} />
                </div>
              )}
              {local.props?.dataSource === "topic" && (
                <div className="grid gap-2">
                  <label className="text-xs">订阅主题</label>
                  <Input value={local.props?.topic ?? ""} onChange={(e) => set("topic", e.target.value)} />
                </div>
              )}
              {(local.props?.dataSource ?? "static") === "static" && (
                <div className="grid gap-2">
                  <label className="text-xs">静态数据 JSON(Array)</label>
                  <Textarea 
                    rows={4} 
                    value={getJsonInputValue("data", [])} 
                    onChange={(e) => handleJsonInput("data", e.target.value, [])} 
                  />
                </div>
              )}
              <EditableColumnManager
                 columns={local.props?.columns ?? []}
                 onChange={(columns) => set("columns", columns)}
               />
              
              <div className="grid gap-2">
                <label className="text-xs">分页器配置</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showPager" 
                    checked={local.props?.showPager !== false} 
                    onCheckedChange={(checked) => set("showPager", checked)} 
                  />
                  <label htmlFor="showPager" className="text-xs">显示分页器</label>
                </div>
              </div>
              
              {local.props?.showPager !== false && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">分页器位置</label>
                    <Select value={local.props?.pagerPosition ?? "bottom"} onValueChange={(v) => set("pagerPosition", v)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">顶部</SelectItem>
                        <SelectItem value="bottom">底部</SelectItem>
                        <SelectItem value="both">顶部和底部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">分页器大小</label>
                    <Select value={local.props?.pagerSize ?? "default"} onValueChange={(v) => set("pagerSize", v)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">小</SelectItem>
                        <SelectItem value="default">默认</SelectItem>
                        <SelectItem value="lg">大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">每页条数</label>
                    <Input type="number" value={local.props?.pageSize ?? 10} onChange={(e) => set("pageSize", Number(e.target.value))} />
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">每页条数选项</label>
                    <Input 
                      value={local.props?.pageSizeOptions ? local.props.pageSizeOptions.join(",") : "5,10,20,50"} 
                      onChange={(e) => {
                        const options = e.target.value.split(",").map(v => Number(v.trim())).filter(v => !isNaN(v));
                        set("pageSizeOptions", options);
                      }} 
                      placeholder="5,10,20,50"
                    />
                  </div>
                </>
              )}
              
              <ActionColumnManager
                 showActions={local.props?.showActions === true}
                 actions={local.props?.actions ?? []}
                 onShowActionsChange={(show) => set("showActions", show)}
                 onActionsChange={(actions) => set("actions", actions)}
               />
               
               {local.props?.showActions && (
                 <div className="grid gap-2">
                   <label className="text-xs">操作列固定</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="stickyActions" 
                       checked={local.props?.stickyActions !== false} 
                       onCheckedChange={(checked) => set("stickyActions", checked)} 
                     />
                     <label htmlFor="stickyActions" className="text-xs">固定操作列</label>
                   </div>
                   
                   <div className="grid gap-2">
                     <label className="text-xs">操作列宽度</label>
                     <Input
                       type="text"
                       placeholder="auto (如: 120px, 10rem, auto)"
                       value={local.props?.actionsWidth || ""}
                       onChange={(e) => set("actionsWidth", e.target.value)}
                       className="h-8"
                     />
                     <div className="text-xs text-muted-foreground">
                       留空或设为 auto 则根据内容自适应
                     </div>
                   </div>
                 </div>
               )}
               
               <Separator />
               
               {/* 表格外观配置 */}
               <div className="space-y-3 h-full flex flex-col">
                 <div className="text-xs font-medium">表格外观</div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">表格大小</label>
                   <Select value={local.props?.size ?? "default"} onValueChange={(v) => set("size", v)}>
                     <SelectTrigger className="h-8">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="default">默认</SelectItem>
                       <SelectItem value="xl">大</SelectItem>
                     </SelectContent>
                   </Select>
                   <div className="text-xs text-muted-foreground">
                     控制表格行高、字体大小和内边距
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">边框样式</label>
                   <Select value={local.props?.bordered ?? "default"} onValueChange={(v) => set("bordered", v)}>
                     <SelectTrigger className="h-8">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">无边框</SelectItem>
                       <SelectItem value="default">默认边框</SelectItem>
                       <SelectItem value="full">完整边框</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">表头固定</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="stickyHeader" 
                       checked={local.props?.stickyHeader === true} 
                       onCheckedChange={(checked) => set("stickyHeader", checked)} 
                     />
                     <label htmlFor="stickyHeader" className="text-xs">固定表头</label>
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">表格高度</label>
                   <Input 
                     value={local.props?.height ?? ""} 
                     onChange={(e) => set("height", e.target.value)}
                     placeholder="auto, 400px, 50vh"
                   />
                 </div>
               </div>
               
               <Separator />
               
               {/* 功能配置 */}
               <div className="space-y-3">
                 <div className="text-xs font-medium">功能配置</div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">高级查询</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableQueryBuilder" 
                       checked={local.props?.enableQueryBuilder === true} 
                       onCheckedChange={(checked) => set("enableQueryBuilder", checked)} 
                     />
                     <label htmlFor="enableQueryBuilder" className="text-xs">启用高级查询</label>
                   </div>
                 </div>
                 
                 {local.props?.enableQueryBuilder && (
                   <>
                     <div className="grid gap-2">
                       <label className="text-xs">查询字段配置</label>
                       <div className="p-2 bg-muted rounded text-xs">
                         {local.props?.columns && Array.isArray(local.props.columns) && local.props.columns.length > 0 ? (
                           <div className="space-y-1">
                             <div className="text-muted-foreground mb-2">自动从列配置读取以下字段：</div>
                             {local.props.columns.map((col, index) => (
                               <div key={index} className="flex justify-between items-center">
                                 <span className="font-medium">{col.title || col.label || col.name || col.key}</span>
                                 <span className="text-muted-foreground">({col.key || col.dataIndex || col.field})</span>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <div className="text-muted-foreground">
                             请先配置表格列，系统将自动生成查询字段
                           </div>
                         )}
                       </div>
                       <div className="text-xs text-muted-foreground">
                         查询字段将自动从表格列配置中读取，无需手动配置
                       </div>
                     </div>
                     
                     <div className="grid gap-2">
                       <label className="text-xs">查询场景配置</label>
                       <Textarea 
                         value={local.props?.queryBuilderScenarios ? JSON.stringify(local.props.queryBuilderScenarios, null, 2) : "[]"} 
                         onChange={(e) => {
                           try {
                             const scenarios = JSON.parse(e.target.value);
                             set("queryBuilderScenarios", scenarios);
                           } catch (error) {
                             // 保持输入状态，不更新属性
                           }
                         }}
                         placeholder='[{"id": "1", "name": "常用查询", "description": "预设的常用查询条件", "query": {...}}]'
                         rows={3}
                         className="text-xs font-mono"
                       />
                       <div className="text-xs text-muted-foreground">
                         配置预设的查询场景，用户可以快速加载
                       </div>
                     </div>
                   </>
                 )}
                 
                 <div className="grid gap-2">
                   <label className="text-xs">搜索功能</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableSearch" 
                       checked={local.props?.enableSearch === true} 
                       onCheckedChange={(checked) => set("enableSearch", checked)} 
                     />
                     <label htmlFor="enableSearch" className="text-xs">启用搜索</label>
                   </div>
                 </div>
                 
                 {local.props?.enableSearch && (
                   <div className="grid gap-2">
                     <label className="text-xs">搜索占位符</label>
                     <Input 
                       value={local.props?.searchPlaceholder ?? "搜索..."} 
                       onChange={(e) => set("searchPlaceholder", e.target.value)}
                     />
                   </div>
                 )}
                 
                 <div className="grid gap-2">
                   <label className="text-xs">列排序</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableSort" 
                       checked={local.props?.enableSort !== false} 
                       onCheckedChange={(checked) => set("enableSort", checked)} 
                     />
                     <label htmlFor="enableSort" className="text-xs">启用排序</label>
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">列筛选</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableFilter" 
                       checked={local.props?.enableFilter === true} 
                       onCheckedChange={(checked) => set("enableFilter", checked)} 
                     />
                     <label htmlFor="enableFilter" className="text-xs">启用筛选</label>
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">列调整大小</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="resizable" 
                       checked={local.props?.resizable === true} 
                       onCheckedChange={(checked) => set("resizable", checked)} 
                     />
                     <label htmlFor="resizable" className="text-xs">可调整列宽</label>
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">序号列</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="showRowNumber" 
                       checked={local.props?.showRowNumber === true} 
                       onCheckedChange={(checked) => set("showRowNumber", checked)} 
                     />
                     <label htmlFor="showRowNumber" className="text-xs">显示序号列</label>
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">行选择</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableSelection" 
                       checked={local.props?.enableSelection === true} 
                       onCheckedChange={(checked) => set("enableSelection", checked)} 
                     />
                     <label htmlFor="enableSelection" className="text-xs">启用行选择</label>
                   </div>
                 </div>
                 
                 {local.props?.enableSelection && (
                   <div className="grid gap-2">
                     <label className="text-xs">选择模式</label>
                     <Select 
                       value={local.props?.selectionMode || "multiple"} 
                       onValueChange={(value) => set("selectionMode", value)}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="single">单选</SelectItem>
                         <SelectItem value="multiple">多选</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 )}
                 
                 <div className="grid gap-2">
                   <label className="text-xs">列拖拽</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableColumnDrag" 
                       checked={local.props?.enableColumnDrag === true} 
                       onCheckedChange={(checked) => set("enableColumnDrag", checked)} 
                     />
                     <label htmlFor="enableColumnDrag" className="text-xs">启用列拖拽</label>
                   </div>
                 </div>
               </div>
               
               <Separator />
               
               {/* 加载和错误状态 */}
               <div className="space-y-3">
                 <div className="text-xs font-medium">状态配置</div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">加载状态</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="loading" 
                       checked={local.props?.loading === true} 
                       onCheckedChange={(checked) => set("loading", checked)} 
                     />
                     <label htmlFor="loading" className="text-xs">显示加载状态</label>
                   </div>
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">加载文本</label>
                   <Input 
                     value={local.props?.loadingText ?? "加载中..."} 
                     onChange={(e) => set("loadingText", e.target.value)}
                   />
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">空数据文本</label>
                   <Input 
                     value={local.props?.emptyText ?? "暂无数据"} 
                     onChange={(e) => set("emptyText", e.target.value)}
                   />
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">错误信息</label>
                   <Input 
                     value={local.props?.errorMessage ?? ""} 
                     onChange={(e) => set("errorMessage", e.target.value)}
                     placeholder="数据加载失败"
                   />
                 </div>
               </div>
               
               <Separator />
               
               {/* 高级配置 */}
               <div className="space-y-3">
                 <div className="text-xs font-medium">高级配置</div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">虚拟滚动</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="virtualScroll" 
                       checked={local.props?.virtualScroll === true} 
                       onCheckedChange={(checked) => set("virtualScroll", checked)} 
                     />
                     <label htmlFor="virtualScroll" className="text-xs">启用虚拟滚动（大数据）</label>
                   </div>
                 </div>
                 
                 {local.props?.virtualScroll && (
                   <div className="grid gap-2">
                     <label className="text-xs">行高度</label>
                     <Input 
                       type="number"
                       value={local.props?.rowHeight ?? 40} 
                       onChange={(e) => set("rowHeight", Number(e.target.value))}
                     />
                   </div>
                 )}
                 
                 <div className="grid gap-2">
                   <label className="text-xs">自动刷新间隔（秒）</label>
                   <Input 
                     type="number"
                     value={local.props?.refreshInterval ?? ""} 
                     onChange={(e) => set("refreshInterval", e.target.value ? Number(e.target.value) : undefined)}
                     placeholder="0表示不自动刷新"
                   />
                 </div>
                 
                 <div className="grid gap-2">
                   <label className="text-xs">导出功能</label>
                   <div className="flex items-center gap-2">
                     <Switch 
                       id="enableExport" 
                       checked={local.props?.enableExport === true} 
                       onCheckedChange={(checked) => set("enableExport", checked)} 
                     />
                     <label htmlFor="enableExport" className="text-xs">启用数据导出</label>
                   </div>
                 </div>
               </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "EditableTable" && (
          <AccordionItem value="editable-table-config">
            <AccordionTrigger className="text-sm font-medium">
              可编辑表格配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">数据源</label>
                <Select value={local.props?.dataSource ?? "static"} onValueChange={(v) => set("dataSource", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">静态</SelectItem>
                    <SelectItem value="url">接口 URL</SelectItem>
                    <SelectItem value="topic">事件主题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {local.props?.dataSource === "url" && (
                <div className="grid gap-2">
                  <label className="text-xs">URL</label>
                  <Input value={local.props?.url ?? ""} onChange={(e) => set("url", e.target.value)} />
                </div>
              )}
              {local.props?.dataSource === "topic" && (
                <div className="grid gap-2">
                  <label className="text-xs">订阅主题</label>
                  <Input value={local.props?.topic ?? ""} onChange={(e) => set("topic", e.target.value)} />
                </div>
              )}
              {(local.props?.dataSource ?? "static") === "static" && (
                <div className="grid gap-2">
                  <label className="text-xs">静态数据 JSON(Array)</label>
                  <Textarea 
                    rows={4} 
                    value={getJsonInputValue("data", [])} 
                    onChange={(e) => handleJsonInput("data", e.target.value, [])} 
                  />
                </div>
              )}
              
              <ColumnManager
                 columns={local.props?.columns ?? []}
                 onChange={(columns) => set("columns", columns)}
               />
              
              <Separator />
              
              {/* 编辑功能配置 */}
              <div className="space-y-3">
                <div className="text-xs font-medium">编辑功能</div>
                
                <div className="grid gap-2">
                  <label className="text-xs">编辑模式</label>
                  <Select value={local.props?.editMode ?? "cell"} onValueChange={(v) => set("editMode", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cell">单元格编辑</SelectItem>
                      <SelectItem value="row">行编辑</SelectItem>
                      <SelectItem value="inline">内联编辑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-xs">触发方式</label>
                  <Select value={local.props?.editTrigger ?? "click"} onValueChange={(v) => set("editTrigger", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="click">单击</SelectItem>
                      <SelectItem value="dblclick">双击</SelectItem>
                      <SelectItem value="focus">聚焦</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="allowAdd" 
                    checked={local.props?.allowAdd !== false} 
                    onCheckedChange={(checked) => set("allowAdd", checked)} 
                  />
                  <label htmlFor="allowAdd" className="text-xs">允许添加行</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="allowDelete" 
                    checked={local.props?.allowDelete !== false} 
                    onCheckedChange={(checked) => set("allowDelete", checked)} 
                  />
                  <label htmlFor="allowDelete" className="text-xs">允许删除行</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showRowNumber" 
                    checked={local.props?.showRowNumber === true} 
                    onCheckedChange={(checked) => set("showRowNumber", checked)} 
                  />
                  <label htmlFor="showRowNumber" className="text-xs">显示行号</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="stickyActions" 
                    checked={local.props?.stickyActions !== false} 
                    onCheckedChange={(checked) => set("stickyActions", checked)} 
                  />
                  <label htmlFor="stickyActions" className="text-xs">固定操作列</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="enableColumnDragEditable" 
                    checked={local.props?.enableColumnDrag !== false} 
                    onCheckedChange={(checked) => set("enableColumnDrag", checked)} 
                  />
                  <label htmlFor="enableColumnDragEditable" className="text-xs">启用列拖拽</label>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-xs">操作列宽度</label>
                  <Input
                    type="text"
                    placeholder="auto (如: 120px, 10rem, auto)"
                    value={local.props?.actionsWidth || ""}
                    onChange={(e) => set("actionsWidth", e.target.value)}
                    className="h-8"
                  />
                  <div className="text-xs text-muted-foreground">
                    留空或设为 auto 则根据内容自适应
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* 表格外观配置 */}
              <div className="space-y-3">
                <div className="text-xs font-medium">表格外观</div>
                
                <div className="grid gap-2">
                  <label className="text-xs">表格大小</label>
                  <Select value={local.props?.size ?? "default"} onValueChange={(v) => set("size", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">默认</SelectItem>
                      <SelectItem value="xl">大</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    控制表格行高、字体大小和内边距
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-xs">边框样式</label>
                  <Select value={local.props?.bordered ?? "default"} onValueChange={(v) => set("bordered", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无边框</SelectItem>
                      <SelectItem value="default">默认边框</SelectItem>
                      <SelectItem value="full">完整边框</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-xs">表格高度</label>
                  <Input 
                    value={local.props?.height ?? ""} 
                    onChange={(e) => set("height", e.target.value)}
                    placeholder="auto, 400px, 50vh"
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* 验证配置 */}
              <div className="space-y-3">
                <div className="text-xs font-medium">数据验证</div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="enableValidation" 
                    checked={local.props?.enableValidation === true} 
                    onCheckedChange={(checked) => set("enableValidation", checked)} 
                  />
                  <label htmlFor="enableValidation" className="text-xs">启用数据验证</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showValidationErrors" 
                    checked={local.props?.showValidationErrors !== false} 
                    onCheckedChange={(checked) => set("showValidationErrors", checked)} 
                  />
                  <label htmlFor="showValidationErrors" className="text-xs">显示验证错误</label>
                </div>
              </div>
              
              <Separator />
              
              {/* 事件配置 */}
              <div className="space-y-3">
                <div className="text-xs font-medium">事件配置</div>
                
                {/* 行添加事件 */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">行添加事件 (onRowAdd)</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const events = local.props?.events || [];
                        const newEvent = {
                          id: generateUUID(),
                          type: 'rowAdd',
                          handler: '// 新行添加时触发\nconsole.log("新行数据:", event.row);'
                        };
                        set("events", [...events, newEvent]);
                      }}
                    >
                      添加事件
                    </Button>
                  </div>
                  {(local.props?.events || []).filter((e: any) => e.type === 'rowAdd').map((event: any, index: number) => (
                    <div key={event.id} className="p-2 border rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">行添加事件 #{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const events = local.props?.events || [];
                            set("events", events.filter((e: any) => e.id !== event.id));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        rows={3}
                        value={event.handler || ''}
                        onChange={(e) => {
                          const events = local.props?.events || [];
                          const updatedEvents = events.map((ev: any) => 
                            ev.id === event.id ? { ...ev, handler: e.target.value } : ev
                          );
                          set("events", updatedEvents);
                        }}
                        placeholder="// 事件处理代码"
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                
                {/* 行删除事件 */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">行删除事件 (onRowDelete)</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const events = local.props?.events || [];
                        const newEvent = {
                          id: generateUUID(),
                          type: 'rowDelete',
                          handler: '// 行删除时触发\nconsole.log("删除的行数据:", event.row);'
                        };
                        set("events", [...events, newEvent]);
                      }}
                    >
                      添加事件
                    </Button>
                  </div>
                  {(local.props?.events || []).filter((e: any) => e.type === 'rowDelete').map((event: any, index: number) => (
                    <div key={event.id} className="p-2 border rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">行删除事件 #{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const events = local.props?.events || [];
                            set("events", events.filter((e: any) => e.id !== event.id));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        rows={3}
                        value={event.handler || ''}
                        onChange={(e) => {
                          const events = local.props?.events || [];
                          const updatedEvents = events.map((ev: any) => 
                            ev.id === event.id ? { ...ev, handler: e.target.value } : ev
                          );
                          set("events", updatedEvents);
                        }}
                        placeholder="// 事件处理代码"
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                
                {/* 单元格变化事件 */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">单元格变化事件 (onCellChange)</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const events = local.props?.events || [];
                        const newEvent = {
                          id: generateUUID(),
                          type: 'cellChange',
                          handler: '// 单元格值变化时触发\nconsole.log("行索引:", event.rowIndex);\nconsole.log("列键:", event.columnKey);\nconsole.log("旧值:", event.oldValue);\nconsole.log("新值:", event.newValue);'
                        };
                        set("events", [...events, newEvent]);
                      }}
                    >
                      添加事件
                    </Button>
                  </div>
                  {(local.props?.events || []).filter((e: any) => e.type === 'cellChange').map((event: any, index: number) => (
                    <div key={event.id} className="p-2 border rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">单元格变化事件 #{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const events = local.props?.events || [];
                            set("events", events.filter((e: any) => e.id !== event.id));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        rows={4}
                        value={event.handler || ''}
                        onChange={(e) => {
                          const events = local.props?.events || [];
                          const updatedEvents = events.map((ev: any) => 
                            ev.id === event.id ? { ...ev, handler: e.target.value } : ev
                          );
                          set("events", updatedEvents);
                        }}
                        placeholder="// 事件处理代码"
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                
                {/* 数据变化事件 */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">数据变化事件 (onChange)</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const events = local.props?.events || [];
                        const newEvent = {
                          id: generateUUID(),
                          type: 'dataChange',
                          handler: '// 表格数据变化时触发\nconsole.log("新的表格数据:", event.data);'
                        };
                        set("events", [...events, newEvent]);
                      }}
                    >
                      添加事件
                    </Button>
                  </div>
                  {(local.props?.events || []).filter((e: any) => e.type === 'dataChange').map((event: any, index: number) => (
                    <div key={event.id} className="p-2 border rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">数据变化事件 #{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const events = local.props?.events || [];
                            set("events", events.filter((e: any) => e.id !== event.id));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        rows={3}
                        value={event.handler || ''}
                        onChange={(e) => {
                          const events = local.props?.events || [];
                          const updatedEvents = events.map((ev: any) => 
                            ev.id === event.id ? { ...ev, handler: e.target.value } : ev
                          );
                          set("events", updatedEvents);
                        }}
                        placeholder="// 事件处理代码"
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "Container" && (
          <AccordionItem value="container-config">
            <AccordionTrigger className="text-sm font-medium">
              容器配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="text-xs">布局方向</div>
              <div className="flex gap-2">
                <Button size="sm" variant={local.layout === "row" ? "default" : "secondary"} onClick={() => update({ ...local, layout: "row" })}>
                  行
                </Button>
                <Button size="sm" variant={local.layout === "col" ? "default" : "secondary"} onClick={() => update({ ...local, layout: "col" })}>
                  列
                </Button>
                <Button size="sm" variant={local.layout === "grid" ? "default" : "secondary"} onClick={() => update({ ...local, layout: "grid", gridCols: local.gridCols || 3, gridGap: local.gridGap || 4 })}>
                  网格
                </Button>
              </div>

              {local.layout === "grid" && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="text-xs font-medium">网格配置</div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">列数</label>
                    <Input 
                      type="number"
                      min="1"
                      max="12"
                      value={local.gridCols || 3} 
                      onChange={(e) => {
                        const cols = parseInt(e.target.value) || 3;
                        update({ ...local, gridCols: cols });
                      }}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">行数 (可选)</label>
                    <Input 
                      type="number"
                      min="0"
                      value={local.gridRows || ""} 
                      onChange={(e) => {
                        const rows = e.target.value ? parseInt(e.target.value) : undefined;
                        update({ ...local, gridRows: rows });
                      }}
                      placeholder="自动"
                      className="h-8"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">间距 (px)</label>
                    <Input 
                      type="number"
                      min="0"
                      value={local.gridGap || 4} 
                      onChange={(e) => {
                        const gap = parseInt(e.target.value) || 0;
                        update({ ...local, gridGap: gap });
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              )}

              {(local.layout === "row" || local.layout === "col") && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="flexEnabled" 
                      checked={local.flexEnabled === true} 
                      onCheckedChange={(checked) => {
                        const updated = { ...local, flexEnabled: checked };
                        setLocal(updated);
                        update(updated);
                      }} 
                    />
                    <label htmlFor="flexEnabled" className="text-xs">启用Flex自适应布局</label>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">内容对齐</label>
                    <Select 
                      value={local.alignItems || "start"} 
                      onValueChange={(value) => {
                        const updated = { ...local, alignItems: value as "start" | "center" | "end" | "stretch" };
                        setLocal(updated);
                        update(updated);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start">顶部/左侧</SelectItem>
                        <SelectItem value="center">居中</SelectItem>
                        <SelectItem value="end">底部/右侧</SelectItem>
                        <SelectItem value="stretch">拉伸</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Switch 
                  id="resizableEnabled" 
                  checked={local.resizableEnabled !== false} 
                  onCheckedChange={(checked) => {
                    console.log('Switch状态变化:', {
                      nodeId: local.id,
                      oldValue: local.resizableEnabled,
                      newValue: checked,
                      localBefore: local
                    });
                    const updated = { ...local, resizableEnabled: checked };
                    setLocal(updated);
                    update(updated);
                    console.log('Switch更新后:', {
                      nodeId: updated.id,
                      resizableEnabled: updated.resizableEnabled,
                      updatedNode: updated
                    });
                  }} 
                />
                <label htmlFor="resizableEnabled" className="text-xs">启用分栏调整</label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => addChild(local, "row")}>
                  新增行容器
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addChild(local, "col")}>
                  新增列容器
                </Button>
              </div>
              
              <div className="pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={onSaveComponent}
                >
                  保留自建组件
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "Card" && (
          <AccordionItem value="card-config">
            <AccordionTrigger className="text-sm font-medium">
              卡片配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">卡片标题</label>
                <Input value={local.props?.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="基础卡片" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">卡片描述</label>
                <Input value={local.props?.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="卡片描述信息" />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="showFooter" 
                  checked={!!local.props?.showFooter} 
                  onChange={(e) => set("showFooter", e.target.checked)} 
                />
                <label htmlFor="showFooter" className="text-xs">显示底部区域</label>
              </div>
              {local.props?.showFooter && (
                <div className="grid gap-2">
                  <label className="text-xs">底部文本</label>
                  <Input value={local.props?.footerText ?? ""} onChange={(e) => set("footerText", e.target.value)} placeholder="卡片底部" />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "CollapsibleCard" && (
          <AccordionItem value="collapsible-card-config">
            <AccordionTrigger className="text-sm font-medium">
              可收缩卡片配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">卡片标题</label>
                <Input value={local.props?.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="可收缩卡片" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">卡片描述</label>
                <Input value={local.props?.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="卡片描述信息" />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="defaultOpen" 
                  checked={local.props?.defaultOpen !== false} 
                  onChange={(e) => set("defaultOpen", e.target.checked)} 
                />
                <label htmlFor="defaultOpen" className="text-xs">默认展开状态</label>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "ActionCard" && (
          <AccordionItem value="action-card-config">
            <AccordionTrigger className="text-sm font-medium">
              操作卡片配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">卡片标题</label>
                <Input value={local.props?.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="操作卡片" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">卡片描述</label>
                <Input value={local.props?.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="卡片描述信息" />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="showHeaderButton" 
                  checked={!!local.props?.showHeaderButton} 
                  onChange={(e) => set("showHeaderButton", e.target.checked)} 
                />
                <label htmlFor="showHeaderButton" className="text-xs">显示标题栏按钮</label>
              </div>
              {local.props?.showHeaderButton && (
                <div className="grid gap-2">
                  <label className="text-xs">标题栏按钮文本</label>
                  <Input value={local.props?.headerButtonText ?? ""} onChange={(e) => set("headerButtonText", e.target.value)} placeholder="设置" />
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-xs">取消按钮文本</label>
                <Input value={local.props?.cancelButtonText ?? ""} onChange={(e) => set("cancelButtonText", e.target.value)} placeholder="取消" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">确认按钮文本</label>
                <Input value={local.props?.confirmButtonText ?? ""} onChange={(e) => set("confirmButtonText", e.target.value)} placeholder="确认" />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "InfoCard" && (
          <AccordionItem value="info-card-config">
            <AccordionTrigger className="text-sm font-medium">
              信息卡片配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">卡片标题</label>
                <Input value={local.props?.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="信息卡片" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">卡片描述</label>
                <Input value={local.props?.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="卡片描述信息" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">卡片类型</label>
                <Select value={local.props?.type ?? "info"} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="error">错误</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "StatsCard" && (
          <AccordionItem value="stats-card-config">
            <AccordionTrigger className="text-sm font-medium">
              统计卡片配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">卡片标题</label>
                <Input value={local.props?.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="统计卡片" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">统计标签</label>
                <Input value={local.props?.label ?? ""} onChange={(e) => set("label", e.target.value)} placeholder="总销售额" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">统计数值</label>
                <Input value={local.props?.value ?? ""} onChange={(e) => set("value", e.target.value)} placeholder="¥12,345" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">变化趋势</label>
                <Input value={local.props?.change ?? ""} onChange={(e) => set("change", e.target.value)} placeholder="+12.5%" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">图标类名</label>
                <Input value={local.props?.icon ?? ""} onChange={(e) => set("icon", e.target.value)} placeholder="fas fa-chart-line" />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 输入框设置 */}
        {local.type === "Input" && (
          <AccordionItem value="input-config">
            <AccordionTrigger className="text-sm font-medium">
              输入框设置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">字段标签</label>
                <Input 
                  value={local.props?.label ?? ""} 
                  onChange={(e) => set("label", e.target.value)} 
                  placeholder="请输入字段标签"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  id="required" 
                  checked={local.props?.required === true} 
                  onCheckedChange={(checked) => set("required", checked)} 
                />
                <label htmlFor="required" className="text-xs">必填字段</label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  id="disabled" 
                  checked={local.props?.disabled === true} 
                  onCheckedChange={(checked) => set("disabled", checked)} 
                />
                <label htmlFor="disabled" className="text-xs">禁用状态</label>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">占位符</label>
                <Input 
                  value={local.props?.placeholder ?? ""} 
                  onChange={(e) => set("placeholder", e.target.value)} 
                  placeholder="请输入占位符文本"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">默认值</label>
                <Input 
                  value={local.props?.defaultValue ?? ""} 
                  onChange={(e) => set("defaultValue", e.target.value)} 
                  placeholder="请输入默认值"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">输入类型</label>
                <Select value={local.props?.type ?? "text"} onValueChange={(value) => set("type", value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">文本</SelectItem>
                    <SelectItem value="password">密码</SelectItem>
                    <SelectItem value="email">邮箱</SelectItem>
                    <SelectItem value="number">数字</SelectItem>
                    <SelectItem value="tel">电话</SelectItem>
                    <SelectItem value="url">网址</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="prefix-button" 
                    checked={local.props?.prefixButton?.enabled === true} 
                    onCheckedChange={(checked) => set("prefixButton", { ...local.props?.prefixButton, enabled: checked })} 
                  />
                  <label htmlFor="prefix-button" className="text-xs">前缀按钮</label>
                </div>
                {local.props?.prefixButton?.enabled && (
                  <div className="ml-4 space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs">按钮文字</label>
                      <Input 
                        value={local.props?.prefixButton?.text ?? ""} 
                        onChange={(e) => set("prefixButton", { ...local.props?.prefixButton, text: e.target.value })} 
                        placeholder="按钮文字"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">按钮图标</label>
                      <Select 
                        value={local.props?.prefixButton?.icon ?? "none"} 
                        onValueChange={(value) => set("prefixButton", { ...local.props?.prefixButton, icon: value === "none" ? undefined : value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="选择图标" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无图标</SelectItem>
                          <SelectItem value="search">搜索</SelectItem>
                          <SelectItem value="plus">加号</SelectItem>
                          <SelectItem value="edit">编辑</SelectItem>
                          <SelectItem value="save">保存</SelectItem>
                          <SelectItem value="settings">设置</SelectItem>
                          <SelectItem value="user">用户</SelectItem>
                          <SelectItem value="home">首页</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">按钮样式</label>
                      <Select 
                        value={local.props?.prefixButton?.variant ?? "outline"} 
                        onValueChange={(value) => set("prefixButton", { ...local.props?.prefixButton, variant: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">默认</SelectItem>
                          <SelectItem value="destructive">危险</SelectItem>
                          <SelectItem value="outline">轮廓</SelectItem>
                          <SelectItem value="secondary">次要</SelectItem>
                          <SelectItem value="ghost">幽灵</SelectItem>
                          <SelectItem value="link">链接</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="suffix-button" 
                    checked={local.props?.suffixButton?.enabled === true} 
                    onCheckedChange={(checked) => set("suffixButton", { ...local.props?.suffixButton, enabled: checked })} 
                  />
                  <label htmlFor="suffix-button" className="text-xs">后缀按钮</label>
                </div>
                {local.props?.suffixButton?.enabled && (
                  <div className="ml-4 space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs">按钮文字</label>
                      <Input 
                        value={local.props?.suffixButton?.text ?? ""} 
                        onChange={(e) => set("suffixButton", { ...local.props?.suffixButton, text: e.target.value })} 
                        placeholder="按钮文字"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">按钮图标</label>
                      <Select 
                        value={local.props?.suffixButton?.icon ?? "none"} 
                        onValueChange={(value) => set("suffixButton", { ...local.props?.suffixButton, icon: value === "none" ? undefined : value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="选择图标" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无图标</SelectItem>
                          <SelectItem value="search">搜索</SelectItem>
                          <SelectItem value="plus">加号</SelectItem>
                          <SelectItem value="edit">编辑</SelectItem>
                          <SelectItem value="save">保存</SelectItem>
                          <SelectItem value="settings">设置</SelectItem>
                          <SelectItem value="user">用户</SelectItem>
                          <SelectItem value="home">首页</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">按钮样式</label>
                      <Select 
                        value={local.props?.suffixButton?.variant ?? "outline"} 
                        onValueChange={(value) => set("suffixButton", { ...local.props?.suffixButton, variant: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">默认</SelectItem>
                          <SelectItem value="destructive">危险</SelectItem>
                          <SelectItem value="outline">轮廓</SelectItem>
                          <SelectItem value="secondary">次要</SelectItem>
                          <SelectItem value="ghost">幽灵</SelectItem>
                          <SelectItem value="link">链接</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 表单组件配置 */}
        {["Textarea", "Switch", "Slider", "Select", "Transfer", "Upload"].includes(local.type) && (
          <AccordionItem value="form-config">
            <AccordionTrigger className="text-sm font-medium">
              表单配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">字段标签</label>
                <Input 
                  value={local.props?.label ?? ""} 
                  onChange={(e) => set("label", e.target.value)} 
                  placeholder="请输入字段标签"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  id="required" 
                  checked={local.props?.required === true} 
                  onCheckedChange={(checked) => set("required", checked)} 
                />
                <label htmlFor="required" className="text-xs">必填字段</label>
              </div>
              
              {local.type === "Textarea" && (
                <AccordionItem value="textarea-config">
                  <AccordionTrigger className="text-sm font-medium">
                    文本域配置
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs">占位符</label>
                      <Input 
                        value={local.props?.placeholder ?? ""} 
                        onChange={(e) => set("placeholder", e.target.value)} 
                        placeholder="请输入占位符文本"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">默认值</label>
                      <Textarea 
                        value={local.props?.defaultValue ?? ""} 
                        onChange={(e) => set("defaultValue", e.target.value)} 
                        placeholder="请输入默认值"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">行数</label>
                      <Input 
                        type="number"
                        value={local.props?.rows ?? 3} 
                        onChange={(e) => set("rows", parseInt(e.target.value) || 3)} 
                        placeholder="行数"
                        min="1"
                        max="20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">最大长度</label>
                      <Input 
                        type="number"
                        value={local.props?.maxLength ?? ""} 
                        onChange={(e) => set("maxLength", e.target.value ? parseInt(e.target.value) : undefined)} 
                        placeholder="最大字符数"
                        min="1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="textarea-disabled" 
                        checked={local.props?.disabled === true} 
                        onCheckedChange={(checked) => set("disabled", checked)} 
                      />
                      <label htmlFor="textarea-disabled" className="text-xs">禁用状态</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="textarea-required" 
                        checked={local.props?.required === true} 
                        onCheckedChange={(checked) => set("required", checked)} 
                      />
                      <label htmlFor="textarea-required" className="text-xs">必填字段</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="textarea-resize" 
                        checked={local.props?.resize !== false} 
                        onCheckedChange={(checked) => set("resize", checked)} 
                      />
                      <label htmlFor="textarea-resize" className="text-xs">允许调整大小</label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {local.type === "Switch" && (
                <AccordionItem value="switch-config">
                  <AccordionTrigger className="text-sm font-medium">
                    开关配置
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs">开关标题</label>
                      <Input 
                        value={local.props?.title ?? ""} 
                        onChange={(e) => set("title", e.target.value)} 
                        placeholder="请输入开关标题"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">描述文本</label>
                      <Input 
                        value={local.props?.description ?? ""} 
                        onChange={(e) => set("description", e.target.value)} 
                        placeholder="开关的描述信息"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="defaultChecked" 
                        checked={local.props?.checked === true} 
                        onCheckedChange={(checked) => set("checked", checked)} 
                      />
                      <label htmlFor="defaultChecked" className="text-xs">默认选中</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="switch-disabled" 
                        checked={local.props?.disabled === true} 
                        onCheckedChange={(checked) => set("disabled", checked)} 
                      />
                      <label htmlFor="switch-disabled" className="text-xs">禁用状态</label>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">开关大小</label>
                      <Select value={local.props?.size ?? "default"} onValueChange={(value) => set("size", value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">小</SelectItem>
                          <SelectItem value="default">默认</SelectItem>
                          <SelectItem value="lg">大</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {/* 数据绑定配置 */}
              <Separator />
              <div className="space-y-3">
                <div className="text-xs font-medium">数据绑定</div>
                
                <div className="grid gap-2">
                  <label className="text-xs">字段映射</label>
                  <Input 
                    value={local.props?.fieldMapping ?? ""} 
                    onChange={(e) => set("fieldMapping", e.target.value)} 
                    placeholder="数据字段名，如：name, email, status"
                  />
                  <div className="text-xs text-muted-foreground">
                    当组件位于栅格容器内时，可以绑定到栅格数据源的字段
                  </div>
                </div>
              </div>
              
              {local.type === "Select" && (
                <AccordionItem value="select-config">
                  <AccordionTrigger className="text-sm font-medium">
                    选择器配置
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs">占位符</label>
                      <Input 
                        value={local.props?.placeholder ?? ""} 
                        onChange={(e) => set("placeholder", e.target.value)} 
                        placeholder="请选择..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">默认值</label>
                      <Input 
                        value={local.props?.defaultValue ?? ""} 
                        onChange={(e) => set("defaultValue", e.target.value)} 
                        placeholder="默认选中的值"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">选项配置 (JSON)</label>
                      <Textarea 
                        value={JSON.stringify(local.props?.options ?? [], null, 2)} 
                        onChange={(e) => {
                          try {
                            const options = JSON.parse(e.target.value);
                            set("options", options);
                          } catch (err) {
                            // 忽略JSON解析错误
                          }
                        }} 
                        placeholder='[{"value": "option1", "label": "选项1"}]'
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="select-disabled" 
                        checked={local.props?.disabled === true} 
                        onCheckedChange={(checked) => set("disabled", checked)} 
                      />
                      <label htmlFor="select-disabled" className="text-xs">禁用状态</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="select-required" 
                        checked={local.props?.required === true} 
                        onCheckedChange={(checked) => set("required", checked)} 
                      />
                      <label htmlFor="select-required" className="text-xs">必填字段</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="select-multiple" 
                        checked={local.props?.multiple === true} 
                        onCheckedChange={(checked) => set("multiple", checked)} 
                      />
                      <label htmlFor="select-multiple" className="text-xs">多选模式</label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {local.type === "Upload" && (
                <AccordionItem value="upload-settings">
                  <AccordionTrigger className="text-sm font-medium">
                    Upload 高级设置
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-xs">标签</label>
                      <Input 
                        value={local.props?.label ?? ""} 
                        onChange={(e) => set("label", e.target.value)} 
                        placeholder="选择文件"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">接受的文件类型</label>
                      <Input 
                        value={local.props?.accept ?? ""} 
                        onChange={(e) => set("accept", e.target.value)} 
                        placeholder=".jpg,.png,.pdf"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="multiple" 
                        checked={local.props?.multiple === true} 
                        onCheckedChange={(checked) => set("multiple", checked)} 
                      />
                      <label htmlFor="multiple" className="text-xs">允许多选</label>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">最大文件数</label>
                      <Input 
                        type="number"
                        value={local.props?.maxCount ?? 1} 
                        onChange={(e) => set("maxCount", Number(e.target.value))} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">最大文件大小 (MB)</label>
                      <Input 
                        type="number"
                        value={local.props?.maxSize ?? 10} 
                        onChange={(e) => set("maxSize", Number(e.target.value))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="disabled" 
                        checked={local.props?.disabled === true} 
                        onCheckedChange={(checked) => set("disabled", checked)} 
                      />
                      <label htmlFor="disabled" className="text-xs">禁用状态</label>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">上传提示文本</label>
                      <Input 
                        value={local.props?.description ?? ""} 
                        onChange={(e) => set("description", e.target.value)} 
                        placeholder="拖拽文件到此处或点击选择"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {local.type === "NumberInput" && (
                <AccordionItem value="numberinput-settings">
                  <AccordionTrigger className="text-sm font-medium">
                    NumberInput 高级设置
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-xs">标签</label>
                      <Input 
                        value={local.props?.label ?? ""} 
                        onChange={(e) => set("label", e.target.value)} 
                        placeholder="数字输入"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">占位符</label>
                      <Input 
                        value={local.props?.placeholder ?? ""} 
                        onChange={(e) => set("placeholder", e.target.value)} 
                        placeholder="请输入数字"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">默认值</label>
                      <Input 
                        type="number"
                        value={local.props?.value ?? ""} 
                        onChange={(e) => set("value", e.target.value)} 
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">最小值</label>
                      <Input 
                        type="number"
                        value={local.props?.min ?? ""} 
                        onChange={(e) => set("min", e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">最大值</label>
                      <Input 
                        type="number"
                        value={local.props?.max ?? ""} 
                        onChange={(e) => set("max", e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">步长</label>
                      <Input 
                        type="number"
                        value={local.props?.step ?? 1} 
                        onChange={(e) => set("step", Number(e.target.value))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="disabled" 
                        checked={local.props?.disabled === true} 
                        onCheckedChange={(checked) => set("disabled", checked)} 
                      />
                      <label htmlFor="disabled" className="text-xs">禁用状态</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="required" 
                        checked={local.props?.required === true} 
                        onCheckedChange={(checked) => set("required", checked)} 
                      />
                      <label htmlFor="required" className="text-xs">必填字段</label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {local.type === "RichTextEditor" && (
                <AccordionItem value="richtexteditor-settings">
                  <AccordionTrigger className="text-sm font-medium">
                    RichTextEditor 高级设置
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-xs">标签</label>
                      <Input 
                        value={local.props?.label ?? ""} 
                        onChange={(e) => set("label", e.target.value)} 
                        placeholder="富文本编辑器"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">占位符</label>
                      <Input 
                        value={local.props?.placeholder ?? ""} 
                        onChange={(e) => set("placeholder", e.target.value)} 
                        placeholder="请输入内容"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">默认内容</label>
                      <Textarea 
                        value={local.props?.content ?? ""} 
                        onChange={(e) => set("content", e.target.value)} 
                        placeholder="默认内容"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs">行数</label>
                      <Input 
                        type="number"
                        value={local.props?.rows ?? 6} 
                        onChange={(e) => set("rows", Number(e.target.value))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="disabled" 
                        checked={local.props?.disabled === true} 
                        onCheckedChange={(checked) => set("disabled", checked)} 
                      />
                      <label htmlFor="disabled" className="text-xs">禁用状态</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="required" 
                        checked={local.props?.required === true} 
                        onCheckedChange={(checked) => set("required", checked)} 
                      />
                      <label htmlFor="required" className="text-xs">必填字段</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="showToolbar" 
                        checked={local.props?.showToolbar !== false} 
                        onCheckedChange={(checked) => set("showToolbar", checked)} 
                      />
                      <label htmlFor="showToolbar" className="text-xs">显示工具栏</label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}



              {local.type === "MultiSelect" && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">标签</label>
                    <Input 
                      value={local.props?.label ?? ""} 
                      onChange={(e) => set("label", e.target.value)} 
                      placeholder="多选"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">选项配置 (JSON)</label>
                    <Textarea 
                      value={JSON.stringify(local.props?.options ?? [], null, 2)} 
                      onChange={(e) => {
                        try {
                          const options = JSON.parse(e.target.value);
                          set("options", options);
                        } catch (err) {
                          // 忽略JSON解析错误
                        }
                      }} 
                      placeholder='[{"value": "option1", "label": "选项1"}]'
                      rows={4}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">默认选中值 (JSON)</label>
                    <Textarea 
                      value={JSON.stringify(local.props?.value ?? [], null, 2)} 
                      onChange={(e) => {
                        try {
                          const value = JSON.parse(e.target.value);
                          set("value", value);
                        } catch (err) {
                          // 忽略JSON解析错误
                        }
                      }} 
                      placeholder='["option1", "option2"]'
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="multiselect-disabled" 
                      checked={local.props?.disabled === true} 
                      onCheckedChange={(checked) => set("disabled", checked)} 
                    />
                    <label htmlFor="multiselect-disabled" className="text-xs">禁用</label>
                  </div>
                </>
              )}

              {local.type === "Lookup" && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">占位符</label>
                    <Input 
                      value={local.props?.placeholder ?? ""} 
                      onChange={(e) => set("placeholder", e.target.value)} 
                      placeholder="请选择"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">选项配置 (JSON)</label>
                    <Textarea 
                      value={JSON.stringify(local.props?.options ?? [], null, 2)} 
                      onChange={(e) => {
                        try {
                          const options = JSON.parse(e.target.value);
                          set("options", options);
                        } catch (err) {
                          // 忽略JSON解析错误
                        }
                      }} 
                      placeholder='[{"value": "option1", "label": "选项1"}]'
                      rows={4}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">默认值</label>
                    <Input 
                      value={local.props?.value ?? ""} 
                      onChange={(e) => set("value", e.target.value)} 
                      placeholder="option1"
                    />
                  </div>
                </>
              )}

              {local.type === "Link" && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">链接文本</label>
                    <Input 
                      value={local.props?.text ?? ""} 
                      onChange={(e) => set("text", e.target.value)} 
                      placeholder="链接"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">链接地址</label>
                    <Input 
                      value={local.props?.href ?? ""} 
                      onChange={(e) => set("href", e.target.value)} 
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">打开方式</label>
                    <Select value={local.props?.target ?? "_self"} onValueChange={(v) => set("target", v)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_self">当前窗口</SelectItem>
                        <SelectItem value="_blank">新窗口</SelectItem>
                        <SelectItem value="_parent">父窗口</SelectItem>
                        <SelectItem value="_top">顶层窗口</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {local.type === "Image" && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">图片地址</label>
                    <Input 
                      value={local.props?.src ?? ""} 
                      onChange={(e) => set("src", e.target.value)} 
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">替代文本</label>
                    <Input 
                      value={local.props?.alt ?? ""} 
                      onChange={(e) => set("alt", e.target.value)} 
                      placeholder="图片描述"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">宽度</label>
                    <Input 
                      value={local.props?.width ?? ""} 
                      onChange={(e) => set("width", e.target.value)} 
                      placeholder="300"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs">高度</label>
                    <Input 
                      value={local.props?.height ?? ""} 
                      onChange={(e) => set("height", e.target.value)} 
                      placeholder="200"
                    />
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "Header" && (
          <AccordionItem value="header-config">
            <AccordionTrigger className="text-sm font-medium">
              Header配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {/* 基础设置 */}
              <div className="grid gap-2">
                <label className="text-xs">标题</label>
                <Input 
                  value={local.props?.title ?? "代码优化建议"} 
                  onChange={(e) => set("title", e.target.value)} 
                  placeholder="输入Header标题"
                />
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">高度</label>
                <Select value={local.props?.height?.toString() ?? "16"} onValueChange={(v) => set("height", parseInt(v))}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">小 (48px)</SelectItem>
                    <SelectItem value="16">默认 (64px)</SelectItem>
                    <SelectItem value="20">大 (80px)</SelectItem>
                    <SelectItem value="24">特大 (96px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-xs">移除内边距</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="removePadding" 
                    checked={local.props?.removePadding === true} 
                    onCheckedChange={(checked) => set("removePadding", checked)} 
                  />
                  <label htmlFor="removePadding" className="text-xs">移除容器内边距以完全贴合</label>
                </div>
              </div>

              {/* Logo设置 */}
              <div className="grid gap-2">
                <label className="text-xs">显示Logo</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showLogo" 
                    checked={local.props?.showLogo !== false} 
                    onCheckedChange={(checked) => set("showLogo", checked)} 
                  />
                  <label htmlFor="showLogo" className="text-xs">显示Logo</label>
                </div>
              </div>

              {local.props?.showLogo !== false && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">Logo大小</label>
                    <Select value={local.props?.logoSize?.toString() ?? "6"} onValueChange={(v) => set("logoSize", parseInt(v))}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">小 (16px)</SelectItem>
                        <SelectItem value="6">默认 (24px)</SelectItem>
                        <SelectItem value="8">大 (32px)</SelectItem>
                        <SelectItem value="10">特大 (40px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">Logo颜色</label>
                    <Input 
                      value={local.props?.logoColor ?? ""} 
                      onChange={(e) => set("logoColor", e.target.value)} 
                      placeholder="hsl(var(--primary))"
                    />
                  </div>
                </>
              )}

              {/* 标题设置 */}
              <div className="grid gap-2">
                <label className="text-xs">显示标题</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showTitle" 
                    checked={local.props?.showTitle !== false} 
                    onCheckedChange={(checked) => set("showTitle", checked)} 
                  />
                  <label htmlFor="showTitle" className="text-xs">显示标题</label>
                </div>
              </div>

              {local.props?.showTitle !== false && (
                <div className="grid gap-2">
                  <label className="text-xs">标题大小</label>
                  <Select value={local.props?.titleSize ?? "xl"} onValueChange={(v) => set("titleSize", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">小</SelectItem>
                      <SelectItem value="base">默认</SelectItem>
                      <SelectItem value="lg">大</SelectItem>
                      <SelectItem value="xl">特大</SelectItem>
                      <SelectItem value="2xl">超大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 导航设置 */}
              <div className="grid gap-2">
                <label className="text-xs">显示导航</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showNav" 
                    checked={local.props?.showNav !== false} 
                    onCheckedChange={(checked) => set("showNav", checked)} 
                  />
                  <label htmlFor="showNav" className="text-xs">显示导航菜单</label>
                </div>
              </div>

              {local.props?.showNav !== false && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">导航布局</label>
                    <Select value={local.props?.navLayout ?? "horizontal"} onValueChange={(v) => set("navLayout", v)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">水平</SelectItem>
                        <SelectItem value="vertical">垂直</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">导航项配置</label>
                    <Textarea 
                      value={JSON.stringify(local.props?.navItems ?? [
                        { to: "/", label: "首页" },
                        { to: "/guide", label: "指南" },
                        { to: "/studio", label: "设计" }
                      ], null, 2)} 
                      onChange={(e) => {
                        try {
                          const v = JSON.parse(e.target.value || "[]");
                          set("navItems", v);
                        } catch {}
                      }} 
                      placeholder='[{"to": "/", "label": "首页"}]'
                      rows={4}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      {/* JSON格式：[{"to": "路径", "label": "显示文本"}] */}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">当前激活路径</label>
                    <Input 
                      value={local.props?.activeNav ?? ""} 
                      onChange={(e) => set("activeNav", e.target.value)} 
                      placeholder="/current-path"
                    />
                  </div>
                </>
              )}

              {/* 主题切换器设置 */}
              <div className="grid gap-2">
                <label className="text-xs">显示主题切换器</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showThemeSwitcher" 
                    checked={local.props?.showThemeSwitcher !== false} 
                    onCheckedChange={(checked) => set("showThemeSwitcher", checked)} 
                  />
                  <label htmlFor="showThemeSwitcher" className="text-xs">显示主题切换器</label>
                </div>
              </div>

              {local.props?.showThemeSwitcher !== false && (
                <div className="grid gap-2">
                  <label className="text-xs">主题名称</label>
                  <Input 
                    value={local.props?.themeName ?? "主题"} 
                    onChange={(e) => set("themeName", e.target.value)} 
                    placeholder="主题"
                  />
                </div>
              )}

              {/* 自定义按钮设置 */}
              <div className="grid gap-2">
                <label className="text-xs">显示自定义按钮</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="showCustomButton" 
                    checked={local.props?.showCustomButton === true} 
                    onCheckedChange={(checked) => set("showCustomButton", checked)} 
                  />
                  <label htmlFor="showCustomButton" className="text-xs">显示自定义按钮</label>
                </div>
              </div>

              {local.props?.showCustomButton && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">按钮文本</label>
                    <Input 
                      value={local.props?.customButtonText ?? "按钮"} 
                      onChange={(e) => set("customButtonText", e.target.value)} 
                      placeholder="按钮文本"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">按钮样式</label>
                    <Select value={local.props?.customButtonVariant ?? "outline"} onValueChange={(v) => set("customButtonVariant", v)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">默认</SelectItem>
                        <SelectItem value="destructive">危险</SelectItem>
                        <SelectItem value="outline">轮廓</SelectItem>
                        <SelectItem value="secondary">次要</SelectItem>
                        <SelectItem value="ghost">幽灵</SelectItem>
                        <SelectItem value="link">链接</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">按钮大小</label>
                    <Select value={local.props?.customButtonSize ?? "sm"} onValueChange={(v) => set("customButtonSize", v)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">小</SelectItem>
                        <SelectItem value="default">默认</SelectItem>
                        <SelectItem value="lg">大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-xs">按钮图标</label>
                    <Input 
                      value={local.props?.customButtonIcon ?? ""} 
                      onChange={(e) => set("customButtonIcon", e.target.value)} 
                      placeholder="fas fa-cog"
                    />
                  </div>
                </>
              )}

              {/* 布局设置 */}
              <div className="grid gap-2">
                <label className="text-xs">固定定位</label>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="sticky" 
                    checked={local.props?.sticky !== false} 
                    onCheckedChange={(checked) => set("sticky", checked)} 
                  />
                  <label htmlFor="sticky" className="text-xs">固定在顶部</label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "Tree" && (
          <AccordionItem value="tree-config">
            <AccordionTrigger className="text-sm font-medium">
              树形组件配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">树形数据</label>
                <Textarea 
                  value={JSON.stringify(local.props?.data ?? [], null, 2)} 
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      set("data", data);
                    } catch (err) {
                      // 忽略JSON解析错误
                    }
                  }} 
                  placeholder='[{"id": "1", "label": "节点1", "children": []}]'
                  rows={6}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">展开的节点</label>
                <Input 
                  value={(local.props?.expandedKeys ?? []).join(",")} 
                  onChange={(e) => set("expandedKeys", e.target.value.split(",").filter(Boolean))} 
                  placeholder="1,2,3" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">选中的节点</label>
                <Input 
                  value={(local.props?.selectedKeys ?? []).join(",")} 
                  onChange={(e) => set("selectedKeys", e.target.value.split(",").filter(Boolean))} 
                  placeholder="1,2" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">勾选的节点</label>
                <Input 
                  value={(local.props?.checkedKeys ?? []).join(",")} 
                  onChange={(e) => set("checkedKeys", e.target.value.split(",").filter(Boolean))} 
                  placeholder="1,3" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">高度</label>
                <Input 
                  value={local.props?.height ?? ""} 
                  onChange={(e) => set("height", e.target.value)} 
                  placeholder="400px" 
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">显示复选框</label>
                <Switch 
                  checked={local.props?.checkable ?? false} 
                  onCheckedChange={(checked) => set("checkable", checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">多选模式</label>
                <Switch 
                  checked={local.props?.multiple ?? false} 
                  onCheckedChange={(checked) => set("multiple", checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">显示连接线</label>
                <Switch 
                  checked={local.props?.showLine ?? true} 
                  onCheckedChange={(checked) => set("showLine", checked)} 
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "DateRangePicker" && (
          <AccordionItem value="daterangepicker-config">
            <AccordionTrigger className="text-sm font-medium">
              日期区间选择器配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">标签</label>
                <Input 
                  value={local.props?.label ?? ""} 
                  onChange={(e) => set("label", e.target.value)} 
                  placeholder="日期区间选择器"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">样式变体</label>
                <Select value={local.props?.variant ?? "default"} onValueChange={(value) => set("variant", value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择样式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">默认样式</SelectItem>
                    <SelectItem value="outline">边框样式</SelectItem>
                    <SelectItem value="minimal">简约样式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">显示区间类型选择器</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.showRangeTypeSelector ?? true} 
                    onCheckedChange={(checked) => set("showRangeTypeSelector", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.showRangeTypeSelector ?? true ? "显示" : "隐藏"}
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs">默认区间类型</label>
                <Select value={local.props?.rangeType ?? "day"} onValueChange={(value) => set("rangeType", value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择区间类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">日期区间</SelectItem>
                    <SelectItem value="week">周区间</SelectItem>
                    <SelectItem value="month">月区间</SelectItem>
                    <SelectItem value="year">年区间</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!(local.props?.showRangeTypeSelector ?? true) && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  当隐藏区间类型选择器时，组件将固定使用上面设置的默认区间类型
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-xs">日期格式</label>
                <Select value={local.props?.format ?? ""} onValueChange={(value) => set("format", value === "custom" ? "" : value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yyyy年MM月dd日">中文格式 (2024年01月01日)</SelectItem>
                    <SelectItem value="yyyy-MM-dd">标准格式 (2024-01-01)</SelectItem>
                    <SelectItem value="MM/dd/yyyy">美式格式 (01/01/2024)</SelectItem>
                    <SelectItem value="dd/MM/yyyy">欧式格式 (01/01/2024)</SelectItem>
                    <SelectItem value="custom">自定义格式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(!local.props?.format || local.props?.format === "") && (
                <div className="grid gap-2">
                  <Input 
                    value={local.props?.customFormat ?? ""} 
                    onChange={(e) => set("format", e.target.value)} 
                    placeholder="yyyy-MM-dd"
                  />
                  <div className="text-xs text-muted-foreground">
                    使用 date-fns 格式化语法，留空使用默认格式
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-xs">占位符文本</label>
                <Input 
                  value={local.props?.placeholder ?? ""} 
                  onChange={(e) => set("placeholder", e.target.value)} 
                  placeholder="选择日期区间"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">默认值 (JSON)</label>
                <Textarea 
                  value={JSON.stringify(local.props?.value ?? [], null, 2)} 
                  onChange={(e) => {
                    try {
                      const value = JSON.parse(e.target.value);
                      set("value", value);
                    } catch (err) {
                      // 忽略JSON解析错误
                    }
                  }} 
                  placeholder='["2024-01-01", "2024-01-31"]'
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">最小日期</label>
                <Input 
                  value={local.props?.min ?? ""} 
                  onChange={(e) => set("min", e.target.value)} 
                  placeholder="2020-01-01"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">最大日期</label>
                <Input 
                  value={local.props?.max ?? ""} 
                  onChange={(e) => set("max", e.target.value)} 
                  placeholder="2030-12-31"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "DateRangePicker" && (
          <AccordionItem value="daterangepicker-advanced">
            <AccordionTrigger className="text-sm font-medium">
              高级设置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {/* 快捷选择预设 */}
              <div className="grid gap-2">
                <label className="text-xs">快捷选择预设</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.showPresets ?? true} 
                    onCheckedChange={(checked) => set("showPresets", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.showPresets ?? true ? "显示" : "隐藏"}快捷选择按钮
                  </span>
                </div>
              </div>
              
              {/* 自定义预设 */}
              {(local.props?.showPresets ?? true) && (
                <div key="custom-presets" className="grid gap-2">
                  <label className="text-xs">自定义预设 (JSON)</label>
                  <Textarea 
                    key={`custom-presets-textarea-${local.id}`}
                    value={JSON.stringify(local.props?.customPresets ?? [], null, 2)} 
                    onChange={(e) => {
                      if (!isMounted) return;
                      try {
                        const presets = JSON.parse(e.target.value);
                        set("customPresets", presets);
                      } catch (err) {
                        // 忽略JSON解析错误
                      }
                    }} 
                    placeholder='[{"label": "最近7天", "value": "last7days"}, {"label": "本月", "value": "thisMonth"}]'
                    rows={3}
                  />
                  <div className="text-xs text-muted-foreground">
                    自定义快捷选择选项，支持: last7days, last30days, thisMonth, lastMonth, thisYear, lastYear
                  </div>
                </div>
              )}

              {/* 时间选择 */}
              <div className="grid gap-2">
                <label className="text-xs">时间选择</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.enableTime ?? false} 
                    onCheckedChange={(checked) => set("enableTime", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.enableTime ?? false ? "启用" : "禁用"}时间选择
                  </span>
                </div>
              </div>

              {/* 时间格式 */}
              {(local.props?.enableTime ?? false) && (
                <div className="grid gap-2">
                  <label className="text-xs">时间格式</label>
                  <Select value={local.props?.timeFormat ?? "24"} onValueChange={(value) => set("timeFormat", value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="选择时间格式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24小时制 (14:30)</SelectItem>
                      <SelectItem value="12">12小时制 (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 禁用日期 */}
              <div className="grid gap-2">
                <label className="text-xs">禁用日期规则</label>
                <Select value={local.props?.disabledDates ?? "none"} onValueChange={(value) => set("disabledDates", value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择禁用规则" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无禁用</SelectItem>
                    <SelectItem value="weekends">禁用周末</SelectItem>
                    <SelectItem value="weekdays">禁用工作日</SelectItem>
                    <SelectItem value="past">禁用过去日期</SelectItem>
                    <SelectItem value="future">禁用未来日期</SelectItem>
                    <SelectItem value="custom">自定义禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 自定义禁用日期 */}
              {local.props?.disabledDates === "custom" && (
                <div className="grid gap-2">
                  <label className="text-xs">自定义禁用日期 (JSON)</label>
                  <Textarea 
                    value={JSON.stringify(local.props?.customDisabledDates ?? [], null, 2)} 
                    onChange={(e) => {
                      try {
                        const dates = JSON.parse(e.target.value);
                        set("customDisabledDates", dates);
                      } catch (err) {
                        // 忽略JSON解析错误
                      }
                    }} 
                    placeholder='["2024-01-01", "2024-12-25"]'
                    rows={2}
                  />
                  <div className="text-xs text-muted-foreground">
                    指定要禁用的具体日期列表
                  </div>
                </div>
              )}

              {/* 多语言支持 */}
              <div className="grid gap-2">
                <label className="text-xs">语言</label>
                <Select value={local.props?.locale ?? "zh-CN"} onValueChange={(value) => set("locale", value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择语言" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="zh-TW">繁体中文</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="ja-JP">日本語</SelectItem>
                    <SelectItem value="ko-KR">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 周开始日 */}
              <div className="grid gap-2">
                <label className="text-xs">周开始日</label>
                <Select value={local.props?.weekStartsOn?.toString() ?? "1"} onValueChange={(value) => set("weekStartsOn", parseInt(value))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择周开始日" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">周日</SelectItem>
                    <SelectItem value="1">周一</SelectItem>
                    <SelectItem value="2">周二</SelectItem>
                    <SelectItem value="3">周三</SelectItem>
                    <SelectItem value="4">周四</SelectItem>
                    <SelectItem value="5">周五</SelectItem>
                    <SelectItem value="6">周六</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 验证设置 */}
              <div className="grid gap-2">
                <label className="text-xs">范围验证</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.strictValidation ?? false} 
                    onCheckedChange={(checked) => set("strictValidation", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.strictValidation ?? false ? "启用" : "禁用"}严格验证
                  </span>
                </div>
              </div>

              {/* 最大范围天数 */}
              {(local.props?.strictValidation ?? false) && (
                <div className="grid gap-2">
                  <label className="text-xs">最大范围天数</label>
                  <Input 
                    type="number"
                    value={local.props?.maxRangeDays ?? ""} 
                    onChange={(e) => set("maxRangeDays", parseInt(e.target.value) || undefined)} 
                    placeholder="365"
                  />
                  <div className="text-xs text-muted-foreground">
                    限制可选择的最大日期范围天数
                  </div>
                </div>
              )}

              {/* 自定义样式 */}
              <div className="grid gap-2">
                <label className="text-xs">自定义主题色</label>
                <Input 
                  value={local.props?.primaryColor ?? ""} 
                  onChange={(e) => set("primaryColor", e.target.value)} 
                  placeholder="#3b82f6"
                />
                <div className="text-xs text-muted-foreground">
                  自定义日期选择器的主题颜色 (CSS颜色值)
                </div>
              </div>

              {/* 动画效果 */}
              <div className="grid gap-2">
                <label className="text-xs">动画效果</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.enableAnimations ?? true} 
                    onCheckedChange={(checked) => set("enableAnimations", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.enableAnimations ?? true ? "启用" : "禁用"}过渡动画
                  </span>
                </div>
              </div>

              {/* 自动关闭 */}
              <div className="grid gap-2">
                <label className="text-xs">自动关闭</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.autoClose ?? true} 
                    onCheckedChange={(checked) => set("autoClose", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.autoClose ?? true ? "选择完成后自动关闭" : "手动关闭"}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "PageTab" && (
          <AccordionItem value="pagetab-config">
            <AccordionTrigger className="text-sm font-medium">
              页面标签配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">标签页配置</label>
                <div className="space-y-2">
                  {(local.props?.tabs || []).map((tab: any, index: number) => (
                    <div key={`tab-${tab.id || index}-${local.id}`} className="border rounded p-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">标签页 {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newTabs = [...(local.props?.tabs || [])];
                            newTabs.splice(index, 1);
                            set("tabs", newTabs);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Input
                          placeholder="标签名称"
                          value={tab.label || ""}
                          onChange={(e) => {
                            const newTabs = [...(local.props?.tabs || [])];
                            newTabs[index] = { ...tab, label: e.target.value };
                            set("tabs", newTabs);
                          }}
                        />
                        <Input
                          placeholder="页面ID"
                          value={tab.pageId || ""}
                          onChange={(e) => {
                            const newTabs = [...(local.props?.tabs || [])];
                            newTabs[index] = { ...tab, pageId: e.target.value };
                            set("tabs", newTabs);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newTabs = [...(local.props?.tabs || [])];
                      newTabs.push({
                        value: `tab${newTabs.length + 1}`,
                        label: `页面${newTabs.length + 1}`,
                        pageId: ""
                      });
                      set("tabs", newTabs);
                    }}
                  >
                    添加标签页
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "NavigationControls" && (
          <AccordionItem value="navigation-controls-config">
            <AccordionTrigger className="text-sm font-medium">
              导航控制器配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">显示后退按钮</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.showBackButton ?? true} 
                    onCheckedChange={(checked) => set("showBackButton", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.showBackButton ?? true ? "显示" : "隐藏"}后退按钮
                  </span>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">显示前进按钮</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.showForwardButton ?? true} 
                    onCheckedChange={(checked) => set("showForwardButton", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.showForwardButton ?? true ? "显示" : "隐藏"}前进按钮
                  </span>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">显示历史记录按钮</label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={local.props?.showHistoryButton ?? true} 
                    onCheckedChange={(checked) => set("showHistoryButton", checked)} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {local.props?.showHistoryButton ?? true ? "显示" : "隐藏"}历史记录按钮
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-2">
                <label className="text-xs">按钮大小</label>
                <Select value={local.props?.buttonSize ?? "md"} onValueChange={(v) => set("buttonSize", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">小</SelectItem>
                    <SelectItem value="md">默认</SelectItem>
                    <SelectItem value="lg">大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">按钮样式</label>
                <Select value={local.props?.variant ?? "default"} onValueChange={(v) => set("variant", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">默认</SelectItem>
                    <SelectItem value="outline">轮廓</SelectItem>
                    <SelectItem value="ghost">幽灵</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">自定义类名</label>
                <Input 
                  value={local.props?.className ?? ""} 
                  onChange={(e) => set("className", e.target.value)}
                  placeholder="自定义CSS类名"
                />
              </div>
              
              <Separator />
              
              <div className="grid gap-2">
                <label className="text-xs">布局方向</label>
                <Select value={local.props?.layout ?? "row"} onValueChange={(v) => set("layout", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="row">水平</SelectItem>
                    <SelectItem value="col">垂直</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">间距大小</label>
                <Select value={local.props?.gap ?? "sm"} onValueChange={(v) => set("gap", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">小</SelectItem>
                    <SelectItem value="md">中</SelectItem>
                    <SelectItem value="lg">大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">主轴对齐</label>
                <Select value={local.props?.justify ?? "start"} onValueChange={(v) => set("justify", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">开始</SelectItem>
                    <SelectItem value="center">居中</SelectItem>
                    <SelectItem value="end">结束</SelectItem>
                    <SelectItem value="between">两端</SelectItem>
                    <SelectItem value="around">环绕</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs">交叉轴对齐</label>
                <Select value={local.props?.align ?? "center"} onValueChange={(v) => set("align", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">开始</SelectItem>
                    <SelectItem value="center">居中</SelectItem>
                    <SelectItem value="end">结束</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {local.type === "NestedPageContainer" && (
          <AccordionItem value="nestedpage-config">
            <AccordionTrigger className="text-sm font-medium">
              嵌套页面容器配置
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2">
                <label className="text-xs">绑定页面ID</label>
                <Input
                  value={local.props?.pageId || ""}
                  onChange={(e) => set("pageId", e.target.value)}
                  placeholder="输入要绑定的页面ID"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">最小高度</label>
                <Input
                  value={local.props?.minHeight || ""}
                  onChange={(e) => set("minHeight", e.target.value)}
                  placeholder="200px"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">内边距</label>
                <Input
                  value={local.props?.padding || ""}
                  onChange={(e) => set("padding", e.target.value)}
                  placeholder="16px"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">外边距</label>
                <Input
                  value={local.props?.margin || ""}
                  onChange={(e) => set("margin", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">背景颜色</label>
                <Input
                  value={local.props?.backgroundColor || ""}
                  onChange={(e) => set("backgroundColor", e.target.value)}
                  placeholder="transparent"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">边框</label>
                <Input
                  value={local.props?.border || ""}
                  onChange={(e) => set("border", e.target.value)}
                  placeholder="1px solid #e5e7eb"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs">圆角</label>
                <Input
                  value={local.props?.borderRadius || ""}
                  onChange={(e) => set("borderRadius", e.target.value)}
                  placeholder="8px"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
      </div>
    </div>
  );
}

export default function Studio() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const pageId = params.get("id");
  const [page, setPage] = useState<PageMeta>(() => {
    if (pageId) {
      const cachedPage = getCachedPage(pageId!) as PageMeta;
      console.log("🔍 页面初始化 - pageId:", pageId);
      console.log("📄 缓存页面数据:", {
        found: !!cachedPage,
        id: cachedPage?.id,
        name: cachedPage?.name,
        hasRoot: !!cachedPage?.root,
        hasRoots: !!cachedPage?.roots,
        rootId: cachedPage?.root?.id,
        rootType: cachedPage?.root?.type,
        rootChildren: cachedPage?.root?.children?.length
      });
      return cachedPage ?? createPage("新页面", "content");
    } else {
      // 创建包含Header组件的测试页面
      const testPage = createPage("Header测试页面", "content");
      // 在根容器中添加Header组件
      const headerNode = createNode("Header", {
        props: {
          title: "测试Header",
          removePadding: true // 启用removePadding来测试智能padding系统
        }
      });
      
      // 添加EventListener组件来监听actionClick事件
      const eventListenerNode = createNode("Listener", {
        props: {
          listen: "actionClick",
          handler: "log",
          script: `// 监听操作按钮点击事件
console.log("操作按钮被点击:", payload);
console.log("行数据:", payload.row);
console.log("操作信息:", payload.action);
setText("操作按钮点击事件触发！行ID: " + (payload.row?.id || "未知") + ", 操作: " + (payload.action?.text || "未知"));`
        }
      });
      
      testPage.root.children = [headerNode, eventListenerNode, ...(testPage.root.children || [])];
      return testPage;
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<NodeMeta | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [history, setHistory] = useState<PageMeta[]>([]);
  const [future, setFuture] = useState<PageMeta[]>([]);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showPreview, setShowPreview] = useState(false);
  const [saveComponentDialog, setSaveComponentDialog] = useState(false);
  const [componentName, setComponentName] = useState("");
  const [componentDescription, setComponentDescription] = useState("");
  const [customComponents, setCustomComponents] = useState<CustomComponent[]>([]);
  const [editComponentDialog, setEditComponentDialog] = useState(false);
  const [editingComponent, setEditingComponent] = useState<CustomComponent | null>(null);
  const [editComponentName, setEditComponentName] = useState("");
  const [editComponentDescription, setEditComponentDescription] = useState("");
  const [componentSearchTerm, setComponentSearchTerm] = useState("");
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const [allPages, setAllPages] = useState<PageMeta[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageViewMode, setPageViewMode] = useState<"list" | "tree">("tree");
  const [pageGroups, setPageGroups] = useState<PageGroup[]>([]);
  const [groupDialog, setGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PageGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupColor, setGroupColor] = useState("#6b7280");
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(false);
  const metadataEditorOpenRef = useRef(false);
  const isSavingScriptRef = useRef(false);
  const previousPageRef = useRef<PageMeta | null>(null);
  const [metadataCode, setMetadataCode] = useState(() => {
    console.log("🔧 初始化 metadataCode 状态");
    return "";
  });
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [doubleClickEditEnabled, setDoubleClickEditEnabled] = useState(true);
  // 列表视图拖拽状态
  const [listDraggingId, setListDraggingId] = useState<string | null>(null);
  const [listDragOverId, setListDragOverId] = useState<string | null>(null);

  const handleListDropReorder = useCallback((targetId: string) => {
    if (!listDraggingId || listDraggingId === targetId) return;
    const orderedIds = allPages.map(p => p.id);
    const from = orderedIds.indexOf(listDraggingId);
    const to = orderedIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = orderedIds.splice(from, 1);
    orderedIds.splice(to, 0, moved);
    reorderCachedPages(orderedIds);
    refreshPagesList();
    setListDraggingId(null);
    setListDragOverId(null);
  }, [listDraggingId, allPages]);

  // 检查页面是否有实质性变化（排除仅代码更新）
  const hasStructuralChanges = (current: PageMeta, previous: PageMeta | null): boolean => {
    if (!previous) return true; // 首次加载算作变化
    
    // 检查基本属性
    if (current.id !== previous.id || current.name !== previous.name) {
      return true;
    }
    
    // 检查根节点数量
    const currentRootsLength = current.roots?.length || 0;
    const previousRootsLength = previous.roots?.length || 0;
    if (currentRootsLength !== previousRootsLength) {
      return true;
    }
    
    // 递归检查节点结构（排除code属性）
    const compareNodeStructure = (node1: NodeMeta, node2: NodeMeta): boolean => {
      if (node1.id !== node2.id || node1.type !== node2.type) {
        return false; // 结构不同
      }
      
      // 检查子节点数量
      const children1Length = node1.children?.length || 0;
      const children2Length = node2.children?.length || 0;
      if (children1Length !== children2Length) {
        return false; // 子节点数量不同
      }
      
      // 递归检查子节点
      if (node1.children && node2.children) {
        for (let i = 0; i < node1.children.length; i++) {
          if (!compareNodeStructure(node1.children[i], node2.children[i])) {
            return false;
          }
        }
      }
      
      return true; // 结构相同
    };
    
    // 比较根节点结构
    if (current.roots && previous.roots) {
      for (let i = 0; i < current.roots.length; i++) {
        if (!compareNodeStructure(current.roots[i], previous.roots[i])) {
          return true; // 发现结构变化
        }
      }
    }
    
    return false; // 没有结构变化
  };

  const commit = (next: PageMeta) => {
    console.log("💾 提交页面更改:", {
      pageId: next.id,
      pageName: next.name,
      hasRoot: !!next.root,
      hasRoots: !!(next.roots && next.roots.length > 0),
      rootsLength: next.roots?.length,
      rootId: next.root?.id,
      rootType: next.root?.type,
      timestamp: new Date().toISOString(),
      currentPageId: page.id
    });
    
    // 验证页面数据完整性
    if (!next.root && (!next.roots || next.roots.length === 0)) {
      console.error("❌ 警告：提交的页面数据缺少根节点！");
      console.log("🔍 完整的next对象:", JSON.stringify(next, null, 2));
    }
    
    setHistory((h) => [...h, page]);
    setFuture([]);
    
    console.log("🔄 准备调用 setPage(next):", {
      nextPageId: next.id,
      currentPageId: page.id,
      timestamp: new Date().toISOString()
    });
    
    setPage(next);
    
    console.log("✅ setPage(next) 调用完成");
  };

  // 查看页面元数据
  const generatePageMetadata = () => {
    console.log("🔍 开始生成页面元数据");
    console.log("📄 当前页面状态:", {
      id: page.id,
      name: page.name,
      hasRoot: !!page.root,
      hasRoots: !!page.roots,
      rootsLength: page.roots?.length,
      rootId: page.root?.id,
      rootType: page.root?.type,
      rootChildren: page.root?.children?.length
    });

    // 检查页面数据的完整性
    if (!page.root && (!page.roots || page.roots.length === 0)) {
      console.error("❌ 页面数据不完整：没有根节点数据");
      console.log("🔍 完整页面对象:", JSON.stringify(page, null, 2));
      return JSON.stringify({
        error: "页面数据不完整：没有根节点数据",
        page: {
          id: page.id,
          name: page.name,
          hasRoot: !!page.root,
          hasRoots: !!page.roots
        },
        nodes: []
      }, null, 2);
    }

    // 获取所有节点的递归函数
    const getAllNodes = (node: NodeMeta): NodeMeta[] => {
      const nodes = [node];
      if (node.children) {
        for (const child of node.children) {
          nodes.push(...getAllNodes(child));
        }
      }
      return nodes;
    };

    // 获取页面的所有根节点
    const roots = page.roots || [page.root];
    console.log("🌳 根节点信息:", {
      rootsCount: roots.length,
      roots: roots.map(root => ({
        id: root?.id,
        type: root?.type,
        childrenCount: root?.children?.length
      }))
    });
    
    const allNodes = roots.flatMap(root => root ? getAllNodes(root) : []);
    console.log("📊 所有节点统计:", {
      totalNodes: allNodes.length,
      nodeTypes: allNodes.map(n => n.type)
    });

    const metadata = {
      page: {
        id: page.id,
        name: page.name,
        template: page.template,
        description: page.description,
        groupId: page.groupId,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        rootNodeCount: roots.length
      },
      nodes: allNodes.map(node => ({
        id: node.id,
        type: node.type,
        code: node.code,
        props: node.props,
        layout: node.layout,
        flexEnabled: node.flexEnabled,
        alignItems: node.alignItems,
        locked: node.locked,
        resizable: node.resizable,
        resizableEnabled: node.resizableEnabled,
        panelSizes: node.panelSizes,
        gridCols: node.gridCols,
        gridRows: node.gridRows,
        gridGap: node.gridGap,
        style: node.style,
        margin: node.margin,
        padding: node.padding,
        childCount: node.children ? node.children.length : 0,
        hasChildren: !!(node.children && node.children.length > 0),
        hasProps: !!(node.props && Object.keys(node.props).length > 0),
        hasStyle: !!(node.style && Object.keys(node.style).length > 0),
        hasMargin: !!node.margin,
        hasPadding: !!node.padding
      })),
      statistics: {
        totalNodes: allNodes.length,
        totalRootNodes: roots.length,
        nodesByType: allNodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        nodesWithChildren: allNodes.filter(node => node.children && node.children.length > 0).length,
        nodesWithProps: allNodes.filter(node => node.props && Object.keys(node.props).length > 0).length,
        nodesWithStyle: allNodes.filter(node => node.style && Object.keys(node.style).length > 0).length,
        nodesWithLayout: allNodes.filter(node => !!node.layout).length,
        flexEnabledNodes: allNodes.filter(node => node.flexEnabled).length,
        lockedNodes: allNodes.filter(node => node.locked).length,
        resizableNodes: allNodes.filter(node => node.resizable).length
      }
    };
    
    return JSON.stringify(metadata, null, 2);
  };

  // 切换到指定页面
  const switchToPage = (targetPage: PageMeta) => {
    // 保存当前页面（异步）
    upsertCachedPage(page);
    // 清空历史记录，因为这是页面切换而不是编辑操作
    setHistory([]);
    setFuture([]);
    // 切换到新页面
    setPage(targetPage);
    // 清空选中状态
    setSelectedId(null);
    // 更新选中的页面ID
    setSelectedPageId(targetPage.id);
    // 更新URL参数
    setParams({ id: targetPage.id }, { replace: true });
  };

  // 保存脚本代码
  const saveScript = () => {
    console.log("💾 开始保存脚本", { editingNodeId, scriptLength: editingScript?.length });
    
    if (!editingNodeId) {
      console.log("❌ 保存失败：缺少节点ID");
      return;
    }
    
    // 设置保存标志，防止触发元数据更新
    isSavingScriptRef.current = true;
    console.log("🚫 设置脚本保存标志，暂时禁用元数据自动更新");
    
    console.log("✅ 验证通过，开始更新节点");
    
    const updateNodeScript = (nodes: NodeMeta[]): NodeMeta[] => {
      return nodes.map(node => {
        if (node.id === editingNodeId) {
          console.log("🎯 找到目标节点，更新代码", { nodeId: node.id, oldCode: node.code, newCode: editingScript });
          return { ...node, code: editingScript };
        }
        if (node.children) {
          return { ...node, children: updateNodeScript(node.children) };
        }
        return node;
      });
    };

    // 同时更新 roots 和 root 字段，确保数据完整性
    const updatedRoots = updateNodeScript(page.roots || []);
    const updatedRoot = page.root ? updateNodeScript([page.root])[0] : undefined;
    
    const updatedPage = {
      ...page,
      roots: updatedRoots,
      root: updatedRoot,
      updatedAt: Date.now()
    };
    
    console.log("📄 页面更新详情:", {
      hasOriginalRoot: !!page.root,
      hasOriginalRoots: !!(page.roots && page.roots.length > 0),
      hasUpdatedRoot: !!updatedRoot,
      hasUpdatedRoots: !!(updatedRoots && updatedRoots.length > 0),
      updatedRootsLength: updatedRoots?.length,
      updatedRootId: updatedRoot?.id
    });
    
    console.log("📄 页面已更新，准备提交更改");
    console.log("🔄 调用 commit 前的页面状态:", {
      currentPageId: page.id,
      updatedPageId: updatedPage.id,
      timestamp: new Date().toISOString()
    });
    
   // commit(updatedPage);
    
    console.log("✅ commit 调用完成，页面状态已更新");
    
    // 延迟清除保存标志，确保页面更新完成后再允许元数据更新
    setTimeout(() => {
      isSavingScriptRef.current = false;
      console.log("✅ 清除脚本保存标志，恢复元数据自动更新");
    }, 100);
    
    console.log("🎉 脚本保存成功，关闭编辑器");
    setScriptEditorOpen(false);
    setEditingScript("");
    setEditingNodeId(null);
  };

  useEffect(() => {
    setParams({ id: page.id }, { replace: true });
  }, [page.id]);
  useEffect(() => {
    upsertCachedPage(page);
  }, [page]);

  // 同步ref状态
  useEffect(() => {
    metadataEditorOpenRef.current = metadataEditorOpen;
  }, [metadataEditorOpen]);

  // 监听页面变化，如果元数据编辑器是打开的，自动更新元数据内容
  useEffect(() => {
    console.log("🔄 页面变化:", {
      pageId: page.id,
      editorOpen: metadataEditorOpenRef.current,
      isSavingScript: isSavingScriptRef.current,
      hasRoot: !!page.root,
      hasRoots: !!page.roots,
      rootsLength: page.roots?.length
    });
    
    // 如果正在保存脚本，跳过元数据更新
    if (isSavingScriptRef.current) {
      console.log("🚫 正在保存脚本，跳过元数据更新");
      previousPageRef.current = page; // 更新引用但不触发元数据更新
      return;
    }
    
    // 检查是否有结构性变化
    const hasChanges = hasStructuralChanges(page, previousPageRef.current);
    console.log("🔍 页面结构变化检测:", {
      hasStructuralChanges: hasChanges,
      previousPageId: previousPageRef.current?.id,
      currentPageId: page.id
    });
    
    // 更新页面引用
    previousPageRef.current = page;
    
    // 只有当元数据编辑器打开且有结构变化时才更新元数据
    if (metadataEditorOpenRef.current && hasChanges) {
      console.log("🔄 检测到页面结构变化，元数据编辑器已打开，准备自动更新元数据");
      
      // 添加短暂延迟，确保页面状态完全更新
      const timeoutId = setTimeout(() => {
        // 使用ref检查编辑器是否仍然打开，防止在延迟期间被关闭
        // 同时检查是否仍在保存脚本
        if (metadataEditorOpenRef.current && !isSavingScriptRef.current) {
          console.log("⏰ 延迟执行元数据更新");
          const metadata = generatePageMetadata();
          console.log("📋 重新生成元数据，长度:", metadata.length);
          
          // 只有当生成的元数据不为空时才更新
          if (metadata && metadata.trim() !== "" && !metadata.includes('"nodes": []')) {
            setMetadataCode(metadata);
            console.log("✅ 元数据更新成功");
          } else {
            console.log("⚠️ 生成的元数据为空，跳过更新");
          }
        } else {
          console.log("⏰ 延迟期间编辑器已关闭或正在保存脚本，取消元数据更新");
        }
      }, 100); // 100ms延迟
      
      return () => {
        console.log("🧹 清理元数据更新定时器");
        clearTimeout(timeoutId);
      };
    } else if (metadataEditorOpenRef.current && !hasChanges) {
      console.log("📋 元数据编辑器已打开，但无结构变化，跳过自动更新");
    } else {
      console.log("📋 元数据编辑器已关闭，跳过自动更新");
    }
  }, [page]); // 只依赖page，不依赖metadataEditorOpen

  // 监控 metadataCode 状态变化
  useEffect(() => {
    console.log("📝 metadataCode 状态变化:", {
      length: metadataCode.length,
      isEmpty: metadataCode === "",
      editorOpen: metadataEditorOpen
    });
  }, [metadataCode, metadataEditorOpen]);

  // 监控页面状态变化
  useEffect(() => {
    console.log("📄 页面状态变化:", {
      id: page.id,
      name: page.name,
      hasRoot: !!page.root,
      hasRoots: !!page.roots,
      rootId: page.root?.id,
      rootType: page.root?.type,
      rootChildren: page.root?.children?.length,
      rootsLength: page.roots?.length
    });
  }, [page]);

  // 监控组件挂载和卸载
  useEffect(() => {
    console.log("🚀 Studio 组件已挂载");
    return () => {
      console.log("💀 Studio 组件即将卸载");
    };
  }, []);
  
  useEffect(() => {
    // 初始化缓存和加载数据
    const initializeData = async () => {
      await initializePageCache();
      setAllPages(getCachedPages());
      setCustomComponents(loadCustomComponents());
      
      // 设置当前页面为选中状态
      setSelectedPageId(page.id);
      
      // 启动智能预加载
      smartPreloadPages();
    };
    
    initializeData();
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只在页面管理区域有选中页面时处理Delete键
      if (event.key === 'Delete' && selectedPageId && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // 确保不是在输入框或其他可编辑元素中
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          // 检查是否在页面管理区域（左侧面板）
          const leftPanel = target.closest('.grid.h-\\[calc\\(100vh-4rem\\)\\].grid-cols-\\[260px_1fr_300px\\] > div:first-child');
          if (leftPanel) {
            event.preventDefault();
            deleteSelectedPage();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPageId]);

  // 监听导航事件
  useEffect(() => {
    const handleNavigateToPage = (event: NavigateToPageEvent) => {
      const { pageId, options = {} } = event;
      
      // 查找目标页面
      const targetPage = getCachedPage(pageId);
      if (!targetPage) {
        console.warn(`页面 ${pageId} 不存在`);
        return;
      }
      
      // 根据选项决定是否保存当前页面
      if (options.saveCurrentPage !== false) {
        upsertCachedPage(page);
      }
      
      // 根据选项决定是否清空历史记录
      if (options.clearHistory !== false) {
        setHistory([]);
        setFuture([]);
      }
      
      // 切换到目标页面
      setPage(targetPage);
      setSelectedId(null);
      setSelectedPageId(targetPage.id);
      
      // 根据选项决定是否更新URL
      if (options.updateUrl !== false) {
        setParams({ id: targetPage.id }, { replace: true });
      }
      
      // 发布页面切换事件
      bus.publish(EVENT_TOPICS.PAGE_CHANGED, { pageId: targetPage.id, page: targetPage });
    };

    // 订阅导航事件
    const unsubscribe = bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, handleNavigateToPage);
    
    return unsubscribe;
  }, [page, setParams]);

  // 更新页面列表的函数
  const refreshPagesList = () => {
    setAllPages(getCachedPages());
  };

  // 分组管理函数
  const handleGroupCreate = async (name: string, description: string, color: string) => {
    const newGroup: PageGroup = {
      id: generateUUID(),
      name,
      description,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await upsertPageGroup(newGroup);
    const groups = loadPageGroups();
    setPageGroups(groups);
    setGroupDialog(false);
    setGroupName("");
    setGroupDescription("");
    setGroupColor("#3b82f6");
  };

  const handleGroupEdit = async (groupId: string, name: string, description: string, color: string) => {
    const group = getPageGroup(groupId);
    if (group) {
      const updatedGroup: PageGroup = {
        ...group,
        name,
        description,
        color,
        updatedAt: Date.now()
      };
      await upsertPageGroup(updatedGroup);
      const groups = loadPageGroups();
      setPageGroups(groups);
      setGroupDialog(false);
      setEditingGroup(null);
      setGroupName("");
      setGroupDescription("");
      setGroupColor("#3b82f6");
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    if (confirm("确定要删除这个分组吗？分组中的页面将移动到未分组。")) {
      // 将分组中的页面移动到未分组
      const pages = getCachedPages();
      const groupPages = pages.filter(p => p.groupId === groupId);
      for (const page of groupPages) {
        const updatedPage = { ...page, groupId: undefined, updatedAt: Date.now() };
        await upsertCachedPage(updatedPage);
      }
      
      await deletePageGroup(groupId);
      const groups = loadPageGroups();
      setPageGroups(groups);
      refreshPagesList();
    }
  };

  const handlePageMoveToGroup = async (pageId: string, groupId: string | null) => {
    const page = getCachedPages().find(p => p.id === pageId);
    if (page) {
      const updatedPage = { ...page, groupId: groupId || undefined, updatedAt: Date.now() };
      await upsertCachedPage(updatedPage);
      refreshPagesList();
    }
  };

  // 页面预加载函数
  const preloadPage = (pageId: string) => {
    // 如果页面还没有在缓存中，预加载它
    if (!getCachedPage(pageId)) {
      const pageData = getPage(pageId);
      if (pageData) {
        upsertCachedPage(pageData);
      }
    }
  };

  // 删除页面函数
  const deleteSelectedPage = useCallback(async () => {
    if (!selectedPageId) return;
    
    const pageToDelete = allPages.find(p => p.id === selectedPageId);
    if (!pageToDelete) return;
    
    if (confirm(`确定要删除页面"${pageToDelete.name}"吗？`)) {
      await deleteCachedPage(selectedPageId);
      const remainingPages = getCachedPages();
      
      // 如果删除的是当前页面，需要切换到其他页面
      if (selectedPageId === page.id) {
        if (remainingPages.length > 0) {
          switchToPage(remainingPages[0]);
        } else {
          const newPage = createPage("新页面", "content");
          await upsertCachedPage(newPage);
          switchToPage(newPage);
        }
      }
      
      // 清空选中状态
      setSelectedPageId(null);
      // 刷新页面列表
      refreshPagesList();
    }
  }, [selectedPageId, allPages, page.id]);

  // 清空所有页面函数（保留默认示例页面）
  const clearAllPages = useCallback(async () => {
    // 按创建时间排序，保留最早创建的4个页面（默认页面）
    const sortedPages = [...allPages].sort((a, b) => a.createdAt - b.createdAt);
    const defaultPages = sortedPages.slice(0, 4);
    const pagesToDelete = sortedPages.slice(4);
    
    if (pagesToDelete.length === 0) {
      alert("没有可清空的页面，只有默认示例页面。");
      return;
    }
    
    if (confirm(`确定要清空所有新增页面吗？这将删除 ${pagesToDelete.length} 个页面，但保留以下默认页面：\n${defaultPages.map(p => p.name).join('\n')}`)) {
      // 删除所有新增页面
      for (const pageToDelete of pagesToDelete) {
        await deleteCachedPage(pageToDelete.id);
      }
      
      const remainingPages = getCachedPages();
      
      // 如果当前页面被删除了，切换到第一个剩余页面
      if (pagesToDelete.some(p => p.id === page.id)) {
        if (remainingPages.length > 0) {
          switchToPage(remainingPages[0]);
        } else {
          // 如果没有剩余页面，创建一个新页面
          const newPage = createPage("新页面", "content");
          await upsertCachedPage(newPage);
          switchToPage(newPage);
        }
      }
      
      // 清空选中状态
      setSelectedPageId(null);
      // 刷新页面列表
      refreshPagesList();
    }
  }, [allPages, page.id]);

  const selected = useMemo<NodeMeta | null>(() => {
    const find = (n: NodeMeta): NodeMeta | null => {
      if (n.id === selectedId) return n;
      for (const c of n.children ?? []) {
        const r = find(c);
        if (r) return r;
      }
      return null;
    };
    return selectedId ? find(page.root) : null;
  }, [selectedId, page]);

  const updateNode = (node: NodeMeta) => {
    const rec = (n: NodeMeta): NodeMeta => (n.id === node.id ? node : { ...n, children: n.children?.map(rec) });
    commit({ ...page, root: rec(page.root), updatedAt: Date.now() });
  };

  // 分栏大小变化回调
  const onPanelSizeChange = (nodeId: string, sizes: number[]) => {
    const updateNodePanelSizes = (n: NodeMeta): NodeMeta => {
      if (n.id === nodeId) {
        return { ...n, panelSizes: sizes };
      }
      return { ...n, children: n.children?.map(updateNodePanelSizes) };
    };
    const updatedRoot = updateNodePanelSizes(page.root);
    commit({ ...page, root: updatedRoot, updatedAt: Date.now() });
  };

  // 保存自建组件
  const saveAsCustomComponent = () => {
    if (!selected || !componentName.trim()) return;
    
    const customComponent: CustomComponent = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: componentName.trim(),
      description: componentDescription.trim() || undefined,
      component: JSON.parse(JSON.stringify(selected)), // 深拷贝
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    upsertCustomComponent(customComponent);
    
    // 刷新自建组件列表
    setCustomComponents(loadCustomComponents());
    
    // 重置对话框状态
    setSaveComponentDialog(false);
    setComponentName("");
    setComponentDescription("");
    
    console.log('自建组件已保存:', customComponent);
  };

  // 打开保存组件对话框
  const openSaveComponentDialog = () => {
    if (!selected) return;
    setComponentName(selected.type === "Container" ? "自定义容器" : `自定义${selected.type}`);
    setComponentDescription("");
    setSaveComponentDialog(true);
  };

  // 打开编辑组件对话框
  const openEditComponentDialog = (component: CustomComponent) => {
    setEditingComponent(component);
    setEditComponentName(component.name);
    setEditComponentDescription(component.description || "");
    setEditComponentDialog(true);
  };

  // 删除自建组件
  const deleteCustomComponent = (componentId: string) => {
    console.log('删除自建组件被调用:', componentId);
    // 直接删除，不使用confirm对话框
    try {
      console.log('开始删除组件:', componentId);
      // 使用storage.ts中的删除函数
      deleteCustomComponentFromStorage(componentId);
      console.log('删除成功，更新状态');
      // 更新状态
      setCustomComponents(loadCustomComponents());
      console.log('状态更新完成');
    } catch (error) {
      console.error('删除组件时出错:', error);
    }
  };

  // 为当前页面添加默认间距配置
  const addDefaultSpacingToCurrentPage = () => {
    try {
      const migratedPage = migratePageSpacing(page);
      commit(migratedPage);
      console.log('已为当前页面添加默认间距配置');
    } catch (error) {
      console.error('添加默认间距配置时出错:', error);
    }
  };

  // 更新自建组件
  const updateCustomComponent = async () => {
    if (!editingComponent) return;
    
    const updatedComponent = {
      ...editingComponent,
      name: editComponentName,
      description: editComponentDescription,
      updatedAt: Date.now()
    };
    
    await upsertCustomComponent(updatedComponent);
    setCustomComponents(loadCustomComponents());
    setEditComponentDialog(false);
    setEditingComponent(null);
  };

  const findParent = (root: NodeMeta, id: string): { parent: NodeMeta | null; index: number } => {
    for (const [idx, child] of (root.children ?? []).entries()) {
      if (child.id === id) return { parent: root, index: idx };
      const r = findParent(child, id);
      if (r.parent) return r;
    }
    return { parent: null, index: -1 };
  };

  const deleteNode = (id: string) => {
    if (page.root.id === id) return;
    const info = findParent(page.root, id);
    const parent = info.parent;
    if (!parent) return;
    parent.children = [...(parent.children ?? [])];
    parent.children.splice(info.index, 1);
    commit({ ...page, updatedAt: Date.now() });
    setSelectedId(null);
  };

  const cloneNode = (n: NodeMeta): NodeMeta => ({
    ...n,
    id: generateUUID(),
    children: n.children?.map(cloneNode) ?? [],
  });

  const onCopy = (n: NodeMeta) => setClipboard(cloneNode(n));
  const onPaste = () => {
    if (!clipboard) return;
    const nearestContainer = (startId: string | null): NodeMeta => {
      const walk = (root: NodeMeta, id: string): { node: NodeMeta | null; parent: NodeMeta | null } => {
        if (root.id === id) return { node: root, parent: null };
        for (const c of root.children ?? []) {
          if (c.id === id) return { node: c, parent: root };
          const r = walk(c, id);
          if (r.node) return r;
        }
        return { node: null, parent: null };
      };
      if (!startId) return page.root;
      const { node, parent } = walk(page.root, startId);
      if (node?.type === "Container") return node;
      if (parent?.type === "Container") return parent;
      return page.root;
    };
    const target = nearestContainer(selectedId);
    target.children = [...(target.children ?? []), cloneNode(clipboard)];
    commit({ ...page, updatedAt: Date.now() });
  };

  // 右键菜单回调函数
  const handleContextCopy = (nodeId: string) => {
    const findNode = (n: NodeMeta, id: string): NodeMeta | null => {
      if (n.id === id) return n;
      for (const c of n.children ?? []) {
        const r = findNode(c, id);
        if (r) return r;
      }
      return null;
    };
    const node = findNode(page.root, nodeId);
    if (node) {
      setClipboard(cloneNode(node));
    }
  };

  const handleContextPaste = (parentId: string) => {
    if (!clipboard) return;
    const findNode = (n: NodeMeta, id: string): NodeMeta | null => {
      if (n.id === id) return n;
      for (const c of n.children ?? []) {
        const r = findNode(c, id);
        if (r) return r;
      }
      return null;
    };
    const parent = findNode(page.root, parentId);
    if (parent && (parent.type === "Container" || ["Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"].includes(parent.type))) {
      parent.children = [...(parent.children ?? []), cloneNode(clipboard)];
      commit({ ...page, updatedAt: Date.now() });
    }
  };

  const handleContextDelete = (nodeId: string) => {
    deleteNode(nodeId);
  };

  const handleContextDuplicate = (nodeId: string) => {
    const findNode = (n: NodeMeta, id: string): NodeMeta | null => {
      if (n.id === id) return n;
      for (const c of n.children ?? []) {
        const r = findNode(c, id);
        if (r) return r;
      }
      return null;
    };
    const node = findNode(page.root, nodeId);
    if (node) {
      // 只有容器和卡片类型的组件才能另存为自建组件
      const allowedTypes = ["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"];
      if (allowedTypes.includes(node.type)) {
        // 直接为指定节点打开保存组件对话框
        setComponentName(node.type === "Container" ? "自定义容器" : `自定义${node.type}`);
        setComponentDescription("");
        // 临时设置选中状态以便保存函数使用
        setSelectedId(nodeId);
        setSaveComponentDialog(true);
      }
    }
  };

  const addChild = (container: NodeMeta, layout: "row" | "col") => {
    if (container.type !== "Container") return;
    container.children = [...(container.children ?? []), createNode("Container", { layout })];
    commit({ ...page, updatedAt: Date.now() });
  };

  const insertSibling = (targetId: string, dir: "left" | "right" | "top" | "bottom") => {
    const info = findParent(page.root, targetId);
    const parent = info.parent ?? page.root;
    const idx = info.index >= 0 ? info.index : 0;
    const insertIndex = dir === "left" || dir === "top" ? idx : idx + 1;
    const newNode = createNode("Container", { layout: parent.layout ?? "col" });
    parent.children = parent.children ?? [];
    parent.children.splice(insertIndex, 0, newNode);
    commit({ ...page, updatedAt: Date.now() });
  };

  const moveBeforeAfter = (dragId: string, targetId: string, pos: "before" | "after") => {
    if (dragId === targetId) return;
    const dragInfo = findParent(page.root, dragId);
    const targetInfo = findParent(page.root, targetId);
    const dragParent = dragInfo.parent ?? page.root;
    const targetParent = targetInfo.parent ?? page.root;
    if (!dragParent || !targetParent) return;
    const [dragNode] = dragParent.children!.splice(dragInfo.index, 1);
    const baseIndex = targetParent.children!.findIndex((c) => c.id === targetId);
    const insertIndex = pos === "before" ? baseIndex : baseIndex + 1;
    targetParent.children!.splice(insertIndex, 0, dragNode);
    commit({ ...page, updatedAt: Date.now() });
  };

  const moveAsChild = (dragId: string, parentId: string) => {
    if (dragId === parentId) return;
    const findNode = (n: NodeMeta, id: string): NodeMeta | null => {
      if (n.id === id) return n;
      for (const c of n.children ?? []) {
        const r = findNode(c, id);
        if (r) return r;
      }
      return null;
    };
    const dragNodeSnapshot = findNode(page.root, dragId);
    const contains = (root: NodeMeta | null, id: string): boolean => {
      if (!root) return false;
      if (root.id === id) return true;
      return (root.children ?? []).some((c) => contains(c, id));
    };
    if (contains(dragNodeSnapshot, parentId)) return; // prevent moving into its own descendant

    // Work on a cloned tree to avoid accidental mutations ordering issues
    const cloneDeep = (n: NodeMeta): NodeMeta => ({ ...n, children: (n.children ?? []).map(cloneDeep) });
    const rootCopy = cloneDeep(page.root);

    const findParentIn = (root: NodeMeta, id: string): { parent: NodeMeta | null; index: number } => {
      for (const [idx, child] of (root.children ?? []).entries()) {
        if (child.id === id) return { parent: root, index: idx };
        const r = findParentIn(child, id);
        if (r.parent) return r;
      }
      return { parent: null, index: -1 };
    };

    const dragInfo = findParentIn(rootCopy, dragId);
    const dragParent = dragInfo.parent ?? rootCopy;
    if (!dragParent || dragInfo.index < 0) return;
    const [dragNode] = dragParent.children!.splice(dragInfo.index, 1);

    const target = findNode(rootCopy, parentId);
    if (!target) return;
    target.children = [...(target.children ?? []), dragNode];

    commit({ ...page, root: rootCopy, updatedAt: Date.now() });
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [page, ...f]);
      setPage(prev);
      return h.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, page]);
      setPage(next);
      return rest;
    });
  };

  // 加载分组数据
  useEffect(() => {
    const groups = loadPageGroups();
    setPageGroups(groups);
  }, []);

  // keyboard shortcuts (global except paste)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 检查是否在设计区域（中间面板）
      const target = e.target as HTMLElement;
      const designArea = target.closest('.grid.h-\\[calc\\(100vh-4rem\\)\\].grid-cols-\\[260px_1fr_300px\\] > div:nth-child(2)');
      
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && selected && designArea) {
        e.preventDefault();
        onCopy(selected);
      }
      if (e.key === "Delete" && selectedId && designArea) {
        e.preventDefault();
        deleteNode(selectedId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y")) {
        e.preventDefault();
        redo();
      }
      if (e.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && designArea) {
        e.preventDefault();
        const map: Record<string, "left" | "right" | "top" | "bottom"> = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowUp: "top",
          ArrowDown: "bottom",
        };
        if (selectedId) insertSibling(selectedId, map[e.key]);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selected, clipboard, page]);

  // 设计面板专用的键盘事件监听（包含粘贴功能）
  const handleDesignPanelKeyDown = (e: React.KeyboardEvent) => {
    // 检查是否在设计画布区域
    const target = e.target as HTMLElement;
    const isInDesignCanvas = target.closest('[data-design-canvas="true"]') || 
                            target.closest('.flex-1.min-h-0') || 
                            e.currentTarget.contains(target);
    
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v" && isInDesignCanvas) {
      e.preventDefault();
      onPaste();
    }
  };

  const goRun = () => {
    // 确保页面数据已保存到localStorage
    upsertPage(page);
    // 使用SPA内的预览路由，避免整页刷新
    const previewUrl = `${window.location.origin}/preview/${page.id}`;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const libItems = [
    { key: "Container", label: "容器" },
    { key: "Button", label: "按钮" },
    { key: "Badge", label: "徽章" },
    { key: "Input", label: "输入框" },
    { key: "NumberInput", label: "数字输入框" },
    { key: "Textarea", label: "多行输入" },
    { key: "RichTextEditor", label: "富文本编辑器" },
    { key: "DatePicker", label: "日期选择器" },
    { key: "Switch", label: "开关" },
    { key: "Slider", label: "滑块" },
    { key: "Select", label: "下拉选择" },
    { key: "MultiSelect", label: "多选" },
    { key: "Lookup", label: "查找" },
    { key: "Separator", label: "分割线" },
    { key: "Avatar", label: "头像" },
    { key: "Progress", label: "进度条" },
    { key: "Link", label: "链接" },
    { key: "Image", label: "图片" },
    { key: "Upload", label: "文件上传" },
    { key: "Skeleton", label: "骨架屏" },
    { key: "Tooltip", label: "气泡提示" },
    { key: "Popover", label: "弹出层" },
    { key: "Dialog", label: "对话框" },
    { key: "Alert", label: "警告提示" },
    { key: "Card", label: "卡片" },
    { key: "Table", label: "表格" },
    { key: "EditableTable", label: "可编辑表格" },
    { key: "Listener", label: "事件监听器" },
    { key: "PageTab", label: "页面标签" },
    { key: "NestedPageContainer", label: "嵌套页面容器" },
  ];

  // 组件图标映射 (FontAwesome风格)
  const componentIcons: Record<string, string> = {
    // 布局组件
    Container: "fas fa-box",
    Separator: "fas fa-minus",
    Card: "fas fa-id-card",
    CollapsibleCard: "fas fa-id-card-alt",
    ActionCard: "fas fa-credit-card",
    InfoCard: "fas fa-info-circle",
    StatsCard: "fas fa-chart-bar",
    
    // 表单组件
    Button: "fas fa-hand-pointer",
    Input: "fas fa-edit",
    NumberInput: "fas fa-calculator",
    Textarea: "fas fa-align-left",
    RichTextEditor: "fas fa-font",
    DatePicker: "fas fa-calendar",
    Switch: "fas fa-toggle-on",
    Slider: "fas fa-sliders-h",
    Select: "fas fa-list",
    MultiSelect: "fas fa-list-ul",
    Lookup: "fas fa-search",
    Command: "fas fa-terminal",
    Link: "fas fa-link",
    Image: "fas fa-image",
    Upload: "fas fa-upload",
    
    // 展示组件
    Badge: "fas fa-tag",
    Avatar: "fas fa-user-circle",
    Progress: "fas fa-chart-line",
    Skeleton: "fas fa-spinner",
    Table: "fas fa-table",
    EditableTable: "fas fa-edit",
    Alert: "fas fa-exclamation-triangle",
    
    // 交互组件
    Tooltip: "fas fa-comment",
    Popover: "fas fa-comment-dots",
    Dialog: "fas fa-window-maximize",
    HoverCard: "fas fa-address-card",
    Drawer: "fas fa-bars",
    Sheet: "fas fa-file-alt",
    
    // 导航组件
    NavigationControls: "fas fa-arrows-alt-h",
    Tabs: "fas fa-folder-open",
    Accordion: "fas fa-chevron-down",
    Collapsible: "fas fa-compress",
    
    // 数据组件
    Transfer: "fas fa-exchange-alt",
    Iframe: "fas fa-external-link-alt",
    Tree: "fas fa-sitemap",
    
    // 功能组件
    Listener: "fas fa-headphones",
  };

  const layoutTemplates = {
    "内容布局": [
      { template: "content", label: "内容布局", description: "简洁的内容展示布局" },
      { template: "vscode", label: "VSCode布局", description: "类似VSCode的编辑器布局" },
      { template: "landing", label: "首页布局", description: "首页上下布局" },
    ],
    "栅格布局": [
      { template: "grid", label: "栅格布局", description: "灵活的12列栅格系统" },
      { template: "dashboard", label: "仪表板布局", description: "响应式仪表板栅格布局" },
    ],
    "应用布局": [
      { template: "email", label: "邮件布局", description: "左右分栏的邮件应用布局" },
      { template: "home", label: "主页布局", description: "带顶部Banner的主页布局" },
      { template: "admin", label: "管理后台", description: "带侧边栏的管理后台布局" },
      { template: "scada2d", label: "SCADA 2D建模", description: "包含2D组态画布、浮窗容器、温度/电压/进度/安灯告警示例" },
    ],
    "工艺模板": [
      { template: "scada-engine-assembly", label: "发动机装配车间", description: "缸体/曲轴/冷试等装配工艺看板" },
      { template: "scada-auto-assembly", label: "汽车装配车间", description: "内饰/底盘/路试与AGV配送流程" },
      { template: "scada-casting", label: "铸造车间", description: "熔炼-压铸-冷却全流程监控" },
      { template: "scada-machining", label: "机加车间", description: "切削机群、刀具寿命、压检与追溯" },
    ],
  };

  const componentGroups = {
    "布局组件": [
      { key: "Container", label: "容器" },
      { key: "Grid", label: "栅格容器" },
      { key: "GridItem", label: "栅格项" },
      { key: "NestedPageContainer", label: "嵌套页面容器" },
      { key: "Separator", label: "分割线" },
      { key: "Card", label: "基础卡片" },
      { key: "CollapsibleCard", label: "可收缩卡片" },
      { key: "ActionCard", label: "操作卡片" },
      { key: "InfoCard", label: "信息卡片" },
      { key: "StatsCard", label: "统计卡片" },
    ],
    "表单组件": [
      { key: "Label", label: "标签" },
      { key: "Button", label: "按钮" },
      { key: "Input", label: "输入框" },
      { key: "NumberInput", label: "数字输入框" },
      { key: "Textarea", label: "多行输入" },
      { key: "RichTextEditor", label: "富文本编辑器" },
      { key: "DatePicker", label: "日期选择器" },
      { key: "DateRangePicker", label: "日期区间选择器" },
      { key: "Switch", label: "开关" },
      { key: "Slider", label: "滑块" },
      { key: "Select", label: "选择器" },
      { key: "MultiSelect", label: "多选" },
      { key: "Lookup", label: "查找" },
      { key: "Command", label: "命令面板" },
    ],
    "展示组件": [
      { key: "Badge", label: "徽章" },
      { key: "Avatar", label: "头像" },
      { key: "Progress", label: "进度条" },
      { key: "Link", label: "链接" },
      { key: "Image", label: "图片" },
      { key: "Skeleton", label: "骨架屏" },
      { key: "Table", label: "表格" },
      { key: "EditableTable", label: "可编辑表格" },
      { key: "Alert", label: "警告提示" },
    ],
    "交互组件": [
      { key: "Tooltip", label: "气泡提示" },
      { key: "Popover", label: "弹出层" },
      { key: "Dialog", label: "对话框" },
      { key: "HoverCard", label: "悬浮卡片" },
      { key: "Drawer", label: "抽屉" },
      { key: "Sheet", label: "侧边栏" },
    ],
    "导航组件": [
      { key: "Header", label: "页面头部" },
      { key: "NavigationControls", label: "导航控制器" },
      { key: "Tabs", label: "标签页" },
      { key: "Accordion", label: "手风琴" },
      { key: "Collapsible", label: "折叠面板" },
    ],
    "数据组件": [
      { key: "Transfer", label: "穿梭框" },
      { key: "Upload", label: "文件上传" },
      { key: "Iframe", label: "内嵌框架" },
      { key: "Tree", label: "树形组件" },
    ],
    "功能组件": [
      { key: "Listener", label: "事件监听器" },
    ],
  };

  const collectExisting = (root: NodeMeta): { key: string; label: string }[] => {
    const out: { key: string; label: string }[] = [];
    const walk = (n: NodeMeta) => {
      out.push({ key: n.id, label: `${n.type} · ${n.id.slice(0, 6)}` });
      n.children?.forEach(walk);
    };
    walk(root);
    return out;
  };

  // 过滤组件分组
  const filteredComponentGroups = useMemo(() => {
    if (!componentSearchTerm.trim()) {
      return componentGroups;
    }
    
    const searchTerm = componentSearchTerm.toLowerCase();
    const filtered: typeof componentGroups = {
      "布局组件": [],
      "表单组件": [],
      "展示组件": [],
      "交互组件": [],
      "导航组件": [],
      "数据组件": [],
      "功能组件": []
    };
    
    Object.entries(componentGroups).forEach(([groupName, components]) => {
      const filteredComponents = components.filter(component => 
        component.label.toLowerCase().includes(searchTerm) ||
        component.key.toLowerCase().includes(searchTerm)
      );
      
      if (filteredComponents.length > 0) {
        filtered[groupName as keyof typeof componentGroups] = filteredComponents;
      }
    });
    
    return filtered;
  }, [componentSearchTerm]);

  // 过滤自建组件
  const filteredCustomComponents = useMemo(() => {
    if (!componentSearchTerm.trim()) {
      return customComponents;
    }
    
    const searchTerm = componentSearchTerm.toLowerCase();
    return customComponents.filter(component => 
      component.name.toLowerCase().includes(searchTerm) ||
      (component.description && component.description.toLowerCase().includes(searchTerm))
    );
  }, [customComponents, componentSearchTerm]);

  // 根据搜索结果自动展开手风琴
  useEffect(() => {
    if (componentSearchTerm.trim()) {
      const expandedItems: string[] = [];
      
      // 检查自建组件是否有结果
      if (filteredCustomComponents.length > 0) {
        expandedItems.push("自建组件");
      }
      
      // 检查各个组件分类是否有结果
      Object.entries(filteredComponentGroups).forEach(([groupName, components]) => {
        if (components.length > 0) {
          expandedItems.push(groupName);
        }
      });
      
      setAccordionValue(expandedItems);
    } else {
      setAccordionValue([]);
    }
  }, [componentSearchTerm, filteredCustomComponents, filteredComponentGroups]);

  const addByKey = (key: string) => {
    const nearestContainer = (start: NodeMeta | null): NodeMeta => {
      if (!start) return page.root;
      const findParent = (root: NodeMeta, id: string): NodeMeta | null => {
        for (const c of root.children ?? []) {
          if (c.id === id) return root;
          const r = findParent(c, id);
          if (r) return r;
        }
        return null;
      };
      if (start.type === "Container") return start;
      const p = findParent(page.root, start.id);
      return p?.type === "Container" ? p : page.root;
    };
    const container = nearestContainer(selected);
    const type = libItems.find((i) => i.key === key)?.key as any;
    if (type) {
      container.children = [...(container.children ?? []), createNode(type)];
      commit({ ...page, updatedAt: Date.now() });
      return;
    }
    // otherwise treat key as existing node id: clone and add
    const find = (n: NodeMeta): NodeMeta | null => {
      if (n.id === key) return n;
      for (const c of n.children ?? []) {
        const r = find(c);
        if (r) return r;
      }
      return null;
    };
    const node = find(page.root);
    if (node) {
      const clone = (() => ({ ...node, id: generateUUID(), children: node.children?.map((c) => ({ ...c, id: generateUUID() })) ?? [] }))();
      (container.children = container.children ?? []).push(clone as any);
      commit({ ...page, updatedAt: Date.now() });
    }
  };

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-[260px_1fr_300px]">
      <div className="border-r h-full flex flex-col ">
        <Tabs defaultValue="pages" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="pages">页面</TabsTrigger>
            <TabsTrigger value="layouts">布局</TabsTrigger>
            <TabsTrigger value="components">组件库</TabsTrigger>
            <TabsTrigger value="scada">组态库</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pages" className="mt-3 relative flex-1 min-h-0 ml-3" >
            <div className="absolute inset-0 flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex gap-2">
                  <div className="flex border rounded-md">
                     <Button
                      size="sm"
                      variant={pageViewMode === "tree" ? "default" : "ghost"}
                      className="rounded-r-none"
                      onClick={() => setPageViewMode("tree")}
                    >
                      <ListTree className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={pageViewMode === "list" ? "default" : "ghost"}
                      className="rounded-l-none border-r"
                      onClick={() => setPageViewMode("list")}
                    >
                      <List className="h-3 w-3" />
                    </Button>
                  
                  </div>
                  <Button
                     size="sm"
                     onClick={async () => {
                       const newPage = createPage("新页面", "content");
                       await upsertCachedPage(newPage);
                       refreshPagesList();
                       switchToPage(newPage);
                     }}
                   >
                    新建
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearAllPages}
                  >
                    清空所有
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--muted-foreground) / 0.5) hsl(var(--muted))' }}>
                <div className="space-y-2">
                  {pageViewMode === "list" ? (
                  // 列表视图
                  <>
                    {allPages.map((p) => (
                      <ContextMenu key={p.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            tabIndex={0}
                            className={`group flex flex-col gap-1 rounded border p-2 text-xs cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              p.id === page.id ? 'bg-primary/10 border-primary' : 
                              selectedPageId === p.id ? 'bg-accent border-accent-foreground' : 'hover:bg-accent'
                            } ${listDragOverId === p.id ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => {
                              setSelectedPageId(p.id);
                              switchToPage(p);
                            }}
                            onFocus={() => setSelectedPageId(p.id)}
                            onMouseEnter={() => preloadPage(p.id)}
                            draggable
                            onDragStart={(e) => {
                              setListDraggingId(p.id);
                              try { e.dataTransfer.setData('text/plain', p.id); } catch {}
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setListDragOverId(p.id);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleListDropReorder(p.id);
                            }}
                            onDragEnd={() => {
                              setListDragOverId(null);
                              setListDraggingId(null);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium truncate flex-1">{p.name}</div>
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={async (e) => {
                                     e.stopPropagation();
                                     const newPage = { ...p, id: generateUUID(), name: `${p.name} 副本`, createdAt: Date.now(), updatedAt: Date.now() };
                                     await upsertCachedPage(newPage);
                                     refreshPagesList();
                                     switchToPage(newPage);
                                   }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`确定要删除页面"${p.name}"吗？`)) {
                                      await deleteCachedPage(p.id);
                                      const remainingPages = getCachedPages();
                                      
                                      // 如果删除的是当前页面，需要切换到其他页面
                                      if (p.id === page.id) {
                                        if (remainingPages.length > 0) {
                                          switchToPage(remainingPages[0]);
                                        } else {
                                          const newPage = createPage("新页面", "content");
                                          await upsertCachedPage(newPage);
                                          switchToPage(newPage);
                                        }
                                      }
                                      
                                      // 刷新页面列表
                                      refreshPagesList();
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="text-xs">{p.template}</span>
                              <span className="text-xs">{new Date(p.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={async () => {
                              const newPage = { ...p, id: generateUUID(), name: `${p.name} 副本`, createdAt: Date.now(), updatedAt: Date.now() };
                              await upsertCachedPage(newPage);
                              refreshPagesList();
                              switchToPage(newPage);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            复制页面
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(p.id);
                                // 可以添加toast提示
                              } catch (err) {
                                console.error('复制页面ID失败:', err);
                              }
                            }}
                          >
                            <Hash className="mr-2 h-4 w-4" />
                            复制页面ID
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={async () => {
                              if (confirm(`确定要删除页面"${p.name}"吗？`)) {
                                await deleteCachedPage(p.id);
                                const remainingPages = getCachedPages();
                                
                                // 如果删除的是当前页面，需要切换到其他页面
                                if (p.id === page.id) {
                                  if (remainingPages.length > 0) {
                                    switchToPage(remainingPages[0]);
                                  } else {
                                    const newPage = createPage("新页面", "content");
                                    await upsertCachedPage(newPage);
                                    switchToPage(newPage);
                                  }
                                }
                                
                                // 刷新页面列表
                                refreshPagesList();
                              }
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            删除页面
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                    
                    {loadPages().length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <div className="text-sm">暂无页面</div>
                        <div className="text-xs mt-1">点击"新建"创建第一个页面</div>
                      </div>
                    )}
                  </>
                ) : (
                  // 树视图
                  <ErrorBoundary>
                  <PageTreeView
                    pages={allPages}
                    groups={pageGroups}
                    currentPageId={page.id}
                    selectedPageId={selectedPageId}
                    onPageSelect={(p) => {
                      setSelectedPageId(p.id);
                      switchToPage(p);
                    }}
                    onPageFocus={(pageId) => setSelectedPageId(pageId)}
                    onPagePreload={(pageId) => preloadPage(pageId)}
                    onPageCopy={async (p) => {
                      const newPage = { ...p, id: generateUUID(), name: `${p.name} 副本`, createdAt: Date.now(), updatedAt: Date.now() };
                      await upsertCachedPage(newPage);
                      refreshPagesList();
                      switchToPage(newPage);
                    }}
                    onPageDelete={async (p) => {
                      await deleteCachedPage(p.id);
                      const remainingPages = getCachedPages();
                      
                      // 如果删除的是当前页面，需要切换到其他页面
                      if (p.id === page.id) {
                        if (remainingPages.length > 0) {
                          switchToPage(remainingPages[0]);
                        } else {
                          const newPage = createPage("新页面", "content");
                          await upsertCachedPage(newPage);
                          switchToPage(newPage);
                        }
                      }
                      
                      // 刷新页面列表
                      refreshPagesList();
                    }}
                    onGroupCreate={() => {
                      setEditingGroup(null);
                      setGroupName("");
                      setGroupDescription("");
                      setGroupColor("#3b82f6");
                      setGroupDialog(true);
                    }}
                    onGroupEdit={(group) => {
                      setEditingGroup(group);
                      setGroupName(group.name);
                      setGroupDescription(group.description || "");
                      setGroupColor(group.color || "#3b82f6");
                      setGroupDialog(true);
                    }}
                    onGroupDelete={(group) => handleGroupDelete(group.id)}
                    onPageMoveToGroup={(page, groupId) => handlePageMoveToGroup(page.id, groupId)}
                    onPageCreateInGroup={async (groupId) => {
                      const newPage = createPage("新页面", "content");
                      newPage.groupId = groupId;
                      await upsertCachedPage(newPage);
                      switchToPage(newPage);
                    }}
                    onGroupReorderPages={(groupId, orderedIds) => {
                      // 仅对该分组内的页面重排
                      reorderCachedPages(orderedIds);
                      refreshPagesList();
                    }}
                  />
                  </ErrorBoundary>
                )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="layouts" className="mt-3 relative flex-1 min-h-0 ml-3">
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto">
              <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={setAccordionValue}>
              {Object.entries(layoutTemplates).map(([groupName, templates]) => (
                <AccordionItem key={groupName} value={groupName}>
                  <AccordionTrigger className="text-sm font-medium">
                    {groupName}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2">
                      {templates.map((template) => (
                        <Button
                          key={template.template}
                          variant="outline"
                          size="sm"
                          className="h-auto p-3 flex flex-col items-start text-left"
                          onClick={() => {
                            const newPage = createPage(`${template.label}-${loadPages().length + 1}`, template.template as TemplateKind);
                            upsertPage(newPage);
                            switchToPage(newPage);
                          }}
                        >
                          <div className="font-medium text-sm">{template.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="components" className="mt-3 relative flex-1 min-h-0 ml-3">
            <div className="absolute inset-0 flex flex-col">
              {/* 搜索输入框 */}
              <div className="mb-3">
              <Input
                placeholder="搜索组件..."
                value={componentSearchTerm}
                onChange={(e) => setComponentSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={setAccordionValue}>
              {/* 搜索结果为空提示 */}
              {componentSearchTerm.trim() && Object.keys(filteredComponentGroups).length === 0 && filteredCustomComponents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-sm">未找到匹配的组件</div>
                  <div className="text-xs mt-1">请尝试其他关键词</div>
                </div>
              )}
              
              {/* 自建组件分类 */}
              {(!componentSearchTerm.trim() || filteredCustomComponents.length > 0) && (
                <AccordionItem value="自建组件">
                <AccordionTrigger className="text-sm font-medium">
                  自建组件
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2">
                    {filteredCustomComponents.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-2 text-center">
                        {componentSearchTerm.trim() ? '未找到匹配的自建组件' : '暂无自建组件'}
                      </div>
                    ) : (
                      filteredCustomComponents.map((component) => (
                        <div
                          key={component.id}
                          className="group flex items-center rounded border p-2 text-xs hover:bg-accent gap-2"
                        >
                          <div
                            className="flex-1 flex items-center gap-2 cursor-pointer"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("application/x-custom-component", JSON.stringify(component));
                              e.dataTransfer.setData("text/plain", "custom-component");
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                          >
                            {component.thumbnail ? (
                              <img src={component.thumbnail} alt={component.name} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <i className="fas fa-puzzle-piece text-lg"></i>
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{component.name}</div>
                              {component.description && (
                                <div className="text-muted-foreground text-xs">{component.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditComponentDialog(component)}
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteCustomComponent(component.id)}
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
                </AccordionItem>
              )}
              
              {/* 原有组件分类 */}
              {Object.entries(filteredComponentGroups).map(([groupName, components]) => (
                <AccordionItem key={groupName} value={groupName}>
                  <AccordionTrigger className="text-sm font-medium">
                    {groupName}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2">
                      {components.map((item) => (
                        <div
                          key={item.key}
                          className="flex cursor-pointer items-center rounded border p-2 text-xs hover:bg-accent gap-2 "
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/x-node", JSON.stringify({ type: item.key }));
                            e.dataTransfer.setData("text/plain", "new-node");
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                        >
                          <i className={`${componentIcons[item.key] || "fas fa-cog"} text-lg`}></i>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
                </Accordion>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scada" className="mt-3 relative flex-1 min-h-0 ml-3">
            <div className="absolute inset-0 overflow-y-auto pr-2">
              <div className="mb-2 rounded border border-cyan-500/30 bg-cyan-500/5 p-2 text-xs">
                <div className="font-medium">SCADA 组态库（独立于组件库）</div>
                <div className="text-muted-foreground mt-1">已预置 three.js 依赖，可在后续将这些组态元件升级为 2D/3D 混合渲染。</div>
              </div>
              <div className="space-y-3">
                {(["物流设备", "汽车工艺设备", "能源与公用工程", "通用监控"] as const).map((category) => (
                  <div key={category}>
                    <div className="mb-1 text-[11px] font-semibold text-cyan-600">{category}</div>
                    <div className="grid gap-2">
                      {scadaStencils.filter((item) => item.category === category).map((item) => (
                        <div
                          key={item.key}
                          className="flex cursor-pointer items-center gap-2 rounded border p-2 text-xs hover:bg-accent"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/x-scada-symbol", JSON.stringify({ key: item.key }));
                            e.dataTransfer.setData("text/plain", "scada-symbol");
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                        >
                          <i className={`${item.icon} text-base text-cyan-500`}></i>
                          <div className="min-w-0">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-muted-foreground truncate">{item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <div className="bg-muted/20 flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-medium">设计态 · {page.name}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={undo} disabled={!history.length}>撤销</Button>
            <Button variant="outline" onClick={redo} disabled={!future.length}>重做</Button>
            <Button variant="destructive" disabled={!selectedId} onClick={() => selectedId && deleteNode(selectedId)}>删除</Button>
            {showPreview && (
              <Button variant="outline" onClick={() => bus.publish("dialog.open", { title: "预览弹框", content: "这是预览中的弹框" })}>预览弹框</Button>
            )}
            <Button variant="secondary" onClick={goRun}>新窗口预览</Button>
            {/* <Button variant={showPreview ? "outline" : "default"} onClick={() => setShowPreview((v) => !v)}>{showPreview ? "关闭预览" : "打开预览"}</Button> */}
          </div>
        </div>
        {showPreview ? (
          <div className="flex-1 min-h-0" onKeyDown={handleDesignPanelKeyDown} tabIndex={-1}>
            <SplitPreview
              page={page}
              selectedId={selectedId}
              commit={commit}
              insertSibling={insertSibling}
              moveBeforeAfter={moveBeforeAfter}
              moveAsChild={moveAsChild}
              setSelectedId={setSelectedId}
              onPanelSizeChange={onPanelSizeChange}
              onCopy={handleContextCopy}
              onPaste={handleContextPaste}
              onDelete={handleContextDelete}
              onDuplicate={handleContextDuplicate}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0" onKeyDown={handleDesignPanelKeyDown} tabIndex={-1}>
            <Canvas page={page} setPage={commit} select={selectedId} setSelect={setSelectedId} insertSibling={insertSibling} moveBeforeAfter={moveBeforeAfter} moveAsChild={moveAsChild} onPanelSizeChange={onPanelSizeChange} onCopy={handleContextCopy} onPaste={handleContextPaste} onDelete={handleContextDelete} onDuplicate={handleContextDuplicate} />
          </div>
        )}
      </div>
      <div className="border-l h-full flex flex-col">   
        <Tabs defaultValue="props" className="h-full flex flex-col">
          <TabsList className=" flex-shrink-0">
            <TabsTrigger value="props">属性</TabsTrigger>
            <TabsTrigger value="events">事件</TabsTrigger>
            <TabsTrigger value="page">页面</TabsTrigger>
          </TabsList>
          <TabsContent value="props" className="relative flex-1 min-h-0 ml-3">
             <div className="absolute inset-0 overflow-y-auto">
              <Inspector
              selected={selected}
              update={updateNode}
              onCopy={onCopy}
              onPaste={onPaste}
              addChild={addChild}
              parentId={selectedId ? findParent(page.root, selectedId).parent?.id ?? null : null}
              containers={useMemo(() => {
                const list: { id: string; label: string }[] = [];
                const walk = (n: NodeMeta) => {
                  if (containerTypes.includes(n.type)) list.push({ id: n.id, label: `${n.type} · ${n.id.slice(0, 6)}` });
                  n.children?.forEach(walk);
                };
                walk(page.root);
                if (selected) {
                  const exclude = new Set<string>();
                  const mark = (n: NodeMeta) => {
                    exclude.add(n.id);
                    n.children?.forEach(mark);
                  };
                  mark(selected);
                  return list.filter((c) => !exclude.has(c.id));
                }
                return list;
              }, [page, selected])}
              moveTo={(cid) => moveAsChild(selectedId!, cid)}
              autoClassHint={useMemo(() => {
                if (!selectedId) return null;
                const hints = [];
                
                // 定义findNode函数
                const findNode = (n: NodeMeta, id: string): NodeMeta | null => {
                  if (n.id === id) return n;
                  for (const c of n.children ?? []) {
                    const r = findNode(c, id);
                    if (r) return r;
                  }
                  return null;
                };
                
                // 布局相关的提示
                const p = findParent(page.root, selectedId).parent;
                if (p && p.layout === "row") {
                  hints.push("flex-1 min-w-[200px]");
                }
                
                // 间距样式提示
                const selectedNode = findNode(page.root, selectedId);
                if (selectedNode) {
                  const spacingClasses = getSpacingClasses(selectedNode.margin, selectedNode.padding);
                  if (spacingClasses) {
                    hints.push(spacingClasses);
                  }
                }
                
                return hints.length > 0 ? hints.join(" ") : null;
              }, [page, selectedId])}
              onSaveComponent={openSaveComponentDialog}
              page={page}
              updatePage={(updatedPage) => {
                setPage(updatedPage);
                commit(updatedPage);
              }}
            />
            </div>
          </TabsContent>
          <TabsContent value="events" className="relative flex-1 min-h-0 ml-3   ">
             <div className="absolute inset-0 overflow-y-auto">
              <EventsPanel
                selected={selected}
                update={updateNode}
              />
            </div>
          </TabsContent>
          <TabsContent value="page" className="relative flex-1 min-h-0 ml-3">
             <div className="absolute inset-0 overflow-y-auto">
              <div className="space-y-3">
              <label className="text-xs">页面名称</label>
              <Input value={page.name} onChange={(e) => commit({ ...page, name: e.target.value, updatedAt: Date.now() })} />
              <div className="text-xs text-muted-foreground">模板：{page.template}</div>
              
              {/* 多根节点管理 */}
              <div className="space-y-2">
                <label className="text-xs">根节点管理</label>
                <div className="text-xs text-muted-foreground">
                  当前根节点数量: {getPageRoots(page).length}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newRoot = createNode("Container", { 
                        props: { 
                          className: "min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500" 
                        }
                      });
                      const updatedPage = { ...page };
                      addPageRoot(updatedPage, newRoot);
                      commit(updatedPage);
                    }}
                  >
                    添加根节点
                  </Button>
                  {getPageRoots(page).length > 1 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const roots = getPageRoots(page);
                        if (roots.length > 1) {
                          const updatedPage = { ...page };
                          removePageRoot(updatedPage, roots[roots.length - 1].id);
                          commit(updatedPage);
                        }
                      }}
                    >
                      删除最后根节点
                    </Button>
                  )}
                </div>
                {getPageRoots(page).length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    根节点列表:
                    <ul className="ml-2 mt-1">
                      {getPageRoots(page).map((root, index) => (
                        <li key={root.id} className="flex items-center justify-between">
                          <span>#{index + 1}: {root.type} ({root.id.slice(0, 8)}...)</span>
                          {getPageRoots(page).length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                              onClick={() => {
                                const updatedPage = { ...page };
                                removePageRoot(updatedPage, root.id);
                                commit(updatedPage);
                              }}
                            >
                              ×
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* <Button variant="outline" onClick={addDefaultSpacingToCurrentPage}>
                添加默认间距
              </Button> */}


                            <Button 
                variant="outline" 
                onClick={() => {
                  console.log("📊 准备显示元数据编辑器");
                  const metadata = generatePageMetadata();
                  console.log("📋 生成的元数据:", metadata.substring(0, 200) + "...");
                  console.log("🔄 更新元数据内容，长度:", metadata.length);
                  setMetadataCode(metadata);
                  setMetadataEditorOpen(true);
                  console.log("✅ 元数据编辑器已打开");
                }}
              >
                <Code className="h-4 w-4 mr-2" />
                显示元数据
              </Button>
            </div>
          </div>
          </TabsContent>

        </Tabs>
      </div>
      <CommandK open={cmdOpen} setOpen={setCmdOpen} lib={libItems} existing={collectExisting(page.root)} onChoose={addByKey} />
      
      {/* 保存自建组件对话框 */}
      <Dialog open={saveComponentDialog} onOpenChange={setSaveComponentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为自建组件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">组件名称</label>
              <Input 
                value={componentName} 
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="请输入组件名称"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">组件描述</label>
              <Textarea 
                value={componentDescription} 
                onChange={(e) => setComponentDescription(e.target.value)}
                placeholder="请输入组件描述（可选）"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveComponentDialog(false)}>
                取消
              </Button>
              <Button onClick={saveAsCustomComponent} disabled={!componentName.trim()}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 编辑自建组件对话框 */}
      <Dialog open={editComponentDialog} onOpenChange={setEditComponentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑自建组件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">组件名称</label>
              <Input 
                value={editComponentName} 
                onChange={(e) => setEditComponentName(e.target.value)}
                placeholder="请输入组件名称"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">组件描述</label>
              <Textarea 
                value={editComponentDescription} 
                onChange={(e) => setEditComponentDescription(e.target.value)}
                placeholder="请输入组件描述（可选）"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditComponentDialog(false)}>
                取消
              </Button>
              <Button onClick={updateCustomComponent} disabled={!editComponentName.trim()}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分组管理对话框 */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "编辑分组" : "创建分组"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">分组名称</label>
              <Input 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="请输入分组名称"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">分组描述</label>
              <Textarea 
                value={groupDescription} 
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="请输入分组描述（可选）"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">分组颜色</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="color"
                  value={groupColor} 
                  onChange={(e) => setGroupColor(e.target.value)}
                  className="w-16 h-8 p-1 border rounded"
                />
                <span className="text-sm text-muted-foreground">{groupColor}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setGroupDialog(false);
                setEditingGroup(null);
                setGroupName("");
                setGroupDescription("");
                setGroupColor("#3b82f6");
              }}>
                取消
              </Button>
              <Button 
                onClick={() => {
                  if (editingGroup) {
                    handleGroupEdit(editingGroup.id, groupName, groupDescription, groupColor);
                  } else {
                    handleGroupCreate(groupName, groupDescription, groupColor);
                  }
                }} 
                disabled={!groupName.trim()}
              >
                {editingGroup ? "保存" : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 元数据显示对话框 */}
      <CodeEditorDialog
        open={metadataEditorOpen}
        onOpenChange={(open) => {
          console.log("📊 元数据编辑器状态变化:", { open, metadataLength: metadataCode.length });
          
          if (open) {
            // 只在打开时处理逻辑
            setMetadataEditorOpen(true);
            
            // 打开时，如果元数据为空或无效，立即生成
            if (!metadataCode || metadataCode.trim() === "" || metadataCode.includes('"nodes": []')) {
              console.log("🔄 元数据编辑器打开，检测到空元数据，立即生成");
              setTimeout(() => {
                // 再次检查编辑器是否仍然打开
                if (metadataEditorOpenRef.current) {
                  const metadata = generatePageMetadata();
                  console.log("📋 生成新元数据，长度:", metadata.length);
                  if (metadata && metadata.trim() !== "" && !metadata.includes('"nodes": []')) {
                    setMetadataCode(metadata);
                    console.log("✅ 元数据生成成功");
                  } else {
                    console.log("⚠️ 生成的元数据仍为空");
                  }
                } else {
                  console.log("⏰ 编辑器已关闭，取消元数据生成");
                }
              }, 50);
            } else {
              console.log("📋 元数据编辑器打开，使用现有元数据");
            }
          } else {
            // 关闭时只更新状态，不执行任何其他操作
            console.log("📋 元数据编辑器关闭，仅更新状态");
            setMetadataEditorOpen(false);
          }
        }}
        value={metadataCode}
        onChange={(value) => {
          console.log("📝 元数据编辑器内容变化:", value?.length || 0);
          setMetadataCode(value || "");
        }}
        title={
          <div className="flex items-center justify-between w-full">
            <span>页面元数据 (可编辑)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log("🔄 应用元数据更改到页面");
                  try {
                    const metadata = JSON.parse(metadataCode);
                    if (metadata && typeof metadata === 'object') {
                      // 只更新页面的特定元数据字段，保留其他重要属性
                      const updatedPage = {
                        ...page,
                        // 只更新允许的元数据字段
                        ...(metadata.name && { name: metadata.name }),
                        ...(metadata.description !== undefined && { description: metadata.description }),
                        ...(metadata.template && { template: metadata.template }),
                        ...(metadata.groupId !== undefined && { groupId: metadata.groupId }),
                        // 更新时间戳
                        updatedAt: Date.now()
                      };
                      console.log("✅ 元数据应用成功:", updatedPage);
                      commit(updatedPage);
                      setMetadataEditorOpen(false);
                    } else {
                      console.error("❌ 无效的元数据格式");
                      alert("元数据格式无效，请检查JSON格式");
                    }
                  } catch (error) {
                    console.error("❌ 元数据解析失败:", error);
                    alert("元数据解析失败，请检查JSON语法");
                  }
                }}
              >
                应用更改
              </Button>
              <span className="text-sm text-muted-foreground">
                {doubleClickEditEnabled ? "🔓 双击编辑已启用" : "🔒 双击编辑已锁定"}
              </span>
              <Switch
                checked={doubleClickEditEnabled}
                onCheckedChange={setDoubleClickEditEnabled}
                aria-label="切换双击编辑功能"
              />
            </div>
          </div>
        }
        language="json"
        readOnly={false}
        onMount={(editor) => {
          console.log("🔧 元数据编辑器已挂载，开始监听双击事件");
          
          // 获取编辑器的 DOM 容器
          const editorContainer = editor.getDomNode();
          console.log("📦 编辑器容器:", editorContainer);
          
          if (editorContainer) {
            // 使用 DOM 事件监听双击
            editorContainer.addEventListener('dblclick', (e: MouseEvent) => {
              console.log("✅ 检测到双击事件", e);
              
              // 检查双击编辑功能是否启用
              if (!doubleClickEditEnabled) {
                console.log("🔒 双击编辑功能已锁定，忽略双击事件");
                return;
              }
              
              // 获取当前光标位置
              const position = editor.getPosition();
              console.log("📍 当前光标位置:", position);
              
              if (position) {
                const model = editor.getModel();
                if (model) {
                  const lineContent = model.getLineContent(position.lineNumber);
                  console.log("📝 当前行内容:", lineContent);
                  
                  // 检查是否双击了特定字段的值
                  const fullText = model.getValue();
                  console.log("📄 完整文本长度:", fullText.length);
                  
                  // 检查是否双击了元数据相关的区域
                  const currentOffset = model.getOffsetAt(position);
                  
                  // 首先检查是否在页面根级别的元数据区域
                  const metadataPatterns = [
                    /"metadata":\s*{[^}]*}/g,
                    /"title":\s*"[^"]*"/g,
                    /"description":\s*"[^"]*"/g,
                    /"keywords":\s*\[[^\]]*\]/g,
                    /"author":\s*"[^"]*"/g
                  ];
                  
                  let isMetadataArea = false;
                  for (const pattern of metadataPatterns) {
                    pattern.lastIndex = 0;
                    let match;
                    while ((match = pattern.exec(fullText)) !== null) {
                      const matchStart = match.index;
                      const matchEnd = match.index + match[0].length;
                      
                      if (currentOffset >= matchStart && currentOffset <= matchEnd) {
                        isMetadataArea = true;
                        console.log("📊 检测到双击元数据区域:", match[0]);
                        break;
                      }
                    }
                    if (isMetadataArea) break;
                  }
                  
                  if (isMetadataArea) {
                    console.log("🚀 准备打开元数据编辑器");
                    setMetadataEditorOpen(true);
                    return;
                  }
                  
                  // 如果不是元数据区域，检查是否是代码字段
                  let codeMatch = null;
                  const fieldPatterns = [
                    /"(code|script|event|handler)":\s*"((?:[^"\\]|\\.)*)"/g,
                    /"(code|script|event|handler)":\s*`((?:[^`\\]|\\.)*)`/g
                  ];
                  
                  for (const pattern of fieldPatterns) {
                    pattern.lastIndex = 0; // 重置正则表达式
                    let match;
                    while ((match = pattern.exec(fullText)) !== null) {
                      const fieldName = match[1];
                      const fieldValue = match[2];
                      console.log(`🔍 找到 ${fieldName} 字段:`, fieldValue);
                      
                      // 检查当前光标位置是否在这个字段附近
                      const matchStart = match.index;
                      const matchEnd = match.index + match[0].length;
                      
                      console.log("📍 位置信息:", {
                        matchStart,
                        matchEnd,
                        currentOffset,
                        isInRange: currentOffset >= matchStart && currentOffset <= matchEnd
                      });
                      
                      // 如果光标在这个字段范围内，就使用这个匹配
                      if (currentOffset >= matchStart && currentOffset <= matchEnd) {
                        codeMatch = [match[0], fieldValue, fieldName];
                        console.log("✅ 找到目标字段:", fieldName, "值:", fieldValue);
                        break;
                      }
                    }
                    if (codeMatch) break;
                  }
                  
                  console.log("🔍 最终代码匹配结果:", codeMatch);
                  
                  if (codeMatch) {
                    console.log("✅ 找到代码字段，开始查找节点ID");
                    
                    // 查找对应的节点ID
                    let nodeId = null;
                    for (let i = position.lineNumber - 1; i >= 0; i--) {
                      const prevLine = model.getLineContent(i);
                      console.log(`🔍 检查第${i}行:`, prevLine);
                      
                      const idMatch = prevLine.match(/"id":\s*"([^"]*)"/) ||
                                     prevLine.match(/"id":\s*`([^`]*)`/);
                      if (idMatch) {
                        nodeId = idMatch[1];
                        console.log("🎯 找到节点ID:", nodeId);
                        break;
                      }
                    }
                    
                    if (nodeId) {
                      const rawScript = codeMatch[1] || "";
                      const formattedScript = formatJavaScript(rawScript);
                      
                      console.log("🚀 准备打开脚本编辑器", {
                        nodeId,
                        rawScript,
                        formattedScript
                      });
                      
                      // 打开脚本编辑器，使用格式化后的代码
                      setEditingNodeId(nodeId);
                      setEditingScript(formattedScript);
                      setScriptEditorOpen(true);
                    } else {
                      console.log("❌ 未找到对应的节点ID");
                    }
                  } else {
                    console.log("❌ 当前行不包含代码字段");
                  }
                } else {
                  console.log("❌ 无法获取编辑器模型");
                }
              } else {
                console.log("❌ 无法获取点击位置");
              }
            });
          } else {
            console.log("❌ 无法获取编辑器容器");
          }
        }}
      />

      {/* 脚本编辑器 */}
      <CodeEditorDialog
        open={scriptEditorOpen}
        onOpenChange={(open) => {
          console.log("📝 脚本编辑器状态变化:", { open, editingNodeId, scriptLength: editingScript.length });
          
          if (!open) {
            // 关闭时自动保存
            if (editingScript !== "") {
              console.log("💾 准备保存脚本");
              saveScript();
            } else {
              console.log("🚫 脚本为空，不保存");
              setScriptEditorOpen(false);
              setEditingScript("");
              setEditingNodeId(null);
            }
          }
        }}
        value={editingScript}
        onChange={(value) => {
          console.log("✏️ 脚本内容变化:", value.length, "字符");
          setEditingScript(value);
        }}
        title={`编辑节点脚本 (${editingNodeId})`}
        language="javascript"
        readOnly={false}
      />
    </div>
  );
}

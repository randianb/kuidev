import { useEffect, useMemo, useState } from "react";
import { createNode, createPage, NodeMeta, PageMeta, TemplateKind, CustomComponent } from "@/studio/types";
import { getPage, loadPages, upsertPage, upsertCustomComponent, loadCustomComponents, deleteCustomComponent as deleteCustomComponentFromStorage } from "@/studio/storage";
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
import { bus } from "@/lib/eventBus";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { ChevronUp, ChevronDown, Edit, X } from "lucide-react";
import Editor from "@monaco-editor/react";

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
  const createChild = (parentId: string, type: string) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        // 支持Container和所有Card变体类型接受子组件
        const supportedTypes = ["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"];
        if (!supportedTypes.includes(n.type)) return true; // ignore non-container types
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
        const supportedTypes = ["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"];
        if (!supportedTypes.includes(n.type)) return true; // ignore non-container types
        
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

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4">
      <NodeRenderer
        node={page.root}
        ctx={{
          design: true,
          onSelect: setSelect,
          selectedId: select,
          insertSibling: (id: string, dir: any) => insertSibling(id, dir),
          moveBeforeAfter,
          moveAsChild,
          createChild,
          createCustomChild,
          rootNode: page.root,
          onPanelSizeChange,
          onCopy,
          onPaste,
          onDelete,
          onDuplicate,
        }}
      />
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
  const width = "100%" as const;
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<{ title?: string; content?: any } | null>(null);
  
  const createChild = (parentId: string, type: string) => {
    const walk = (n: NodeMeta): boolean => {
      if (n.id === parentId) {
        // 支持Container和所有Card变体类型接受子组件
        const supportedTypes = ["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"];
        if (!supportedTypes.includes(n.type)) return true; // ignore non-container types
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
        const supportedTypes = ["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"];
        if (!supportedTypes.includes(n.type)) return true; // ignore non-container types
        
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
            <div className="h-full overflow-y-auto overflow-x-hidden p-2">
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
        <div className="h-full overflow-hidden p-4">
          <div className="mx-auto h-full w-full max-w-full rounded border bg-background shadow-sm flex flex-col" style={{ width, overflow: "hidden" }}>
            <div className="border-b p-2 text-xs text-muted-foreground">预览</div>
            <div className="flex-1 overflow-auto p-3">
              <NodeRenderer node={page.root} ctx={{ onPanelSizeChange }} />
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

function CodeEditorDialog({ open, onOpenChange, value, onChange, title = "代码编辑器" }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
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
            defaultLanguage="javascript"
            value={value}
            onChange={(val) => onChange(val || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
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
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
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

  const addAction = () => {
    setShowAddDialog(true);
    setAddMode('form');
    setNewAction({
      text: '操作',
      icon: '',
      variant: 'ghost',
      handler: ''
    });
    setJsonValue(JSON.stringify({
      text: '操作',
      icon: '',
      variant: 'ghost',
      handler: ''
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
              <div key={index} className="border rounded p-2 space-y-2">
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
                        <Input 
                          value={editingAction.handler || ''} 
                          onChange={(e) => setEditingAction({...editingAction, handler: e.target.value})}
                          placeholder="handleEdit"
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button size="sm" onClick={saveEdit} className="h-6 px-2">保存</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-6 px-2">取消</Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
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
  
  const handlers = Object.keys(getHandlers());
  
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

  const saveCode = () => {
    if (editingField) {
      set(editingField, editingCode);
    }
    setCodeEditorOpen(false);
    setEditingField(null);
    setEditingCode("");
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
                <label className="text-xs text-muted-foreground">处理器</label>
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
              </div>
            </div>
            
            {/* 表格事件的特殊参数配置 */}
            {selected.type === "Table" && renderTableEventParams(ev, idx, events, set)}
            
            {/* 通用参数配置 */}
            <div>
              <label className="text-xs text-muted-foreground">事件参数 (JSON)</label>
              <Textarea
                placeholder='{ "key": "value" }'
                value={ev.params ? JSON.stringify(ev.params, null, 2) : ""}
                onChange={(e) => {
                  try {
                    const next = [...events];
                    next[idx] = { ...ev, params: e.target.value ? JSON.parse(e.target.value) : undefined };
                    set("events", next);
                  } catch {}
                }}
                className="h-20 text-xs font-mono"
              />
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
            setCodeEditorOpen(false);
            setEditingField(null);
            setEditingCode("");
          }
        }}
        value={editingCode}
        onChange={setEditingCode}
        title={`编辑 ${editingField} 代码`}
      />
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={saveCode} disabled={!editingField}>
          保存代码
        </Button>
      </div>
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
}) {
  const [local, setLocal] = useState<NodeMeta | null>(selected);

  useEffect(() => setLocal(selected), [selected?.id]);
  if (!local) return <div className="p-4 text-sm text-muted-foreground">选择一个组件以编辑属性</div>;

  const set = (k: string, v: any) => {
    const copy = { ...local, props: { ...(local.props ?? {}), [k]: v } } as NodeMeta;
    setLocal(copy);
    update(copy);
  };

  const setStyle = (k: string, v: string) => {
    const style = { ...(local.props?.style ?? {}) } as any;
    style[k] = v;
    set("style", style);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onCopy(local!)}>
          复制
        </Button>
        <Button size="sm" variant="secondary" onClick={onPaste}>
          粘贴
        </Button>
      </div>
      
      <Accordion type="multiple" className="w-full" defaultValue={["basic", "style"]}>
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
              <Input value={local.code ?? ""} onChange={(e) => update({ ...local, code: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-xs">文本/标题</label>
              <Input value={local.props?.text ?? local.props?.title ?? ""} onChange={(e) => set("text", e.target.value)} />
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
          </AccordionContent>
        </AccordionItem>

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
                  <Textarea rows={4} value={JSON.stringify(local.props?.data ?? [], null, 2)} onChange={(e) => {
                    try {
                      const v = JSON.parse(e.target.value || "[]");
                      set("data", v);
                    } catch {}
                  }} />
                </div>
              )}
              <ColumnManager
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
                       <SelectItem value="sm">小</SelectItem>
                       <SelectItem value="default">默认</SelectItem>
                       <SelectItem value="lg">大</SelectItem>
                     </SelectContent>
                   </Select>
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
              </div>

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

        {/* 表单组件配置 */}
        {["Input", "Textarea", "Switch", "Slider", "Select", "Transfer", "Upload"].includes(local.type) && (
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
              
              {local.type === "Input" && (
                <>
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
                </>
              )}
              
              {local.type === "Textarea" && (
                <>
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
                </>
              )}
              
              {local.type === "Switch" && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">开关标题</label>
                    <Input 
                      value={local.props?.title ?? ""} 
                      onChange={(e) => set("title", e.target.value)} 
                      placeholder="请输入开关标题"
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
                </>
              )}
              
              {local.type === "Select" && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs">占位符</label>
                    <Input 
                      value={local.props?.placeholder ?? ""} 
                      onChange={(e) => set("placeholder", e.target.value)} 
                      placeholder="请选择..."
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
                </>
              )}
              
              {local.type === "Upload" && (
                <>
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
                </>
              )}
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
      </Accordion>
    </div>
  );
}

export default function Studio() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const pageId = params.get("id");
  const [page, setPage] = useState<PageMeta>(() => (pageId ? (getPage(pageId!) as PageMeta) ?? createPage("新页面", "cms") : createPage("新页面", "cms")));
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

  const commit = (next: PageMeta) => {
    setHistory((h) => [...h, page]);
    setFuture([]);
    setPage(next);
  };

  useEffect(() => {
    setParams({ id: page.id }, { replace: true });
  }, [page.id]);
  useEffect(() => {
    upsertPage(page);
  }, [page]);
  
  useEffect(() => {
    setCustomComponents(loadCustomComponents());
  }, []);

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
    id: crypto.randomUUID(),
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

  // keyboard shortcuts (global except paste)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && selected) {
        e.preventDefault();
        onCopy(selected);
      }
      if (e.key === "Delete" && selectedId) {
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
      if (e.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
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
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      onPaste();
    }
  };

  const goRun = () => navigate(`/p/${page.id}`);

  const libItems = [
    { key: "Container", label: "容器" },
    { key: "Button", label: "按钮" },
    { key: "Badge", label: "徽章" },
    { key: "Input", label: "输入框" },
    { key: "Textarea", label: "多行输入" },
    { key: "Switch", label: "开关" },
    { key: "Slider", label: "滑块" },
    { key: "Separator", label: "分割线" },
    { key: "Avatar", label: "头像" },
    { key: "Progress", label: "进度条" },
    { key: "Skeleton", label: "骨架屏" },
    { key: "Tooltip", label: "气泡提示" },
    { key: "Popover", label: "弹出层" },
    { key: "Dialog", label: "对话框" },
    { key: "Alert", label: "警告提示" },
    { key: "Card", label: "卡片" },
    { key: "Table", label: "表格" },
    { key: "Listener", label: "事件监听器" },
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
    Textarea: "fas fa-align-left",
    Switch: "fas fa-toggle-on",
    Slider: "fas fa-sliders-h",
    Select: "fas fa-list",
    Command: "fas fa-terminal",
    
    // 展示组件
    Badge: "fas fa-tag",
    Avatar: "fas fa-user-circle",
    Progress: "fas fa-chart-line",
    Skeleton: "fas fa-spinner",
    Table: "fas fa-table",
    Alert: "fas fa-exclamation-triangle",
    
    // 交互组件
    Tooltip: "fas fa-comment",
    Popover: "fas fa-comment-dots",
    Dialog: "fas fa-window-maximize",
    HoverCard: "fas fa-address-card",
    Drawer: "fas fa-bars",
    Sheet: "fas fa-file-alt",
    
    // 导航组件
    Tabs: "fas fa-folder-open",
    Accordion: "fas fa-chevron-down",
    Collapsible: "fas fa-compress",
    
    // 数据组件
    Transfer: "fas fa-exchange-alt",
    Upload: "fas fa-upload",
    Iframe: "fas fa-external-link-alt",
    Tree: "fas fa-sitemap",
    
    // 功能组件
    Listener: "fas fa-headphones",
  };

  const layoutTemplates = {
    "CMS布局": [
      { template: "cms", label: "CMS 左右", description: "经典CMS管理界面布局" },
      { template: "landing", label: "首页 上下", description: "首页上下布局转为CMS布局" },
    ],
  };

  const componentGroups = {
    "布局组件": [
      { key: "Container", label: "容器" },
      { key: "Separator", label: "分割线" },
      { key: "Card", label: "基础卡片" },
      { key: "CollapsibleCard", label: "可收缩卡片" },
      { key: "ActionCard", label: "操作卡片" },
      { key: "InfoCard", label: "信息卡片" },
      { key: "StatsCard", label: "统计卡片" },
    ],
    "表单组件": [
      { key: "Button", label: "按钮" },
      { key: "Input", label: "输入框" },
      { key: "Textarea", label: "多行输入" },
      { key: "Switch", label: "开关" },
      { key: "Slider", label: "滑块" },
      { key: "Select", label: "选择器" },
      { key: "Command", label: "命令面板" },
    ],
    "展示组件": [
      { key: "Badge", label: "徽章" },
      { key: "Avatar", label: "头像" },
      { key: "Progress", label: "进度条" },
      { key: "Skeleton", label: "骨架屏" },
      { key: "Table", label: "表格" },
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
      const clone = (() => ({ ...node, id: crypto.randomUUID(), children: node.children?.map((c) => ({ ...c, id: crypto.randomUUID() })) ?? [] }))();
      (container.children = container.children ?? []).push(clone as any);
      commit({ ...page, updatedAt: Date.now() });
    }
  };

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-[260px_1fr_300px]">
      <div className="border-r p-3">
        <Tabs defaultValue="layouts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="layouts">布局</TabsTrigger>
            <TabsTrigger value="components">组件库</TabsTrigger>
          </TabsList>
          
          <TabsContent value="layouts" className="mt-3">
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
                          onClick={() => commit(createPage(`${template.label}-${loadPages().length + 1}`, template.template as TemplateKind))}
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
          </TabsContent>
          
          <TabsContent value="components" className="mt-3">
            {/* 搜索输入框 */}
            <div className="mb-3">
              <Input
                placeholder="搜索组件..."
                value={componentSearchTerm}
                onChange={(e) => setComponentSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            
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
                          className="flex cursor-pointer items-center rounded border p-2 text-xs hover:bg-accent gap-2"
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
            <Button variant={showPreview ? "outline" : "default"} onClick={() => setShowPreview((v) => !v)}>{showPreview ? "关闭预览" : "打开预览"}</Button>
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
          <div className="flex-1 min-h-0 overflow-hidden" onKeyDown={handleDesignPanelKeyDown} tabIndex={-1}>
            <div className="h-full w-full bg-background flex flex-col">
              <Canvas page={page} setPage={commit} select={selectedId} setSelect={setSelectedId} insertSibling={insertSibling} moveBeforeAfter={moveBeforeAfter} moveAsChild={moveAsChild} onPanelSizeChange={onPanelSizeChange} onCopy={handleContextCopy} onPaste={handleContextPaste} onDelete={handleContextDelete} onDuplicate={handleContextDuplicate} />
            </div>
          </div>
        )}
      </div>
      <div className="border-l">
        <Tabs defaultValue="props">
          <TabsList className="m-3">
            <TabsTrigger value="props">属性</TabsTrigger>
            <TabsTrigger value="events">事件</TabsTrigger>
            <TabsTrigger value="page">页面</TabsTrigger>
          </TabsList>
          <TabsContent value="props">
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
                  if (n.type === "Container") list.push({ id: n.id, label: `${n.type} · ${n.id.slice(0, 6)}` });
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
                const p = findParent(page.root, selectedId).parent;
                if (p && p.layout === "row") return "flex-1 min-w-[200px]";
                return null;
              }, [page, selectedId])}
              onSaveComponent={openSaveComponentDialog}
            />
          </TabsContent>
          <TabsContent value="events">
            <EventsPanel
              selected={selected}
              update={updateNode}
            />
          </TabsContent>
          <TabsContent value="page">
            <div className="space-y-3 p-4">
              <label className="text-xs">页面名称</label>
              <Input value={page.name} onChange={(e) => commit({ ...page, name: e.target.value, updatedAt: Date.now() })} />
              <div className="text-xs text-muted-foreground">模板：{page.template}</div>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(page))}>
                复制页面元数据
              </Button>
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
    </div>
  );
}

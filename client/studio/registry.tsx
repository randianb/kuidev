import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transfer } from "./components/ui/transfer";
import { Upload } from "./components/ui/upload";
import { Iframe } from "./components/ui/iframe";
import { Tree } from "./components/ui/tree";
import { FormLabel } from "./components/ui/form-label";
import { SubmitButton } from "./components/ui/submit-button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { 
  ArrowUpDown, Plus, Minus, Edit, Trash2, Save, Search, Settings, 
  User, Home, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, 
  X, Heart, Star, Download, Upload as UploadIcon, RefreshCw, Copy, Share, 
  Info, AlertTriangle, XCircle, CheckCircle, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { bus } from "@/lib/eventBus";
import { execHandler } from "@/lib/handlers";
import { formValidationManager } from "./form-validation";
import type { NodeMeta } from "./types";

// 检查节点是否在锁定容器内
function isNodeInLockedContainer(nodeId: string, rootNode: NodeMeta, targetNodeId?: string): boolean {
  const findParentContainer = (node: NodeMeta, targetId: string, parentContainer?: NodeMeta): NodeMeta | null => {
    if (node.id === targetId) {
      return parentContainer || null;
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findParentContainer(child, targetId, node.type === "Container" ? node : parentContainer);
        if (result) return result;
      }
    }
    return null;
  };
  
  let currentContainer = findParentContainer(rootNode, nodeId);
  while (currentContainer) {
    if (currentContainer.locked === true) {
      return true;
    }
    currentContainer = findParentContainer(rootNode, currentContainer.id);
  }
  return false;
}

export type Renderer = (
  node: NodeMeta,
  ctx: {
    design?: boolean;
    onSelect?: (id: string) => void;
    selectedId?: string | null;
    insertSibling?: (targetId: string, dir: "left" | "right" | "top" | "bottom") => void;
    moveBeforeAfter?: (dragId: string, targetId: string, pos: "before" | "after") => void;
    moveAsChild?: (dragId: string, parentId: string) => void;
    createChild?: (parentId: string, type: string) => void;
    createCustomChild?: (parentId: string, customComponent: any) => void;
    rootNode?: NodeMeta; // 用于锁定检查
    onPanelSizeChange?: (nodeId: string, sizes: number[]) => void; // 分栏大小变化回调
    onCopy?: (nodeId: string) => void; // 复制组件
    onPaste?: (parentId: string) => void; // 粘贴组件
    onDelete?: (nodeId: string) => void; // 删除组件
    onDuplicate?: (nodeId: string) => void; // 复制组件
    gridData?: any; // 栅格数据绑定
  },
) => JSX.Element;

export const registry: Record<string, Renderer> = {
  Grid: (node, ctx) => {
    const cols = node.props?.cols || 12;
    const gap = node.props?.gap || 4;
    const responsive = node.props?.responsive !== false;
    const dataSource = node.props?.dataSource || "static";
    const data = node.props?.data || [];
    const fieldMapping = node.props?.fieldMapping || {};
    
    // 如果有数据源且不是设计模式，渲染数据驱动的栅格
    const shouldRenderData = !ctx.design && dataSource !== "static" && Array.isArray(data) && data.length > 0;
    
    return (
      <div
        className={cn(
          "relative rounded-md border border-dashed p-3",
          ctx.design ? "hover:border-ring" : "border-transparent p-0",
          "grid",
          `grid-cols-${cols}`,
          `gap-${gap}`,
          responsive && "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          node.props?.className,
        )}
        data-node-id={node.id}
        style={{
          gridTemplateColumns: responsive ? undefined : `repeat(${cols}, minmax(0, 1fr))`,
          ...node.style,
        }}
      >
        {ctx.design && ctx.selectedId === node.id && !node.locked && !(ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode)) && (
          <div className="pointer-events-auto">
            <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/60 pointer-events-none" />
            {/* 添加栅格项按钮 */}
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <button
                className="rounded bg-background px-2 py-0.5 text-xs shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.createChild?.(node.id, "GridItem");
                }}
              >
                +项
              </button>
            </div>
            {/* 左右插入兄弟元素 */}
            <div className="absolute top-1/2 -left-3 z-10 -translate-y-1/2">
              <button
                className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.insertSibling?.(node.id, "left");
                }}
              >
                ←
              </button>
            </div>
            <div className="absolute top-1/2 -right-3 z-10 -translate-y-1/2">
              <button
                className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.insertSibling?.(node.id, "right");
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
        
        {shouldRenderData ? (
          // 数据驱动渲染
          data.map((item, index) => (
            <div key={index} className="col-span-1">
              {(node.children ?? []).map((child) => {
                // 为每个子组件创建数据绑定的副本
                const boundChild = {
                  ...child,
                  props: {
                    ...child.props,
                    // 根据字段映射绑定数据
                    ...(fieldMapping[child.id] ? {
                      [fieldMapping[child.id].prop]: item[fieldMapping[child.id].field]
                    } : {})
                  }
                };
                return <NodeRenderer key={`${child.id}-${index}`} node={boundChild} ctx={ctx} />;
              })}
            </div>
          ))
        ) : (
          // 设计模式或静态渲染
          (node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} ctx={ctx} />
          ))
        )}
        
        {!shouldRenderData && !node.children?.length && (
          <div className="col-span-full flex items-center justify-center min-h-[120px]">
            <div className="pointer-events-none select-none text-center text-xs text-muted-foreground py-10">
              空栅格，点击"+项"添加栅格项
            </div>
          </div>
        )}
      </div>
    );
  },
  
  GridItem: (node, ctx) => {
    const span = node.props?.span || 1;
    const offset = node.props?.offset || 0;
    const smSpan = node.props?.smSpan;
    const mdSpan = node.props?.mdSpan;
    const lgSpan = node.props?.lgSpan;
    const xlSpan = node.props?.xlSpan;
    
    return (
      <div
        className={cn(
          "relative rounded-md border border-dashed p-3",
          ctx.design ? "hover:border-ring" : "border-transparent p-0",
          `col-span-${span}`,
          offset > 0 && `col-start-${offset + 1}`,
          smSpan && `sm:col-span-${smSpan}`,
          mdSpan && `md:col-span-${mdSpan}`,
          lgSpan && `lg:col-span-${lgSpan}`,
          xlSpan && `xl:col-span-${xlSpan}`,
          node.props?.className,
        )}
        data-node-id={node.id}
        style={node.style}
      >
        {ctx.design && ctx.selectedId === node.id && !node.locked && !(ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode)) && (
          <div className="pointer-events-auto">
            <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/60 pointer-events-none" />
            {/* 添加子组件按钮 */}
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <button
                className="rounded bg-background px-2 py-0.5 text-xs shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.createChild?.(node.id, "Container");
                }}
              >
                +
              </button>
            </div>
            {/* 左右插入兄弟元素 */}
            <div className="absolute top-1/2 -left-3 z-10 -translate-y-1/2">
              <button
                className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.insertSibling?.(node.id, "left");
                }}
              >
                ←
              </button>
            </div>
            <div className="absolute top-1/2 -right-3 z-10 -translate-y-1/2">
              <button
                className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.insertSibling?.(node.id, "right");
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
        
        {(node.children ?? []).map((child) => (
          <NodeRenderer key={child.id} node={child} ctx={ctx} />
        ))}
        
        {!node.children?.length && (
          <div className="flex items-center justify-center min-h-[80px]">
            <div className="pointer-events-none select-none text-center text-xs text-muted-foreground py-6">
              栅格项 (span: {span})
            </div>
          </div>
        )}
      </div>
    );
  },
  
  Label: (node, ctx) => {
    const text = node.props?.text || "标签文本";
    const htmlFor = node.props?.htmlFor;
    const required = node.props?.required;
    const size = node.props?.size || "default";
    
    return (
      <label
        htmlFor={htmlFor}
        onClick={(e) => {
          if (ctx.design) {
            e.stopPropagation();
            ctx.onSelect?.(node.id);
          }
        }}
        className={cn(
          "relative rounded-md border border-dashed p-2",
          ctx.design ? "hover:border-ring cursor-pointer" : "border-transparent p-0",
          size === "sm" && "text-sm",
          size === "lg" && "text-lg",
          "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          node.props?.className,
        )}
        data-node-id={node.id}
        style={node.style}
      >
        {ctx.design && ctx.selectedId === node.id && !node.locked && !(ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode)) && (
          <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/60 pointer-events-none" />
        )}
        
        {text}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  },
  
  Container: (node, ctx) => {
    // 添加调试日志
    console.log('Container Debug:', {
      nodeId: node.id,
      resizable: node.resizable,
      resizableEnabled: node.resizableEnabled,
      layout: node.layout,
      childrenCount: node.children?.length || 0
    });

    return (
    <div
      onClick={(e) => {
        if (ctx.design) {
          e.stopPropagation();
          // 锁定容器自身可以选择，只是其子组件不能选择
          ctx.onSelect?.(node.id);
        }
      }}

      className={cn(
        "relative rounded-md border border-dashed p-3",
        ctx.design ? "hover:border-ring" : "border-transparent p-0",
        node.props?.className,
      )}
      data-node-id={node.id}
    >
      {ctx.design && ctx.selectedId === node.id && !node.locked && !(ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode)) && (
        <div className="pointer-events-auto">
          <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/60 pointer-events-none" />
          {/* 根据布局方向显示不同的添加按钮 */}
          {node.layout === "col" ? (
            // 列布局(垂直)：上下按钮控制子元素添加，左右按钮控制兄弟元素插入
            <>
              {/* top - 在容器内部顶部添加子元素 */}
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                <button
                  className="rounded bg-background px-2 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.createChild?.(node.id, "Container");
                  }}
                >
                  ↑
                </button>
              </div>
              {/* bottom - 在容器内部底部添加子元素 */}
              <div className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2">
                <button
                  className="rounded bg-background px-2 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.createChild?.(node.id, "Container");
                  }}
                >
                  ↓
                </button>
              </div>
              {/* left - 在当前容器前插入兄弟元素 */}
              <div className="absolute top-1/2 -left-3 z-10 -translate-y-1/2">
                <button
                  className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.insertSibling?.(node.id, "left");
                  }}
                >
                  ←
                </button>
              </div>
              {/* right - 在当前容器后插入兄弟元素 */}
              <div className="absolute top-1/2 -right-3 z-10 -translate-y-1/2">
                <button
                  className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.insertSibling?.(node.id, "right");
                  }}
                >
                  →
                </button>
              </div>
            </>
          ) : (
            // 行布局(水平)：左右按钮控制前后位置，上下按钮控制子元素添加
            <>
              {/* top - 在容器内部左侧添加子元素 */}
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                <button
                  className="rounded bg-background px-2 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.createChild?.(node.id, "Container");
                  }}
                >
                  ↑
                </button>
              </div>
              {/* bottom - 在容器内部右侧添加子元素 */}
              <div className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2">
                <button
                  className="rounded bg-background px-2 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.createChild?.(node.id, "Container");
                  }}
                >
                  ↓
                </button>
              </div>
              {/* left - 在当前容器前插入 */}
              <div className="absolute top-1/2 -left-3 z-10 -translate-y-1/2">
                <button
                  className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.insertSibling?.(node.id, "left");
                  }}
                >
                  ←
                </button>
              </div>
              {/* right - 在当前容器后插入 */}
              <div className="absolute top-1/2 -right-3 z-10 -translate-y-1/2">
                <button
                  className="rounded bg-background px-1 py-0.5 text-xs shadow-sm border"
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.insertSibling?.(node.id, "right");
                  }}
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {node.layout === "row" ? (
        (node.children?.length ?? 0) > 0 ? (
          <ResizablePanelGroup 
            direction="horizontal" 
            className="min-h-[240px]"
            onLayout={(sizes) => {
              // 保存分栏大小变化到节点数据中
              if (ctx.onPanelSizeChange) {
                ctx.onPanelSizeChange(node.id, sizes);
              }
            }}
          >
            {node.children!.map((child, idx) => {
              // 使用存储的分栏大小，如果没有则平均分配
              const savedSizes = node.panelSizes || [];
              const defaultSize = savedSizes[idx] || Math.floor(100 / node.children!.length);
              
              return (
                <>
                  <ResizablePanel key={child.id} defaultSize={defaultSize} minSize={10}>
                    <div className="h-full min-w-[200px] flex-1">
                      <NodeRenderer node={child} ctx={ctx} />
                    </div>
                  </ResizablePanel>
                  {(() => {
                    const shouldShowHandle = idx < node.children!.length - 1 && node.resizable === true && node.resizableEnabled !== false;
                    console.log('ResizableHandle Debug:', {
                      nodeId: node.id,
                      idx,
                      totalChildren: node.children!.length,
                      isNotLastChild: idx < node.children!.length - 1,
                      resizable: node.resizable,
                      resizableEnabled: node.resizableEnabled,
                      shouldShowHandle
                    });
                    return shouldShowHandle ? <ResizableHandle withHandle /> : null;
                  })()}
                </>
              );
            })}
          </ResizablePanelGroup>
        ) : (
          <div className="min-h-[240px] flex items-center justify-center">
            <div className="pointer-events-none select-none text-center text-xs text-muted-foreground w-full py-10">
              空容器，拖拽组件到此
            </div>
          </div>
        )
      ) : (
        <div className={cn(
          "min-h-[240px] flex gap-3",
          node.layout === "col" ? "flex-col h-full" : "flex-row"
        )}>
          {(node.children ?? []).map((child) => (
            <div key={child.id} className={cn(
              node.layout === "row" ? "flex-1" : "",
              node.layout === "col" ? "flex-1 min-h-0" : ""
            )}>
              <NodeRenderer node={child} ctx={ctx} />
            </div>
          ))}
          {!node.children?.length && (
            <div className="pointer-events-none select-none text-center text-xs text-muted-foreground w-full py-10">
              空容器，拖拽组件到此
            </div>
          )}
        </div>
      )}
    </div>
    );
  },
  Button: (node) => {
    const iconMap: Record<string, React.ReactNode> = {
      plus: <Plus className="h-4 w-4" />,
      minus: <Minus className="h-4 w-4" />,
      edit: <Edit className="h-4 w-4" />,
      delete: <Trash2 className="h-4 w-4" />,
      trash: <Trash2 className="h-4 w-4" />,
      save: <Save className="h-4 w-4" />,
      search: <Search className="h-4 w-4" />,
      settings: <Settings className="h-4 w-4" />,
      user: <User className="h-4 w-4" />,
      home: <Home className="h-4 w-4" />,
      "arrow-left": <ArrowLeft className="h-4 w-4" />,
      "arrow-right": <ArrowRight className="h-4 w-4" />,
      "arrow-up": <ArrowUp className="h-4 w-4" />,
      "arrow-down": <ArrowDown className="h-4 w-4" />,
      check: <Check className="h-4 w-4" />,
      close: <X className="h-4 w-4" />,
      heart: <Heart className="h-4 w-4" />,
      star: <Star className="h-4 w-4" />,
      download: <Download className="h-4 w-4" />,
      upload: <UploadIcon className="h-4 w-4" />,
      refresh: <RefreshCw className="h-4 w-4" />,
      copy: <Copy className="h-4 w-4" />,
      share: <Share className="h-4 w-4" />,
      info: <Info className="h-4 w-4" />,
      warning: <AlertTriangle className="h-4 w-4" />,
      error: <XCircle className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />
    };
    
    const icon = node.props?.icon ? iconMap[node.props.icon.toLowerCase()] : null;
    const iconPosition = node.props?.iconPosition ?? "left";
    const text = node.props?.text ?? "按钮";
    const isDisabled = node.props?.disabled === true;
    const isLoading = node.props?.loading === true;
    const isVisible = node.props?.visible !== false;
    
    if (!isVisible) return null;
    
    const renderContent = () => {
      if (isLoading) {
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {text}
          </>
        );
      }
      
      switch (iconPosition) {
        case "top":
          return (
            <div className="flex flex-col items-center gap-1">
              {icon && <div>{icon}</div>}
              <span>{text}</span>
            </div>
          );
        case "bottom":
          return (
            <div className="flex flex-col items-center gap-1">
              <span>{text}</span>
              {icon && <div>{icon}</div>}
            </div>
          );
        case "right":
          return (
            <>
              {text}
              {icon && <div className="ml-2">{icon}</div>}
            </>
          );
        case "left":
        default:
          return (
            <>
              {icon && <div className="mr-2">{icon}</div>}
              {text}
            </>
          );
      }
    };
    
    return (
      <Button
        onClick={() => {
          if (isLoading || isDisabled) return;
          if (node.props?.events)
            (node.props.events as any[]).forEach((ev) => ev?.type === "click" && ev?.handler && execHandler(ev.handler, ev.params));
          if (node.props?.publish) bus.publish(node.props.publish, node.props?.payload);
        }}
        onMouseEnter={() => {
          if (node.props?.events)
            (node.props.events as any[]).forEach((ev) => ev?.type === "hover" && ev?.handler && execHandler(ev.handler, ev.params));
        }}
        onKeyDown={(e) => {
          if (node.props?.events)
            (node.props.events as any[]).forEach((ev) => ev?.type === "keydown" && ev?.handler && execHandler(ev.handler, { key: e.key, code: e.code }));
        }}
        variant={node.props?.variant ?? "default"}
        size={node.props?.size ?? "default"}
        disabled={isDisabled || isLoading}
        className={node.props?.className}
      >
        {renderContent()}
      </Button>
    );
  },
  Badge: (node) => <Badge>{node.props?.text ?? "Badge"}</Badge>,
  Input: (node, ctx) => {
    // 获取数据绑定值
    const getBoundValue = () => {
      if (node.props?.fieldMapping && ctx?.gridData) {
        return ctx.gridData[node.props.fieldMapping] || '';
      }
      return node.props?.defaultValue || '';
    };
    
    const [value, setValue] = useState(getBoundValue());
    
    // 当数据绑定变化时更新值
    useEffect(() => {
      const boundValue = getBoundValue();
      setValue(boundValue);
    }, [ctx?.gridData, node.props?.fieldMapping]);
    
    useEffect(() => {
      if (node.props?.required) {
        formValidationManager.registerField(node.id, 'value', true);
        formValidationManager.updateFieldValue(node.id, 'value', value);
      }
    }, [value, node.id, node.props?.required]);
    
    return (
      <FormLabel 
        label={node.props?.label} 
        required={node.props?.required}
        className={node.props?.labelClassName}
        nodeId={node.id}
        fieldName="value"
      >
        <Input 
          placeholder={node.props?.placeholder ?? "请输入..."} 
          className={node.props?.className}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (node.props?.events) {
              (node.props.events as any[]).forEach((event) => {
                if (event.type === "onChange") {
                  execHandler(event.handler, { value: e.target.value, ...event.params });
                }
              });
            }
          }}
          onBlur={() => {
            if (node.props?.required) {
              formValidationManager.markFieldBlurred(node.id, 'value');
            }
          }}
        />
      </FormLabel>
    );
  },
  Textarea: (node, ctx) => {
    // 获取数据绑定值
    const getBoundValue = () => {
      if (node.props?.fieldMapping && ctx?.gridData) {
        return ctx.gridData[node.props.fieldMapping] || '';
      }
      return node.props?.defaultValue || '';
    };
    
    const [value, setValue] = useState(getBoundValue());
    
    // 当数据绑定变化时更新值
    useEffect(() => {
      const boundValue = getBoundValue();
      setValue(boundValue);
    }, [ctx?.gridData, node.props?.fieldMapping]);
    
    useEffect(() => {
      if (node.props?.required) {
        formValidationManager.registerField(node.id, 'value', true);
        formValidationManager.updateFieldValue(node.id, 'value', value);
      }
    }, [value, node.id, node.props?.required]);
    
    return (
      <FormLabel 
        label={node.props?.label} 
        required={node.props?.required}
        className={node.props?.labelClassName}
        nodeId={node.id}
        fieldName="value"
      >
        <Textarea 
          placeholder={node.props?.placeholder ?? "请输入..."} 
          className={node.props?.className}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (node.props?.events) {
              (node.props.events as any[]).forEach((event) => {
                if (event.type === "onChange") {
                  execHandler(event.handler, { value: e.target.value, ...event.params });
                }
              });
            }
          }}
          onBlur={() => {
            if (node.props?.required) {
              formValidationManager.markFieldBlurred(node.id, 'value');
            }
          }}
        />
      </FormLabel>
    );
  },
  Switch: (node, ctx) => {
    // 获取数据绑定值
    const getBoundValue = () => {
      if (node.props?.fieldMapping && ctx?.gridData) {
        return !!ctx.gridData[node.props.fieldMapping];
      }
      return !!node.props?.checked;
    };
    
    const [checked, setChecked] = useState(getBoundValue());
    
    // 当数据绑定变化时更新值
    useEffect(() => {
      const boundValue = getBoundValue();
      setChecked(boundValue);
    }, [ctx?.gridData, node.props?.fieldMapping]);
    
    useEffect(() => {
      if (node.props?.required) {
        formValidationManager.registerField(node.id, 'checked', true);
        formValidationManager.updateFieldValue(node.id, 'checked', checked);
      }
    }, [checked, node.id, node.props?.required]);
    
    return (
      <FormLabel 
        label={node.props?.title} 
        required={node.props?.required}
        className={node.props?.labelClassName}
        nodeId={node.id}
        fieldName="checked"
      >
        <div className="flex items-center space-x-2">
          <Switch 
            checked={checked}
            disabled={!!node.props?.disabled}
            onCheckedChange={(newChecked) => {
              setChecked(newChecked);
              // 标记为已交互（相当于失去焦点）
              if (node.props?.required) {
                formValidationManager.markFieldBlurred(node.id, 'checked');
              }
              // 触发事件处理
              if (node.props?.events) {
                (node.props.events as any[]).forEach((event) => {
                  if (event.type === "onChange") {
                    execHandler(event.handler, { checked: newChecked, ...event.params });
                  }
                });
              }
            }}
            className={node.props?.className}
          />
          {node.props?.label && (
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {node.props.label}
            </label>
          )}
        </div>
      </FormLabel>
    );
  },
  Slider: (node) => {
    const [value, setValue] = useState([node.props?.value ?? 50]);
    
    useEffect(() => {
      if (node.props?.required) {
        const { formValidationManager } = require('./utils/form-validation');
        formValidationManager.updateFieldValue(node.id, 'value', value[0]);
      }
    }, [value, node.id, node.props?.required]);
    
    return (
      <FormLabel 
        label={node.props?.label} 
        required={node.props?.required}
        className={node.props?.labelClassName}
        nodeId={node.id}
        fieldName="value"
      >
        <Slider 
          value={value}
          onValueChange={(newValue) => {
            setValue(newValue);
            if (node.props?.events) {
              (node.props.events as any[]).forEach((event) => {
                if (event.type === "onValueChange") {
                  execHandler(event.handler, { value: newValue[0], ...event.params });
                }
              });
            }
          }}
          className={node.props?.className} 
        />
      </FormLabel>
    );
  },
  Separator: () => <Separator />,
  Avatar: (node) => (
    <Avatar>
      <AvatarFallback>{(node.props?.text ?? "U").slice(0, 2)}</AvatarFallback>
    </Avatar>
  ),
  Progress: (node) => <Progress value={node.props?.value ?? 45} className="w-40" />,
  Skeleton: () => <Skeleton className="h-6 w-32" />,
  Tooltip: (node) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">{node.props?.text ?? "提示按钮"}</Button>
        </TooltipTrigger>
        <TooltipContent>{node.props?.content ?? "提示内容"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  Popover: (node) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">{node.props?.text ?? "弹出"}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">{node.props?.content ?? "弹出层内容"}</PopoverContent>
    </Popover>
  ),
  Dialog: (node) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">{node.props?.text ?? "对话框"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{node.props?.title ?? "标题"}</DialogTitle>
        </DialogHeader>
        {node.props?.content ?? "对话框内容"}
      </DialogContent>
    </Dialog>
  ),
  Alert: (node) => (
    <Alert>
      <AlertTitle>{node.props?.title ?? "提示"}</AlertTitle>
      <AlertDescription>{node.props?.content ?? "这是一条消息"}</AlertDescription>
    </Alert>
  ),
  Accordion: (node) => {
    const items = node.props?.items || [
      { value: "item-1", title: "第一项", content: "这是第一项的内容" },
      { value: "item-2", title: "第二项", content: "这是第二项的内容" },
    ];
    return (
      <Accordion type="single" collapsible className={node.props?.className}>
        {items.map((item: any, index: number) => (
          <AccordionItem key={item.value || `item-${index}`} value={item.value || `item-${index}`}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
   },
   Collapsible: (node) => {
     const [isOpen, setIsOpen] = useState(node.props?.defaultOpen ?? false);
     return (
       <Collapsible open={isOpen} onOpenChange={setIsOpen} className={node.props?.className}>
         <CollapsibleTrigger asChild>
           <Button variant="ghost" className="flex items-center justify-between w-full p-2">
             {node.props?.title ?? "点击展开/收起"}
             <span className={cn("transition-transform", isOpen && "rotate-180")}>
               ▼
             </span>
           </Button>
         </CollapsibleTrigger>
         <CollapsibleContent className="space-y-2 p-2">
           {node.props?.content ?? "这是可折叠的内容"}
         </CollapsibleContent>
       </Collapsible>
     );
    },
    Tabs: (node) => {
      const tabs = node.props?.tabs || [
        { value: "tab1", label: "标签1", content: "这是第一个标签的内容" },
        { value: "tab2", label: "标签2", content: "这是第二个标签的内容" },
      ];
      return (
        <Tabs defaultValue={tabs[0]?.value} className={node.props?.className}>
          <TabsList>
            {tabs.map((tab: any) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab: any) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      );
     },
     Command: (node) => {
       const items = node.props?.items || [
         { value: "item1", label: "选项1" },
         { value: "item2", label: "选项2" },
         { value: "item3", label: "选项3" },
       ];
       return (
         <Command className={cn("rounded-lg border shadow-md", node.props?.className)}>
           <CommandInput placeholder={node.props?.placeholder ?? "搜索..."} />
           <CommandList>
             <CommandEmpty>未找到结果</CommandEmpty>
             <CommandGroup>
               {items.map((item: any) => (
                 <CommandItem key={item.value} value={item.value}>
                   {item.label}
                 </CommandItem>
               ))}
             </CommandGroup>
           </CommandList>
         </Command>
       );
     },
     Select: (node) => {
       const options = node.props?.options || [
         { value: "option1", label: "选项1" },
         { value: "option2", label: "选项2" },
       ];
       const [value, setValue] = useState(node.props?.defaultValue || '');
       
       useEffect(() => {
         if (node.props?.required) {
           const { formValidationManager } = require('./utils/form-validation');
           formValidationManager.updateFieldValue(node.id, 'value', value);
         }
       }, [value, node.id, node.props?.required]);
       
       return (
         <FormLabel 
           label={node.props?.label} 
           required={node.props?.required}
           className={node.props?.labelClassName}
           nodeId={node.id}
           fieldName="value"
         >
           <Select 
             value={value}
             onValueChange={(newValue) => {
               setValue(newValue);
               if (node.props?.events) {
                 (node.props.events as any[]).forEach((event) => {
                   if (event.type === "onValueChange") {
                     execHandler(event.handler, { value: newValue, ...event.params });
                   }
                 });
               }
             }}
           >
             <SelectTrigger className={node.props?.className}>
               <SelectValue placeholder={node.props?.placeholder ?? "请选择..."} />
             </SelectTrigger>
             <SelectContent>
               {options.map((option: any) => (
                 <SelectItem key={option.value} value={option.value}>
                   {option.label}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </FormLabel>
       );
     },
     HoverCard: (node) => (
       <HoverCard>
         <HoverCardTrigger asChild>
           <Button variant="link">{node.props?.triggerText ?? "悬停查看"}</Button>
         </HoverCardTrigger>
         <HoverCardContent className="w-80">
           <div className="space-y-2">
             <h4 className="text-sm font-semibold">{node.props?.title ?? "标题"}</h4>
             <p className="text-sm text-muted-foreground">
               {node.props?.content ?? "这是悬浮卡片的内容"}
             </p>
           </div>
         </HoverCardContent>
       </HoverCard>
     ),
     Drawer: (node) => (
       <Drawer>
         <DrawerTrigger asChild>
           <Button variant="outline">{node.props?.triggerText ?? "打开抽屉"}</Button>
         </DrawerTrigger>
         <DrawerContent>
           <DrawerHeader>
             <DrawerTitle>{node.props?.title ?? "抽屉标题"}</DrawerTitle>
           </DrawerHeader>
           <div className="p-4">
             {node.props?.content ?? "这是抽屉的内容"}
           </div>
         </DrawerContent>
       </Drawer>
     ),
     Sheet: (node) => (
       <Sheet>
         <SheetTrigger asChild>
           <Button variant="outline">{node.props?.triggerText ?? "打开侧边栏"}</Button>
         </SheetTrigger>
         <SheetContent>
           <SheetHeader>
             <SheetTitle>{node.props?.title ?? "侧边栏标题"}</SheetTitle>
           </SheetHeader>
           <div className="mt-4">
             {node.props?.content ?? "这是侧边栏的内容"}
           </div>
         </SheetContent>
       </Sheet>
     ),
  // 基础卡片
  Card: (node, ctx) => {
    return (
      <Card className={cn(ctx.design && "cursor-default select-none")}>
        <CardHeader>
          <CardTitle>{node.props?.title ?? "基础卡片"}</CardTitle>
          {node.props?.description && (
            <CardDescription>{node.props.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {node.children?.length ? (
            node.children.map((c) => <NodeRenderer key={c.id} node={c} ctx={ctx} />)
          ) : (
            <p className="text-sm text-muted-foreground">将组件拖入卡片内容</p>
          )}
        </CardContent>
        {node.props?.showFooter && (
          <CardFooter>
            <p className="text-sm text-muted-foreground">{node.props?.footerText ?? "卡片底部"}</p>
          </CardFooter>
        )}
      </Card>
    );
  },

  // 可收缩卡片
  CollapsibleCard: (node, ctx) => {
    const [isOpen, setIsOpen] = useState(node.props?.defaultOpen ?? true);
    
    return (
      <Card className={cn(ctx.design && "cursor-default select-none")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{node.props?.title ?? "可收缩卡片"}</CardTitle>
              {node.props?.description && (
                <CardDescription>{node.props.description}</CardDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-8 w-8 p-0"
            >
              <i className={`fas ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`} />
            </Button>
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent className="space-y-3">
            {node.children?.length ? (
              node.children.map((c) => <NodeRenderer key={c.id} node={c} ctx={ctx} />)
            ) : (
              <p className="text-sm text-muted-foreground">将组件拖入卡片内容</p>
            )}
          </CardContent>
        )}
      </Card>
    );
  },

  // 带按钮卡片
  ActionCard: (node, ctx) => {
    return (
      <Card className={cn(ctx.design && "cursor-default select-none")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{node.props?.title ?? "操作卡片"}</CardTitle>
              {node.props?.description && (
                <CardDescription>{node.props.description}</CardDescription>
              )}
            </div>
            {node.props?.showHeaderButton && (
              <Button variant="outline" size="sm">
                <i className="fas fa-cog mr-2" />
                {node.props?.headerButtonText ?? "设置"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {node.children?.length ? (
            node.children.map((c) => <NodeRenderer key={c.id} node={c} ctx={ctx} />)
          ) : (
            <p className="text-sm text-muted-foreground">将组件拖入卡片内容</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">
            <i className="fas fa-times mr-2" />
            {node.props?.cancelButtonText ?? "取消"}
          </Button>
          <Button>
            <i className="fas fa-check mr-2" />
            {node.props?.confirmButtonText ?? "确认"}
          </Button>
        </CardFooter>
      </Card>
    );
  },

  // 信息卡片
  InfoCard: (node, ctx) => {
    const iconMap = {
      info: "fas fa-info-circle text-blue-500",
      warning: "fas fa-exclamation-triangle text-yellow-500",
      error: "fas fa-times-circle text-red-500",
      success: "fas fa-check-circle text-green-500"
    };
    
    const cardType = node.props?.type ?? "info";
    
    return (
      <Card className={cn(ctx.design && "cursor-default select-none")}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <i className={iconMap[cardType] || iconMap.info} />
            <div>
              <CardTitle>{node.props?.title ?? "信息卡片"}</CardTitle>
              {node.props?.description && (
                <CardDescription>{node.props.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {node.children?.length ? (
            node.children.map((c) => <NodeRenderer key={c.id} node={c} ctx={ctx} />)
          ) : (
            <p className="text-sm text-muted-foreground">将组件拖入卡片内容</p>
          )}
        </CardContent>
      </Card>
    );
  },

  // 统计卡片
  StatsCard: (node, ctx) => {
    return (
      <Card className={cn(ctx.design && "cursor-default select-none")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {node.props?.label ?? "统计标签"}
              </p>
              <p className="text-2xl font-bold">
                {node.props?.value ?? "1,234"}
              </p>
              {node.props?.change && (
                <p className={`text-xs ${
                  node.props.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {node.props.change} 较上期
                </p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <i className={`fas ${node.props?.icon ?? 'fa-chart-line'} text-primary`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
  Listener: (node) => {
    const [text, setText] = useState<string>(node.props?.text ?? "监听器：等待事件");
    useEffect(() => {
      const topic = node.props?.listen as string | undefined;
      if (!topic) return;
      const unsub = bus.subscribe(topic, (payload) => {
        setText(String(payload ?? ""));
      });
      return () => unsub();
    }, [node.props?.listen]);
    return (
      <span className="text-sm text-muted-foreground" id={node.id}>
        {text}
      </span>
    );
  },
  Table: (node) => {
    const [rows, setRows] = useState<any[]>(() => {
      if (node.props?.dataSource === "static") return node.props?.data ?? [];
      return Array.isArray(node.props?.data) ? node.props?.data : [];
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // 分页配置
    const pageSize: number = Number(node.props?.pageSize ?? 5);
    const [page, setPage] = useState(1);
    const showPager = node.props?.showPager ?? true;
    const pagerPosition = node.props?.pagerPosition ?? "bottom"; // top, bottom, both
    const pagerSize = node.props?.pagerSize ?? "default"; // small, default, large
    const showPageInfo = node.props?.showPageInfo ?? true;
    const showPageSizeSelector = node.props?.showPageSizeSelector ?? false;
    const pageSizeOptions = node.props?.pageSizeOptions ?? [5, 10, 20, 50];
    
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    
    // 通用属性处理
    if (node.props?.disabled) {
      return <div className="opacity-50 pointer-events-none w-full overflow-x-auto"><Table className={node.props?.className}><TableBody><TableRow><TableCell>表格已禁用</TableCell></TableRow></TableBody></Table></div>;
    }
    if (node.props?.visible === false) {
      return <div style={{ display: 'none' }} />;
    }
    
    // 操作列配置
    const actions = node.props?.actions ?? [];
    const showActions = node.props?.showActions ?? false;
    
    // 图标映射
    const iconMap: Record<string, string> = {
      edit: "✏️",
      delete: "🗑️",
      view: "👁️",
      download: "⬇️",
      share: "📤",
      copy: "📋",
      settings: "⚙️",
      info: "ℹ️"
    };
    
    useEffect(() => {
      if (node.props?.dataSource === "url" && node.props?.url) {
        setLoading(true);
        setError(null);
        fetch(node.props.url)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
            return r.json();
          })
          .then((d) => {
            const arr = Array.isArray(d) ? d : d?.data ?? [];
            setRows(arr);
            setError(null);
          })
          .catch((err) => {
            console.error('表格数据加载失败:', err);
            setError(err.message || '数据加载失败');
            setRows([]);
          })
          .finally(() => {
            setLoading(false);
          });
      }
      if (node.props?.dataSource === "topic" && node.props?.topic) {
        const unsub = bus.subscribe(String(node.props.topic), (data) => {
          const arr = Array.isArray(data) ? data : data?.data ?? [];
          setRows(arr);
          setError(null);
        });
        return () => unsub();
      }
    }, [node.props?.dataSource, node.props?.url, node.props?.topic]);
    // 列配置增强
    const columns: Array<{
      key: string;
      title: string;
      width?: string | number;
      align?: 'left' | 'center' | 'right';
      sortable?: boolean;
      filterable?: boolean;
      render?: 'text' | 'link' | 'image' | 'badge' | 'date' | 'currency' | 'custom';
      format?: string; // 用于日期、货币等格式化
      ellipsis?: boolean; // 文本溢出省略
      fixed?: 'left' | 'right'; // 固定列
    }> = node.props?.columns ?? [];
    const paged = useMemo(() => {
      const start = (page - 1) * pageSize;
      return rows.slice(start, start + pageSize);
    }, [rows, page, pageSize]);
    
    // 分页器组件
    const renderPager = () => {
      if (!showPager) return null;
      
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      const sizeClass = pagerSize === 'small' ? 'text-xs' : pagerSize === 'large' ? 'text-base' : 'text-sm';
      const buttonSize = pagerSize === 'small' ? 'sm' : pagerSize === 'large' ? 'default' : 'sm';
      
      return (
        <div className={`flex items-center justify-between gap-2 ${sizeClass}`}>
          <div className="flex items-center gap-2">
            <Button 
              size={buttonSize} 
              variant="outline" 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(1)}
            >
              首页
            </Button>
            <Button 
              size={buttonSize} 
              variant="outline" 
              disabled={page <= 1 || loading} 
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
          </div>
          
          {showPageInfo && (
            <span className="text-muted-foreground whitespace-nowrap">
              第 {page} 页 / 共 {totalPages} 页 (共 {rows.length} 条)
            </span>
          )}
          
          <div className="flex items-center gap-2">
            <Button
              size={buttonSize}
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </Button>
            <Button
              size={buttonSize}
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(totalPages)}
            >
              末页
            </Button>
          </div>
          
          {showPageSizeSelector && (
            <Select value={String(pageSize)} onValueChange={(v) => {
              const newPageSize = Number(v);
              const newTotalPages = Math.ceil(rows.length / newPageSize);
              if (page > newTotalPages) {
                setPage(Math.max(1, newTotalPages));
              }
              // 这里需要通过事件更新pageSize
              if (node.props?.events) {
                (node.props.events as any[]).forEach((ev) => 
                  ev?.type === 'pageSizeChange' && ev?.handler && 
                  execHandler(ev.handler, { pageSize: newPageSize })
                );
              }
            }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(size => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    };
    // 渲染单元格内容
    const renderCellContent = (row: any, column: typeof columns[0]) => {
      const value = row?.[column.key];
      
      switch (column.render) {
        case 'link':
          return <a href={value} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{value}</a>;
        case 'image':
          return <img src={value} alt="" className="h-8 w-8 rounded object-cover" />;
        case 'badge':
          return <Badge variant="secondary">{value}</Badge>;
        case 'date':
          return new Date(value).toLocaleDateString('zh-CN', { 
            year: 'numeric', month: '2-digit', day: '2-digit' 
          });
        case 'currency':
          return `¥${Number(value || 0).toLocaleString()}`;
        default:
          return String(value ?? "");
      }
    };
    
    return (
      <div className="w-full space-y-2">
        {/* 顶部分页器 */}
        {(pagerPosition === 'top' || pagerPosition === 'both') && renderPager()}
        
        <div className="w-full overflow-x-auto">
          <Table className={node.props?.className}>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead 
                    key={c.key} 
                    className={cn(
                      node.props?.variant === "compact" && "px-1 py-0.5",
                      c.align === 'center' && "text-center",
                      c.align === 'right' && "text-right"
                    )}
                    style={{ width: c.width }}
                  >
                    <div className="flex items-center gap-1">
                      {c.title}
                      {c.sortable && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                    </div>
                  </TableHead>
                ))}
                {showActions && (
                  <TableHead className={cn(node.props?.variant === "compact" && "px-1 py-0.5")}>操作</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">加载中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-8">
                    <div className="text-red-500">
                      <div className="font-medium">加载失败</div>
                      <div className="text-sm text-muted-foreground mt-1">{error}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={cn(
                      "cursor-pointer",
                      selectedIndex === idx && "bg-accent/30",
                      node.props?.variant === "striped" && idx % 2 === 1 && "bg-muted/30"
                    )}
                    onClick={() => {
                      setSelectedIndex(idx);
                      if (node.props?.events)
                        (node.props.events as any[]).forEach((ev) => ev?.type === "rowClick" && ev?.handler && execHandler(ev.handler, { row }));
                      if (node.props?.events)
                        (node.props.events as any[]).forEach((ev) => ev?.type === "rowSelect" && ev?.handler && execHandler(ev.handler, { row }));
                    }}
                  >
                    {columns.map((c) => (
                      <TableCell 
                        key={c.key} 
                        className={cn(
                          node.props?.variant === "compact" && "px-1 py-0.5",
                          c.align === 'center' && "text-center",
                          c.align === 'right' && "text-right",
                          c.ellipsis && "truncate max-w-0"
                        )}
                      >
                        {renderCellContent(row, c)}
                      </TableCell>
                    ))}
                    {showActions && (
                      <TableCell className={cn(node.props?.variant === "compact" && "px-1 py-0.5")}>
                        <div className="flex items-center gap-1">
                          {actions.map((action: any, actionIdx: number) => (
                            <Button
                              key={actionIdx}
                              size="sm"
                              variant={action.variant || "ghost"}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (action.handler) {
                                  execHandler(action.handler, { row, action });
                                }
                              }}
                              className="h-6 px-2"
                            >
                              {action.icon && iconMap[action.icon] && (
                                <span className="mr-1">{iconMap[action.icon]}</span>
                              )}
                              {action.text}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* 底部分页器 */}
        {(pagerPosition === 'bottom' || pagerPosition === 'both') && renderPager()}
      </div>
    );
  },
  Transfer: (node) => {
    const dataSource = node.props?.dataSource || [
      { key: '1', title: '选项 1' },
      { key: '2', title: '选项 2' },
      { key: '3', title: '选项 3' },
      { key: '4', title: '选项 4' },
      { key: '5', title: '选项 5' }
    ];
    
    const [targetKeys, setTargetKeys] = useState<string[]>(node.props?.targetKeys || []);
    
    useEffect(() => {
      if (node.props?.required) {
        const { formValidationManager } = require('./utils/form-validation');
        formValidationManager.updateFieldValue(node.id, 'targetKeys', targetKeys);
      }
    }, [targetKeys, node.id, node.props?.required]);
    
    const handleChange = (newTargetKeys: string[], direction: 'left' | 'right', moveKeys: string[]) => {
      setTargetKeys(newTargetKeys);
      if (node.props?.events) {
        (node.props.events as any[]).forEach((ev) => 
          ev?.type === 'change' && ev?.handler && 
          execHandler(ev.handler, { targetKeys: newTargetKeys, direction, moveKeys })
        );
      }
    };
    
    return (
      <FormLabel 
        label={node.props?.label} 
        required={node.props?.required}
        className={node.props?.labelClassName}
        nodeId={node.id}
        fieldName="targetKeys"
      >
        <Transfer
          dataSource={dataSource}
          targetKeys={targetKeys}
          onChange={handleChange}
          titles={node.props?.titles || ['可选项', '已选项']}
          showSearch={node.props?.showSearch ?? true}
          searchPlaceholder={node.props?.searchPlaceholder || '搜索选项'}
          className={node.props?.className}
        />
      </FormLabel>
    );
   },
   Upload: (node) => {
     const [fileList, setFileList] = useState<any[]>(node.props?.fileList || []);
     
     useEffect(() => {
       if (node.props?.fieldName) {
         formValidationManager.updateFieldValue(node.id, node.props.fieldName, fileList);
       }
     }, [fileList, node.id, node.props?.fieldName]);
     
     const handleChange = (newFileList: any[]) => {
       setFileList(newFileList);
       if (node.props?.events) {
         (node.props.events as any[]).forEach((ev) => 
           ev?.type === 'change' && ev?.handler && 
           execHandler(ev.handler, { fileList: newFileList })
         );
       }
     };
     
     return (
       <FormLabel 
         label={node.props?.label} 
         required={node.props?.required}
         className={node.props?.labelClassName}
         nodeId={node.id}
         fieldName={node.props?.fieldName}
       >
         <Upload
           accept={node.props?.accept}
           multiple={node.props?.multiple ?? false}
           maxCount={node.props?.maxCount ?? 1}
           maxSize={node.props?.maxSize}
           fileList={fileList}
           onChange={handleChange}
           disabled={node.props?.disabled ?? false}
           listType={node.props?.listType ?? 'text'}
           showUploadList={node.props?.showUploadList ?? true}
           className={node.props?.className}
         />
       </FormLabel>
     );
   },
   Iframe: (node) => (
      <Iframe
        src={node.props?.src || 'https://example.com'}
        title={node.props?.title || 'Iframe'}
        width={node.props?.width || '100%'}
        height={node.props?.height || '400px'}
        loading={node.props?.loading || 'lazy'}
        sandbox={node.props?.sandbox}
        allowFullScreen={node.props?.allowFullScreen ?? false}
        showHeader={node.props?.showHeader ?? true}
        showRefresh={node.props?.showRefresh ?? true}
        showExternalLink={node.props?.showExternalLink ?? true}
        className={node.props?.className}
      />
    ),
    Tree: (node) => {
      const defaultTreeData = [
        {
          key: '1',
          title: '根节点 1',
          children: [
            {
              key: '1-1',
              title: '子节点 1-1',
              children: [
                { key: '1-1-1', title: '叶子节点 1-1-1', isLeaf: true },
                { key: '1-1-2', title: '叶子节点 1-1-2', isLeaf: true }
              ]
            },
            { key: '1-2', title: '子节点 1-2', isLeaf: true }
          ]
        },
        {
          key: '2',
          title: '根节点 2',
          children: [
            { key: '2-1', title: '子节点 2-1', isLeaf: true },
            { key: '2-2', title: '子节点 2-2', isLeaf: true }
          ]
        }
      ];

      return (
        <Tree
          treeData={node.props?.treeData || defaultTreeData}
          defaultExpandedKeys={node.props?.defaultExpandedKeys || ['1']}
          defaultSelectedKeys={node.props?.defaultSelectedKeys || []}
          showIcon={node.props?.showIcon ?? true}
          showLine={node.props?.showLine ?? false}
          checkable={node.props?.checkable ?? false}
          height={node.props?.height}
          className={node.props?.className}
          onSelect={(selectedKeys, info) => {
            if (node.props?.onSelect) {
              execHandler(node.props.onSelect, { selectedKeys, info });
            }
          }}
          onExpand={(expandedKeys, info) => {
            if (node.props?.onExpand) {
              execHandler(node.props.onExpand, { expandedKeys, info });
            }
          }}
          onCheck={(checkedKeys, info) => {
            if (node.props?.onCheck) {
              execHandler(node.props.onCheck, { checkedKeys, info });
            }
          }}
        />
      );
    },
    SubmitButton: (node, ctx) => {
      const handleSubmit = (isValid: boolean) => {
        if (node.props?.events) {
          (node.props.events as any[]).forEach((ev) => {
            if (ev?.type === 'submit' && ev?.handler) {
              execHandler(ev.handler, { isValid });
            }
          });
        }
      };
      
      const handleClick = () => {
        if (node.props?.events) {
          (node.props.events as any[]).forEach((ev) => {
            if (ev?.type === 'click' && ev?.handler) {
              execHandler(ev.handler, {});
            }
          });
        }
      };
      
      return (
        <SubmitButton
          variant={node.props?.variant || 'default'}
          size={node.props?.size || 'default'}
          className={node.props?.className}
          disabled={node.props?.disabled ?? false}
          rootNode={ctx.rootNode}
          onSubmit={handleSubmit}
          onClick={handleClick}
        >
          {node.props?.text || '提交'}
        </SubmitButton>
      );
    },
};

export function NodeRenderer({ node, ctx }: { node: NodeMeta; ctx: any }) {
  const Comp = registry[node.type];
  if (!Comp) return <div>未知组件: {node.type}</div>;

  if (!ctx?.design) {
    return (
      <div id={node.id} className={node.props?.className} style={node.props?.style}>
        {Comp(node, ctx)}
      </div>
    );
  }

  // Design mode wrapper: selection, drag, drop-before/after
  const [over, setOver] = useState(false);
  const droppable = node.type === "Container" || node.type === "Card" || node.type === "CollapsibleCard" || node.type === "ActionCard" || node.type === "InfoCard" || node.type === "StatsCard";
  
  const handleDragStart = (e: React.DragEvent) => {
    // 阻止事件冒泡，确保只有被直接拖拽的组件触发拖拽事件
    e.stopPropagation();
    
    // 检查是否在锁定容器内（但锁定容器本身可以拖拽）
    if (!node.locked && ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode)) {
      console.log("❌ [拖拽被阻止] 节点在锁定容器内", { nodeId: node.id, locked: node.locked });
      e.preventDefault();
      return; // 如果在锁定容器内，阻止拖拽
    }
    
    e.dataTransfer.setData("application/x-move", node.id);
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
    console.log("🚀 [拖拽开始] 详细信息:", {
      dragNodeId: node.id,
      dragNodeType: node.type,
      dragNodeClassName: node.props?.className,
      dataTransferTypes: Array.from(e.dataTransfer.types),
      effectAllowed: e.dataTransfer.effectAllowed,
      timestamp: new Date().toLocaleTimeString(),
      eventTarget: e.target,
      currentTarget: e.currentTarget
    });
    bus.publish("dnd.log", { action: "start", id: node.id, type: node.type });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    console.log("🎯 [拖拽进入]", {
      targetNodeId: node.id,
      targetNodeType: node.type,
      isDroppable: droppable,
      dataTransferTypes: types,
      willSetOver: droppable && (types.includes("application/x-move") || types.includes("application/x-node") || types.includes("application/x-custom-component"))
    });
    if (droppable && (types.includes("application/x-move") || types.includes("application/x-node") || types.includes("application/x-custom-component"))) {
      setOver(true);
    }
    if (types.includes("application/x-move") || types.includes("application/x-node") || types.includes("application/x-custom-component")) {
      bus.publish("dnd.log", { action: "enter", id: node.id });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set over to false if we're actually leaving this element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    const isActuallyLeaving = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
    console.log("🚪 [拖拽离开]", {
      targetNodeId: node.id,
      targetNodeType: node.type,
      mousePosition: { x, y },
      elementRect: rect,
      isActuallyLeaving,
      willSetOverFalse: isActuallyLeaving
    });
    if (isActuallyLeaving) {
      setOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    const canDrop = droppable && (types.includes("application/x-move") || types.includes("application/x-node") || types.includes("application/x-custom-component"));
    console.log("🔄 [拖拽悬停]", {
      targetNodeId: node.id,
      targetNodeType: node.type,
      isDroppable: droppable,
      dataTransferTypes: types,
      canDrop,
      willPreventDefault: canDrop
    });
    if (canDrop) {
      e.preventDefault();
      e.stopPropagation();
      try { 
        e.dataTransfer.dropEffect = types.includes("application/x-move") ? "move" : "copy"; 
      } catch {}
      bus.publish("dnd.log", { action: "over", id: node.id });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    setOver(false);
    const types = Array.from(e.dataTransfer.types);
    
    console.log("📦 [拖拽放置开始]", {
      targetNodeId: node.id,
      targetNodeType: node.type,
      isDroppable: droppable,
      dataTransferTypes: types
    });
    
    if (!droppable) {
      console.log("❌ [拖拽放置失败] 目标不可放置", { targetNodeId: node.id, targetNodeType: node.type });
      return;
    }
    
    if (types.includes("application/x-move")) {
      const dragId = e.dataTransfer.getData("application/x-move");
      console.log("🔄 [移动组件] 详细信息:", {
        dragId,
        dragNodeExists: !!dragId,
        targetId: node.id,
        targetType: node.type,
        targetClassName: node.props?.className,
        isSameNode: dragId === node.id,
        hasValidDragId: !!dragId,
        isDroppable: droppable,
        timestamp: new Date().toLocaleTimeString()
      });
      
      if (dragId && dragId !== node.id) {
        // 检查目标容器是否被锁定或在锁定容器内
        if (node.locked === true || (ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode))) {
          console.log("❌ [拖拽放置失败] 目标容器已锁定或在锁定容器内", { targetNodeId: node.id, locked: node.locked });
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // 获取被拖拽组件的原始父容器信息
        const findParent = (root: any, id: string): { parent: any | null; index: number } => {
          for (const [idx, child] of (root.children ?? []).entries()) {
            if (child.id === id) return { parent: root, index: idx };
            const r = findParent(child, id);
            if (r.parent) return r;
          }
          return { parent: null, index: -1 };
        };
        
        // 这里需要从上下文获取页面根节点来查找父容器
        // 由于我们在NodeRenderer中无法直接访问页面根节点，我们先记录基本信息
        console.log("✅ [执行移动操作 - 作为子元素] 详细信息:", { 
          dragId: dragId, 
          dragNodeType: "未知", // 需要从上下文获取
          originalParentId: "需要从moveAsChild函数中获取",
          newParentId: node.id,
          newParentType: node.type,
          moveAsChildExists: !!ctx.moveAsChild,
          contextKeys: Object.keys(ctx || {}),
          timestamp: new Date().toLocaleTimeString()
        });
        bus.publish("dnd.log", { action: "drop-move", from: dragId, to: node.id });
        
        if (ctx.moveAsChild) {
          console.log("🎯 [调用moveAsChild函数前] 参数检查:", { 
            dragId, 
            parentId: node.id,
            functionType: typeof ctx.moveAsChild,
            timestamp: new Date().toLocaleTimeString()
          });
          
          try {
            ctx.moveAsChild(dragId, node.id);
            console.log("✅ [moveAsChild函数调用成功]", {
              dragId,
              parentId: node.id,
              timestamp: new Date().toLocaleTimeString()
            });
          } catch (error) {
            console.error("❌ [moveAsChild函数调用失败]", {
              error: error.message,
              dragId,
              parentId: node.id,
              timestamp: new Date().toLocaleTimeString()
            });
          }
        } else {
          console.log("❌ [moveAsChild函数不存在] 上下文信息:", {
            contextKeys: Object.keys(ctx || {}),
            contextType: typeof ctx,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } else {
        console.log("❌ [移动操作被跳过]", { reason: dragId ? "相同节点" : "无效拖拽ID" });
      }
      return;
    }
    
    if (types.includes("application/x-node")) {
      const raw = e.dataTransfer.getData("application/x-node");
      console.log("🆕 [创建新组件]", { rawData: raw });
      try {
        const { type } = JSON.parse(raw || "{}");
        if (type) {
          // 检查目标容器是否被锁定或在锁定容器内
          if (node.locked === true || (ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode))) {
            console.log("❌ [创建组件失败] 目标容器已锁定或在锁定容器内", { targetNodeId: node.id, componentType: type, locked: node.locked });
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          console.log("✅ [执行创建操作]", { type, parentId: node.id });
          bus.publish("dnd.log", { action: "drop-create", type, to: node.id });
          
          if (ctx.createChild) {
            console.log("🎯 [调用createChild函数]", { parentId: node.id, componentType: type });
            ctx.createChild(node.id, String(type));
          } else {
            console.log("❌ [createChild函数不存在]");
          }
        } else {
          console.log("❌ [创建操作失败] 无效的组件类型", { parsedData: { type } });
        }
      } catch (error) {
        console.log("❌ [创建操作失败] JSON解析错误", { error, rawData: raw });
      }
    }
    
    if (types.includes("application/x-custom-component")) {
      const raw = e.dataTransfer.getData("application/x-custom-component");
      console.log("🆕 [创建自建组件]", { rawData: raw });
      try {
        const customComponent = JSON.parse(raw || "{}");
        if (customComponent && customComponent.component) {
          // 检查目标容器是否被锁定或在锁定容器内
          if (node.locked === true || (ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode))) {
            console.log("❌ [创建自建组件失败] 目标容器已锁定或在锁定容器内", { targetNodeId: node.id, componentName: customComponent.name, locked: node.locked });
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          console.log("✅ [执行自建组件创建操作]", { componentName: customComponent.name, parentId: node.id });
          bus.publish("dnd.log", { action: "drop-create-custom", name: customComponent.name, to: node.id });
          
          if (ctx.createCustomChild) {
            console.log("🎯 [调用createCustomChild函数]", { parentId: node.id, customComponent });
            ctx.createCustomChild(node.id, customComponent);
          } else {
            console.log("❌ [createCustomChild函数不存在]");
          }
        }
      } catch (err) {
        console.error("❌ [解析自建组件数据失败]", err);
      }
    }
    
    console.log("📦 [拖拽放置结束]");
  };

  const handleCopy = () => {
    if (ctx.onCopy) {
      ctx.onCopy(node.id);
    }
  };

  const handlePaste = () => {
    if (ctx.onPaste) {
      ctx.onPaste(node.id);
    }
  };

  const handleDelete = () => {
    if (ctx.onDelete) {
      ctx.onDelete(node.id);
    }
  };

  const handleDuplicate = () => {
    if (ctx.onDuplicate) {
      ctx.onDuplicate(node.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          id={node.id}
          data-node-id={node.id}
          data-type={node.type}
          className={cn(
            "relative",
            ctx.selectedId === node.id && "ring-2 ring-blue-500/60 rounded",
            droppable && over && "ring-2 ring-ring/60 rounded bg-accent/10",
            node.props?.className,
          )}
          draggable={node.locked || !(ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode))} // 锁定容器本身可拖拽，但其子组件不可拖拽
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={(e) => {
            e.stopPropagation();
            // 检查节点是否在锁定容器内（但锁定容器本身可以选择）
            if (ctx.rootNode && isNodeInLockedContainer(node.id, ctx.rootNode) && !node.locked) {
              console.log("❌ [选择被阻止] 节点在锁定容器内", { nodeId: node.id });
              return; // 如果在锁定容器内且不是锁定容器本身，阻止选择
            }
            ctx.onSelect?.(node.id);
          }}
          style={node.props?.style}
        >
      {/* before drop zone */}
      {(
        <div
          className="absolute -top-2 left-0 right-0 h-3 z-10"
          onDragOver={(e) => {
            if (Array.from(e.dataTransfer.types).includes("application/x-move")) {
              e.preventDefault();
              e.stopPropagation();
              try { e.dataTransfer.dropEffect = "move"; } catch {}
            }
          }}
          onDrop={(e) => {
            const dragId = e.dataTransfer.getData("application/x-move");
            if (dragId && dragId !== node.id) {
              e.preventDefault();
              e.stopPropagation();
              console.debug("dnd.drop.before", { from: dragId, before: node.id });
              bus.publish("dnd.log", { action: "drop-before", from: dragId, before: node.id });
              ctx.moveBeforeAfter?.(dragId, node.id, "before");
            }
          }}
        />
      )}
      
      {/* Component content */}
      <div className="relative">
        {Comp(node, { ...ctx })}
      </div>
      
      {/* after drop zone */}
      {(
        <div
          className="absolute -bottom-2 left-0 right-0 h-3 z-10"
          onDragOver={(e) => {
            if (Array.from(e.dataTransfer.types).includes("application/x-move")) {
              e.preventDefault();
              e.stopPropagation();
              try { e.dataTransfer.dropEffect = "move"; } catch {}
            }
          }}
          onDrop={(e) => {
            const dragId = e.dataTransfer.getData("application/x-move");
            if (dragId && dragId !== node.id) {
              e.preventDefault();
              e.stopPropagation();
              console.debug("dnd.drop.after", { from: dragId, after: node.id });
              bus.publish("dnd.log", { action: "drop-after", from: dragId, after: node.id });
              ctx.moveBeforeAfter?.(dragId, node.id, "after");
            }
          }}
        />
      )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleCopy}>
          复制组件
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste}>
          粘贴组件
        </ContextMenuItem>
        {["Container", "Card", "CollapsibleCard", "ActionCard", "InfoCard", "StatsCard"].includes(node.type) && (
          <ContextMenuItem onClick={handleDuplicate}>
            另存为自建组件
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-red-600">
          删除组件
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

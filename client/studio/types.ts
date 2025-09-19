import { generateUUID } from "@/lib/utils";
import { getDefaultSpacing } from "./utils/spacing";

export type NodeId = string;

export type ComponentType =
  | "Container"
  | "Grid"
  | "GridItem"
  | "Label"
  | "Button"
  | "Card"
  | "CollapsibleCard"
  | "ActionCard"
  | "InfoCard"
  | "StatsCard"
  | "Badge"
  | "Input"
  | "Textarea"
  | "Switch"
  | "Slider"
  | "Separator"
  | "Avatar"
  | "Progress"
  | "Skeleton"
  | "Tooltip"
  | "Popover"
  | "Dialog"
  | "Alert"
  | "Table"
  | "EditableTable"
  | "Listener"
  | "Accordion"
  | "Collapsible"
  | "Tabs"
  | "Command"
  | "Select"
  | "HoverCard"
  | "Drawer"
  | "Sheet"
  | "Transfer"
  | "Upload"
  | "Iframe"
  | "Tree"
  | "FormLabel"
  | "SubmitButton"
  | "ScriptEditor"
  | "EventListener";

// Tailwind CSS 间距值类型
export type SpacingValue = "0" | "px" | "0.5" | "1" | "1.5" | "2" | "2.5" | "3" | "3.5" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "14" | "16" | "20" | "24" | "28" | "32" | "36" | "40" | "44" | "48" | "52" | "56" | "60" | "64" | "72" | "80" | "96";

// 间距配置接口
export interface SpacingConfig {
  top?: SpacingValue;
  right?: SpacingValue;
  bottom?: SpacingValue;
  left?: SpacingValue;
  x?: SpacingValue; // 水平方向（left + right）
  y?: SpacingValue; // 垂直方向（top + bottom）
  all?: SpacingValue; // 所有方向
}

export interface NodeMeta {
  id: NodeId;
  type: ComponentType;
  code?: string; // 组件编码（唯一标识，可用于数据绑定/resolvefetch）
  props?: Record<string, any>;
  children?: NodeMeta[];
  layout?: "row" | "col" | "grid";
  flexEnabled?: boolean; // 控制行/列布局是否使用flex自适应
  alignItems?: "start" | "center" | "end" | "stretch"; // 控制容器内容对齐方式
  locked?: boolean; // 控制容器是否锁定（锁定后子组件不可选择修改）
  resizable?: boolean; // 控制容器分栏是否可调整
  resizableEnabled?: boolean; // 控制分栏调整功能是否启用
  panelSizes?: number[]; // 存储分栏大小（百分比）
  gridCols?: number; // Grid布局的列数
  gridRows?: number; // Grid布局的行数
  gridGap?: number; // Grid布局的间距
  style?: Record<string, any>; // 内联样式
  margin?: SpacingConfig; // 外边距配置
  padding?: SpacingConfig; // 内边距配置
}

export type TemplateKind = "blank" | "content" | "vscode" | "landing" | "email" | "home" | "admin" | "grid" | "dashboard";

export interface PageMeta {
  id: string;
  name: string;
  description?: string;
  template: TemplateKind;
  root: NodeMeta; // root container
  createdAt: number;
  updatedAt: number;
}

// 自建组件库相关类型
export interface CustomComponent {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string; // 预览图片的base64或URL
  component: NodeMeta; // 保存的组件结构
  createdAt: number;
  updatedAt: number;
}

export function createNode(type: ComponentType, partial?: Partial<NodeMeta>): NodeMeta {
  // 获取默认间距配置
  const defaultSpacing = getDefaultSpacing(type);
  
  const baseNode = {
    id: generateUUID(),
    type,
    code: partial?.code ?? "",
    props: {},
    children: [],
    layout: (type === "Container" ? "grid" : "col") as "row" | "col" | "grid", // Container默认使用grid布局
    locked: false, // 默认不锁定
    resizable: true, // 默认可调整分栏
    panelSizes: [], // 默认空数组，会根据子组件数量自动计算
    gridCols: type === "Container" ? 3 : undefined, // Container默认3列
    gridRows: type === "Container" ? undefined : undefined, // 行数自动
    gridGap: type === "Container" ? 4 : undefined, // 默认间距4
    margin: defaultSpacing.margin, // 设置默认外边距
    padding: defaultSpacing.padding, // 设置默认内边距
    ...partial,
  };
  
  return baseNode;
}

export function createPage(name: string, template: TemplateKind): PageMeta {
  const root = createNode("Container", { layout: "col" });
  // Pre-seed containers based on template
  if (template === "content") {
    root.layout = "col";
    root.children = [
      createNode("Container", { props: { title: "内容头部", className: "h-[60px] min-h-[60px]" }, layout: "row" }),
      createNode("Container", { props: { title: "内容主体" }, layout: "col" }),
    ];
  } else if (template === "vscode") {
    root.layout = "col";
    root.children = [
      // 顶部标题栏
      createNode("Container", { 
        props: { title: "标题栏", className: "h-[40px] min-h-[40px] bg-slate-800 text-white border-b border-slate-600" }, 
        layout: "row" 
      }),
      // 主体区域 - 可调整分栏
      createNode("Container", {
        layout: "row",
        resizable: true,
        resizableEnabled: true,
        panelSizes: [15, 85], // 侧边栏15%，主区域85%
        children: [
          // 左侧面板区域
          createNode("Container", {
            layout: "row",
            resizable: true,
            resizableEnabled: true,
            panelSizes: [20, 80], // 活动栏20%，文件浏览器80%
            children: [
              // 活动栏
              createNode("Container", { 
                props: { title: "活动栏", className: "min-w-[48px] bg-slate-900 border-r border-slate-600" }, 
                layout: "col" 
              }),
              // 文件浏览器
              createNode("Container", { 
                props: { title: "资源管理器", className: "min-w-[200px] bg-slate-800 border-r border-slate-600" }, 
                layout: "col" 
              }),
            ],
          }),
          // 编辑器区域 - 可调整分栏
          createNode("Container", {
            layout: "col",
            resizable: true,
            resizableEnabled: true,
            panelSizes: [75, 25], // 编辑器75%，底部面板25%
            children: [
              // 编辑器主体
              createNode("Container", { 
                props: { title: "编辑器", className: "min-h-[300px] bg-slate-700" }, 
                layout: "col" 
              }),
              // 底部面板
              createNode("Container", { 
                props: { title: "终端", className: "min-h-[120px] bg-slate-800 border-t border-slate-600" }, 
                layout: "col" 
              }),
            ],
          }),
        ],
      }),
    ];
  } else if (template === "landing") {
    root.layout = "col";
    root.children = [
      createNode("Container", { props: { title: "头部", className: "h-[60px] min-h-[60px] flex-shrink-0" } }),
      createNode("Container", { props: { title: "主体", className: "flex-1 min-h-0" } }),
    ];
  } else if (template === "email") {
    root.layout = "row";
    root.children = [
      createNode("Container", { props: { title: "左侧导航" }, layout: "col" }),
      createNode("Container", { props: { title: "正文" }, layout: "col" }),
    ];
  } else if (template === "home") {
    root.layout = "col";
    root.children = [
      createNode("Container", { props: { title: "顶部 Banner", className: "h-[60px] min-h-[60px]" } }),
      createNode("Container", { props: { title: "主页内容" } }),
    ];
  } else if (template === "admin") {
    root.layout = "col";
    root.children = [
      createNode("Container", { props: { title: "顶部导航", className: "h-[60px] min-h-[60px]" } }),
      createNode("Container", {
        layout: "row",
        children: [
          createNode("Container", { props: { title: "侧边栏" }, layout: "col" }),
          createNode("Container", { props: { title: "工作区" }, layout: "col" }),
        ],
      }),
    ];
  } else if (template === "grid") {
    root.layout = "col";
    root.children = [
      createNode("Grid", {
        props: { 
          title: "栅格布局", 
          cols: 12, 
          gap: 4, 
          responsive: true 
        },
        children: [
          createNode("GridItem", { props: { title: "栅格项 1", span: 6 } }),
          createNode("GridItem", { props: { title: "栅格项 2", span: 6 } }),
          createNode("GridItem", { props: { title: "栅格项 3", span: 4 } }),
          createNode("GridItem", { props: { title: "栅格项 4", span: 8 } }),
        ],
      }),
    ];
  } else if (template === "dashboard") {
    root.layout = "col";
    root.children = [
      createNode("Container", { props: { title: "顶部导航", className: "h-[60px] min-h-[60px]" } }),
      createNode("Grid", {
        props: { 
          title: "仪表板内容", 
          cols: 12, 
          gap: 6, 
          responsive: true 
        },
        children: [
          createNode("GridItem", { props: { title: "统计卡片 1", span: 3, smSpan: 6, mdSpan: 4 } }),
          createNode("GridItem", { props: { title: "统计卡片 2", span: 3, smSpan: 6, mdSpan: 4 } }),
          createNode("GridItem", { props: { title: "统计卡片 3", span: 3, smSpan: 6, mdSpan: 4 } }),
          createNode("GridItem", { props: { title: "统计卡片 4", span: 3, smSpan: 6, mdSpan: 4 } }),
          createNode("GridItem", { props: { title: "图表区域", span: 8, smSpan: 12, mdSpan: 8 } }),
          createNode("GridItem", { props: { title: "侧边信息", span: 4, smSpan: 12, mdSpan: 4 } }),
        ],
      }),
    ];
  }

  const now = Date.now();
  return { id: generateUUID(), name, template, root, createdAt: now, updatedAt: now };
}

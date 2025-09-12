export type NodeId = string;

export type ComponentType =
  | "Container"
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
  | "Tree";

export interface NodeMeta {
  id: NodeId;
  type: ComponentType;
  code?: string; // 组件编码（唯一标识，可用于数据绑定/resolvefetch）
  props?: Record<string, any>;
  children?: NodeMeta[];
  layout?: "row" | "col";
  locked?: boolean; // 控制容器是否锁定（锁定后子组件不可选择修改）
  resizable?: boolean; // 控制容器分栏是否可调整
  resizableEnabled?: boolean; // 控制分栏调整功能是否启用
  panelSizes?: number[]; // 存储分栏大小（百分比）
  style?: Record<string, any>; // 内联样式
}

export type TemplateKind = "blank" | "cms" | "landing" | "email" | "home" | "admin";

export interface PageMeta {
  id: string;
  name: string;
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
  return {
    id: crypto.randomUUID(),
    type,
    code: partial?.code ?? "",
    props: {},
    children: [],
    layout: "col",
    locked: false, // 默认不锁定
    resizable: true, // 默认可调整分栏
    panelSizes: [], // 默认空数组，会根据子组件数量自动计算
    ...partial,
  };
}

export function createPage(name: string, template: TemplateKind): PageMeta {
  const root = createNode("Container", { layout: "col" });
  // Pre-seed containers based on template
  if (template === "cms") {
    root.layout = "row";
    root.children = [
      createNode("Container", { props: { title: "侧边栏" }, layout: "col" }),
      createNode("Container", { props: { title: "内容区" }, layout: "col" }),
    ];
  } else if (template === "landing") {
    root.layout = "col";
    root.children = [
      createNode("Container", { props: { title: "头部", className: "h-[60px] min-h-[60px]" } }),
      createNode("Container", { props: { title: "主体" } }),
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
  }

  const now = Date.now();
  return { id: crypto.randomUUID(), name, template, root, createdAt: now, updatedAt: now };
}

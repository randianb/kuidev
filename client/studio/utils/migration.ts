import type { NodeMeta, PageMeta } from "../types";
import { getDefaultSpacing } from "./spacing";

/**
 * 为节点添加默认间距配置（如果没有的话）
 */
function addDefaultSpacingToNode(node: NodeMeta): NodeMeta {
  const defaultSpacing = getDefaultSpacing(node.type);
  
  return {
    ...node,
    // 只有当 margin 或 padding 为 undefined 时才设置默认值
    margin: node.margin || defaultSpacing.margin,
    padding: node.padding || defaultSpacing.padding,
    // 递归处理子节点
    children: node.children?.map(addDefaultSpacingToNode) || []
  };
}

/**
 * 为页面中的所有组件添加默认间距配置
 */
export function migratePageSpacing(page: PageMeta): PageMeta {
  return {
    ...page,
    root: addDefaultSpacingToNode(page.root),
    updatedAt: Date.now()
  };
}

/**
 * 为所有页面添加默认间距配置
 */
export function migrateAllPagesSpacing(pages: PageMeta[]): PageMeta[] {
  return pages.map(migratePageSpacing);
}
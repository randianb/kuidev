import type { SpacingConfig, SpacingValue } from "../types";

/**
 * 将间距配置转换为 Tailwind CSS 类名
 * @param config 间距配置
 * @param prefix 前缀 ('m' for margin, 'p' for padding)
 * @returns Tailwind CSS 类名数组
 */
export function spacingConfigToClasses(config: SpacingConfig | undefined, prefix: 'm' | 'p'): string[] {
  if (!config) return [];
  
  const classes: string[] = [];
  
  // 处理 all 属性（优先级最低）
  if (config.all) {
    classes.push(`${prefix}-${config.all}`);
  }
  
  // 处理 x 和 y 属性（会覆盖 all）
  if (config.x) {
    classes.push(`${prefix}x-${config.x}`);
  }
  if (config.y) {
    classes.push(`${prefix}y-${config.y}`);
  }
  
  // 处理具体方向属性（优先级最高，会覆盖 all、x、y）
  if (config.top) {
    classes.push(`${prefix}t-${config.top}`);
  }
  if (config.right) {
    classes.push(`${prefix}r-${config.right}`);
  }
  if (config.bottom) {
    classes.push(`${prefix}b-${config.bottom}`);
  }
  if (config.left) {
    classes.push(`${prefix}l-${config.left}`);
  }
  
  return classes;
}

/**
 * 获取组件的完整间距类名
 * @param margin 外边距配置
 * @param padding 内边距配置
 * @returns 完整的 Tailwind CSS 类名字符串
 */
export function getSpacingClasses(margin?: SpacingConfig, padding?: SpacingConfig): string {
  const marginClasses = spacingConfigToClasses(margin, 'm');
  const paddingClasses = spacingConfigToClasses(padding, 'p');
  
  return [...marginClasses, ...paddingClasses].join(' ');
}

/**
 * 获取不同组件类型的默认间距配置
 * @param componentType 组件类型
 * @returns 默认的 margin 和 padding 配置
 */
export function getDefaultSpacing(componentType: string): { margin?: SpacingConfig; padding?: SpacingConfig } {
  const defaults: Record<string, { margin?: SpacingConfig; padding?: SpacingConfig }> = {
    // 容器类组件
    Container: {
      // 移除默认内边距，让用户自行设置
    },
    Card: {
      margin: { all: "2" },
      padding: { all: "4" }
    },
    CollapsibleCard: {
      margin: { all: "2" },
      padding: { all: "4" }
    },
    ActionCard: {
      margin: { all: "2" },
      padding: { all: "4" }
    },
    InfoCard: {
      margin: { all: "2" },
      padding: { all: "4" }
    },
    StatsCard: {
      margin: { all: "2" },
      padding: { all: "4" }
    },
    
    // 表单组件
    Input: {
      margin: { y: "2" }
    },
    Textarea: {
      margin: { y: "2" }
    },
    Switch: {
      margin: { y: "2" }
    },
    Slider: {
      margin: { y: "3" }
    },
    Select: {
      margin: { y: "2" }
    },
    
    // 按钮组件
    Button: {
      margin: { all: "1" }
    },
    SubmitButton: {
      margin: { all: "1" }
    },
    
    // 文本组件
    Label: {
      margin: { bottom: "1" }
    },
    FormLabel: {
      margin: { bottom: "1" }
    },
    
    // 显示组件
    Badge: {
      margin: { all: "0.5" }
    },
    Avatar: {
      margin: { all: "1" }
    },
    Progress: {
      margin: { y: "2" }
    },
    Skeleton: {
      margin: { y: "2" }
    },
    
    // 分隔组件
    Separator: {
      margin: { y: "4" }
    },
    
    // 表格组件
    Table: {
      margin: { y: "4" }
    },
    EditableTable: {
      margin: { y: "4" }
    },
    
    // 布局组件
    Grid: {
      padding: { all: "2" }
    },
    GridItem: {
      padding: { all: "2" }
    },
    
    // 交互组件
    Alert: {
      margin: { y: "3" },
      padding: { all: "4" }
    },
    
    // Header 组件不需要默认间距
    Header: {
      margin: { all: "0" }
    },
    
    // 其他组件使用最小间距
    default: {
      margin: { all: "1" }
    }
  };
  
  return defaults[componentType] || defaults.default;
}

/**
 * 合并用户配置和默认配置
 * @param userConfig 用户配置
 * @param defaultConfig 默认配置
 * @returns 合并后的配置
 */
export function mergeSpacingConfig(
  userConfig?: SpacingConfig, 
  defaultConfig?: SpacingConfig
): SpacingConfig | undefined {
  if (!userConfig && !defaultConfig) return undefined;
  if (!userConfig) return defaultConfig;
  if (!defaultConfig) return userConfig;
  
  return {
    ...defaultConfig,
    ...userConfig
  };
}
import { bus } from './eventBus';

/**
 * 处理器类型定义
 */
export interface HandlerType {
  name: string;
  description: string;
  eventTypes: string[];
  exampleCode: {
    curl: string;
    javascript: string;
    description: string;
  };
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    defaultValue?: any;
  }[];
}

/**
 * 预定义的处理器类型
 */
export const HANDLER_TYPES: Record<string, HandlerType> = {
  resolvefetch: {
    name: 'resolvefetch',
    description: '获取和处理表单数据',
    eventTypes: ['form.data.resolved', 'form.data.error'],
    exampleCode: {
      curl: 'curl "http://localhost:8080/api/resolve-form?code=baseCard"',
      javascript: `execHandler('resolvefetch', { code: 'baseCard' });`,
      description: '获取基础卡片的模板数据'
    },
    parameters: [
      { name: 'code', type: 'string', required: true, description: '卡片或组件代码' },
      { name: 'id', type: 'string', required: false, description: '数据ID' },
      { name: 'type', type: 'string', required: false, description: '数据类型', defaultValue: 'form' },
      { name: 'getFormData', type: 'boolean', required: false, description: '获取实际表单数据', defaultValue: false },
      { name: 'sendFormData', type: 'boolean', required: false, description: '发送表单数据到后端', defaultValue: false },
      { name: 'returnFormData', type: 'boolean', required: false, description: '直接返回表单数据', defaultValue: false }
    ]
  },
  log: {
    name: 'log',
    description: '日志输出处理器',
    eventTypes: ['log.message'],
    exampleCode: {
      curl: '# log 处理器不支持 HTTP 调用',
      javascript: `execHandler('log', { message: 'Hello World', level: 'info' });`,
      description: '输出日志信息到控制台'
    },
    parameters: [
      { name: 'message', type: 'string', required: true, description: '日志消息' },
      { name: 'level', type: 'string', required: false, description: '日志级别', defaultValue: 'info' }
    ]
  },
  publish: {
    name: 'publish',
    description: '事件发布处理器',
    eventTypes: ['custom.event'],
    exampleCode: {
      curl: '# publish 处理器不支持 HTTP 调用',
      javascript: `execHandler('publish', { topic: 'custom.event', payload: { data: 'test' } });`,
      description: '发布自定义事件到事件总线'
    },
    parameters: [
      { name: 'topic', type: 'string', required: true, description: '事件主题' },
      { name: 'payload', type: 'any', required: false, description: '事件载荷数据' }
    ]
  },
  setTextById: {
    name: 'setTextById',
    description: '设置元素文本内容',
    eventTypes: ['dom.text.updated'],
    exampleCode: {
      curl: '# setTextById 处理器不支持 HTTP 调用',
      javascript: `execHandler('setTextById', { id: 'element-id', text: 'New Text' });`,
      description: '设置指定元素的文本内容'
    },
    parameters: [
      { name: 'id', type: 'string', required: true, description: '元素ID' },
      { name: 'text', type: 'string', required: true, description: '要设置的文本内容' }
    ]
  },
  openDialog: {
    name: 'openDialog',
    description: '打开对话框/弹窗',
    eventTypes: ['dialog.open', 'dialog.show'],
    exampleCode: {
      curl: '# openDialog 处理器不支持 HTTP 调用',
      javascript: `// 文本内容对话框
execHandler('openDialog', {
  title: '确认操作',
  contentType: 'text',
  content: '您确定要执行此操作吗？',
  type: 'confirm',
  size: 'medium'
});

// 页面内容对话框
execHandler('openDialog', {
  title: '用户详情',
  contentType: 'page',
  pageId: 'user-detail-page',
  pageName: '用户详情页面',
  size: 'large'
});`,
      description: '打开一个对话框，支持文本内容或显示其他页面'
    },
    parameters: [
      { name: 'title', type: 'string', required: false, description: '对话框标题', defaultValue: '提示' },
      { name: 'contentType', type: 'string', required: false, description: '内容类型：text(文本) 或 page(页面)', defaultValue: 'text' },
      { name: 'content', type: 'string', required: false, description: '对话框内容/消息（当contentType为text时使用）', defaultValue: '' },
      { name: 'pageId', type: 'string', required: false, description: '要显示的页面ID（当contentType为page时使用）' },
      { name: 'pageName', type: 'string', required: false, description: '要显示的页面名称（当contentType为page时使用）' },
      { name: 'type', type: 'string', required: false, description: '对话框类型', defaultValue: 'info' },
      { name: 'size', type: 'string', required: false, description: '对话框大小', defaultValue: 'medium' },
      { name: 'showCloseButton', type: 'boolean', required: false, description: '显示关闭按钮', defaultValue: true },
      { name: 'backdrop', type: 'boolean', required: false, description: '显示背景遮罩', defaultValue: true },
      { name: 'keyboard', type: 'boolean', required: false, description: '支持键盘ESC关闭', defaultValue: true },
      { name: 'autoClose', type: 'number', required: false, description: '自动关闭时间(毫秒)' },
      { name: 'onConfirm', type: 'string', required: false, description: '确认按钮回调脚本' },
      { name: 'onCancel', type: 'string', required: false, description: '取消按钮回调脚本' },
      { name: 'confirmText', type: 'string', required: false, description: '确认按钮文本', defaultValue: '确定' },
      { name: 'cancelText', type: 'string', required: false, description: '取消按钮文本', defaultValue: '取消' },
      { name: 'icon', type: 'string', required: false, description: '对话框图标' },
      { name: 'className', type: 'string', required: false, description: '自定义CSS类名' }
    ]
  },
  navigate: {
    name: 'navigate',
    description: '页面导航处理器',
    eventTypes: ['page.navigate'],
    exampleCode: {
      curl: '# navigate 处理器不支持 HTTP 调用',
      javascript: `// 导航到内部页面（预览模式）
execHandler('navigate', {
  type: 'internal',
  pageId: '3a690afe-fa78-46b3-b32c-e078e3dfdbdb',
  pageName: '用户列表页面'
});

// 导航到外部URL（新窗口）
execHandler('navigate', {
  type: 'external',
  url: 'https://example.com',
  target: '_blank'
});

// 导航到外部URL（当前窗口）
execHandler('navigate', {
  type: 'external',
  url: 'https://example.com',
  target: '_self'
});

// 替换当前页面历史记录
execHandler('navigate', {
  type: 'internal',
  pageId: 'dashboard-page-id',
  replace: true
});`,
      description: '导航到指定页面或URL，支持内部页面预览和外部链接'
    },
    parameters: [
      { name: 'type', type: 'string', required: false, description: '导航类型：internal(内部页面) 或 external(外部URL)', defaultValue: 'internal' },
      { name: 'pageId', type: 'string', required: false, description: '目标页面ID（内部导航时使用）' },
      { name: 'pageName', type: 'string', required: false, description: '目标页面名称（内部导航时使用）' },
      { name: 'url', type: 'string', required: false, description: '外部URL地址（外部导航时使用）' },
      { name: 'target', type: 'string', required: false, description: '打开方式：_self(当前窗口) 或 _blank(新窗口)', defaultValue: '_self' },
      { name: 'replace', type: 'boolean', required: false, description: '是否替换当前历史记录', defaultValue: false }
    ]
  }
};

/**
 * 事件处理器管理器
 */
export class EventHandlerManager {
  private subscribers = new Map<string, Set<(data: any) => void>>();

  /**
   * 订阅事件
   */
  subscribe(eventType: string, handler: (data: any) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    // 同时订阅事件总线
    const unsubscribe = bus.subscribe(eventType, handler);

    // 返回取消订阅函数
    return () => {
      this.subscribers.get(eventType)?.delete(handler);
      unsubscribe();
    };
  }

  /**
   * 根据处理器类型生成示例代码
   */
  generateExampleCode(handlerName: string, customParams?: Record<string, any>): {
    curl: string;
    javascript: string;
    description: string;
  } {
    const handlerType = HANDLER_TYPES[handlerName];
    if (!handlerType) {
      return {
        curl: `# 未知处理器: ${handlerName}`,
        javascript: `execHandler('${handlerName}', {});`,
        description: '未知处理器类型'
      };
    }

    // 构建参数对象
    const params: Record<string, any> = {};
    handlerType.parameters.forEach(param => {
      if (customParams && customParams[param.name] !== undefined) {
        params[param.name] = customParams[param.name];
      } else if (param.defaultValue !== undefined) {
        params[param.name] = param.defaultValue;
      } else if (param.required) {
        // 为必需参数提供示例值
        switch (param.name) {
          case 'code':
            params[param.name] = 'baseCard';
            break;
          case 'id':
            params[param.name] = 'element-id';
            break;
          case 'message':
            params[param.name] = 'Hello World';
            break;
          case 'topic':
            params[param.name] = 'custom.event';
            break;
          case 'text':
            params[param.name] = 'New Text';
            break;
          default:
            params[param.name] = `example_${param.name}`;
        }
      }
    });

    // 生成 JavaScript 代码
    const jsParams = JSON.stringify(params, null, 2).replace(/\n/g, '\n  ');
    const javascript = `execHandler('${handlerName}', ${jsParams});`;

    // 生成 curl 代码（仅对 resolvefetch 有效）
    let curl = handlerType.exampleCode.curl;
    if (handlerName === 'resolvefetch' && customParams) {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== false) {
          urlParams.append(key, String(value));
        }
      });
      curl = `curl "http://localhost:8080/api/resolve-form?${urlParams.toString()}"`;
    }

    return {
      curl,
      javascript,
      description: handlerType.description
    };
  }

  /**
   * 获取处理器的事件类型
   */
  getEventTypes(handlerName: string): string[] {
    return HANDLER_TYPES[handlerName]?.eventTypes || [];
  }

  /**
   * 获取所有可用的处理器类型
   */
  getAvailableHandlers(): HandlerType[] {
    return Object.values(HANDLER_TYPES);
  }

  /**
   * 获取处理器参数定义
   */
  getHandlerParameters(handlerName: string) {
    return HANDLER_TYPES[handlerName]?.parameters || [];
  }
}

// 全局实例
export const eventHandlerManager = new EventHandlerManager();
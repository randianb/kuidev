export type Handler<T = any> = (payload: T) => void;

// 导航事件类型定义
export interface NavigateToPageEvent {
  pageId: string;
  // 可选的额外参数
  options?: {
    // 是否保存当前页面状态
    saveCurrentPage?: boolean;
    // 是否清空历史记录
    clearHistory?: boolean;
    // 是否更新URL
    updateUrl?: boolean;
  };
}

// 事件主题常量
export const EVENT_TOPICS = {
  NAVIGATE_TO_PAGE: 'navigate-to-page',
  PAGE_CHANGED: 'page-changed',
} as const;

class EventBus {
  private topics = new Map<string, Set<Handler>>();

  subscribe(topic: string, handler: Handler) {
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic)!.add(handler);
    return () => this.unsubscribe(topic, handler);
  }

  unsubscribe(topic: string, handler: Handler) {
    this.topics.get(topic)?.delete(handler);
  }

  publish<T = any>(topic: string, payload?: T) {
    this.topics.get(topic)?.forEach((h) => h(payload));
  }
}

export const bus = new EventBus();

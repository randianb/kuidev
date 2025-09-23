import { bus } from "./eventBus";

export interface NavigationHistoryItem {
  pageId: string;
  pageName?: string;
  url: string;
  timestamp: number;
  title?: string;
}

class NavigationHistoryManager {
  private history: NavigationHistoryItem[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 10;

  constructor() {
    // 监听页面导航事件，自动记录历史
    bus.subscribe('page.navigate', (payload: any) => {
      if (payload?.pageId) {
        this.addToHistory({
          pageId: payload.pageId,
          pageName: payload.pageName,
          url: `/preview/${encodeURIComponent(payload.pageId)}`,
          timestamp: Date.now(),
          title: payload.pageName || payload.pageId
        });
      }
    });
  }

  /**
   * 添加新的历史记录项
   */
  addToHistory(item: NavigationHistoryItem) {
    // 如果当前不在历史记录的末尾，删除当前位置之后的所有记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 检查是否与当前页面相同，避免重复记录
    const currentItem = this.getCurrentItem();
    if (currentItem && currentItem.pageId === item.pageId) {
      return;
    }

    // 添加新记录
    this.history.push(item);
    this.currentIndex = this.history.length - 1;

    // 保持历史记录大小限制
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    // 发布历史记录更新事件
    this.publishHistoryUpdate();
  }

  /**
   * 后退到上一页
   */
  goBack(): NavigationHistoryItem | null {
    if (this.canGoBack()) {
      this.currentIndex--;
      const item = this.getCurrentItem();
      if (item) {
        this.publishHistoryUpdate();
        return item;
      }
    }
    return null;
  }

  /**
   * 前进到下一页
   */
  goForward(): NavigationHistoryItem | null {
    if (this.canGoForward()) {
      this.currentIndex++;
      const item = this.getCurrentItem();
      if (item) {
        this.publishHistoryUpdate();
        return item;
      }
    }
    return null;
  }

  /**
   * 检查是否可以后退
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以前进
   */
  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取当前历史记录项
   */
  getCurrentItem(): NavigationHistoryItem | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * 获取完整历史记录
   */
  getHistory(): NavigationHistoryItem[] {
    return [...this.history];
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this.history = [];
    this.currentIndex = -1;
    this.publishHistoryUpdate();
  }

  /**
   * 设置最大历史记录大小
   */
  setMaxHistorySize(size: number) {
    this.maxHistorySize = Math.max(1, size);
    
    // 如果当前历史记录超过新的大小限制，截断
    if (this.history.length > this.maxHistorySize) {
      const removeCount = this.history.length - this.maxHistorySize;
      this.history.splice(0, removeCount);
      this.currentIndex = Math.max(0, this.currentIndex - removeCount);
      this.publishHistoryUpdate();
    }
  }

  /**
   * 发布历史记录更新事件
   */
  private publishHistoryUpdate() {
    bus.publish('navigation.history.updated', {
      history: this.getHistory(),
      currentIndex: this.currentIndex,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward(),
      currentItem: this.getCurrentItem()
    });
  }

  /**
   * 初始化当前页面到历史记录
   */
  initializeCurrentPage(pageId: string, pageName?: string) {
    if (this.history.length === 0) {
      this.addToHistory({
        pageId,
        pageName,
        url: `/preview/${encodeURIComponent(pageId)}`,
        timestamp: Date.now(),
        title: pageName || pageId
      });
    }
  }
}

// 创建全局实例
export const navigationHistory = new NavigationHistoryManager();

// 导出类型和实例
export default navigationHistory;
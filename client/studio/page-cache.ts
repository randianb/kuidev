import type { PageMeta } from "./types";
import { loadPages, savePages, upsertPage as originalUpsertPage } from "./storage";

class PageCacheManager {
  private cache: Map<string, PageMeta> = new Map();
  private allPages: PageMeta[] | null = null;
  private isInitialized = false;
  private recentlyAccessed: string[] = [];

  // 初始化缓存
  async initialize() {
    if (this.isInitialized) return;
    
    const pages = loadPages();
    this.allPages = pages;
    
    // 将所有页面加载到缓存中
    pages.forEach(page => {
      this.cache.set(page.id, page);
    });
    
    this.isInitialized = true;
  }

  // 获取所有页面（从缓存）
  getAllPages(): PageMeta[] {
    if (!this.isInitialized) {
      // 如果未初始化，同步初始化
      const pages = loadPages();
      this.allPages = pages;
      pages.forEach(page => {
        this.cache.set(page.id, page);
      });
      this.isInitialized = true;
    }
    return this.allPages || [];
  }

  // 获取单个页面（从缓存）
  getPage(id: string): PageMeta | null {
    if (!this.isInitialized) {
      this.getAllPages(); // 触发初始化
    }
    
    // 记录访问
    this.recordAccess(id);
    
    return this.cache.get(id) || null;
  }

  // 记录页面访问
  private recordAccess(pageId: string) {
    // 移除已存在的记录
    this.recentlyAccessed = this.recentlyAccessed.filter(id => id !== pageId);
    // 添加到开头
    this.recentlyAccessed.unshift(pageId);
    // 保持最多10个最近访问的页面
    if (this.recentlyAccessed.length > 10) {
      this.recentlyAccessed = this.recentlyAccessed.slice(0, 10);
    }
  }

  // 更新或插入页面（同时更新缓存和存储）
  async upsertPage(page: PageMeta) {
    // 更新缓存
    this.cache.set(page.id, page);
    
    // 更新 allPages 数组
    if (this.allPages) {
      const index = this.allPages.findIndex(p => p.id === page.id);
      if (index >= 0) {
        this.allPages[index] = page;
      } else {
        this.allPages.push(page);
      }
    }

    // 异步更新存储（使用 requestIdleCallback 或 setTimeout 来避免阻塞 UI）
    this.scheduleStorageUpdate();
  }

  // 删除页面
  async deletePage(id: string) {
    this.cache.delete(id);
    
    if (this.allPages) {
      this.allPages = this.allPages.filter(p => p.id !== id);
    }

    this.scheduleStorageUpdate();
  }

  // 预加载页面数据（可以在空闲时间预加载常用页面）
  preloadPages(pageIds: string[]) {
    pageIds.forEach(id => {
      if (!this.cache.has(id)) {
        const page = loadPages().find(p => p.id === id);
        if (page) {
          this.cache.set(id, page);
        }
      }
    });
  }

  // 智能预加载最近访问的页面
  smartPreload() {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        // 预加载最近访问的前5个页面
        const toPreload = this.recentlyAccessed.slice(0, 5);
        this.preloadPages(toPreload);
      });
    } else {
      // 降级到 setTimeout
      setTimeout(() => {
        const toPreload = this.recentlyAccessed.slice(0, 5);
        this.preloadPages(toPreload);
      }, 100);
    }
  }

  // 调度存储更新（防抖）
  private updateTimeout: NodeJS.Timeout | null = null;
  private scheduleStorageUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateTimeout = setTimeout(() => {
      if (this.allPages) {
        savePages(this.allPages);
      }
    }, 100); // 100ms 防抖
  }

  // 清空缓存
  clearCache() {
    this.cache.clear();
    this.allPages = null;
    this.isInitialized = false;
  }
}

// 创建全局实例
export const pageCacheManager = new PageCacheManager();

// 导出优化后的函数
export const getCachedPage = (id: string) => pageCacheManager.getPage(id);
export const getCachedPages = () => pageCacheManager.getAllPages();
export const upsertCachedPage = (page: PageMeta) => pageCacheManager.upsertPage(page);
export const deleteCachedPage = (id: string) => pageCacheManager.deletePage(id);
export const initializePageCache = () => pageCacheManager.initialize();
export const smartPreloadPages = () => pageCacheManager.smartPreload();
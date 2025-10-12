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

  // 重新排序页面：可传入完整顺序或部分页面ID顺序以在原位置内重排
  reorderPages(orderedIds: string[]) {
    // 确保已初始化
    if (!this.isInitialized) {
      this.getAllPages();
    }
    if (!this.allPages) return;

    const idToPage = new Map<string, PageMeta>();
    this.allPages.forEach(p => idToPage.set(p.id, p));
    const currentIds = this.allPages.map(p => p.id);
    const orderedSet = new Set(orderedIds);

    // 如果传入的是完整序列，直接重排
    if (orderedIds.length === currentIds.length && orderedIds.every((id, i) => currentIds.includes(id))) {
      this.allPages = orderedIds.map(id => idToPage.get(id)!).filter(Boolean);
      this.scheduleStorageUpdate();
      return;
    }

    // 否则只在原位置集合内进行局部重排
    const indices: number[] = [];
    currentIds.forEach((id, idx) => {
      if (orderedSet.has(id)) indices.push(idx);
    });

    // 安全保护：当索引数量与传入ID数量不一致时，回退为当前顺序
    if (indices.length !== orderedIds.length) {
      console.warn('[PageCacheManager] reorderPages: indices mismatch, skip.');
      return;
    }

    const newIds = [...currentIds];
    for (let i = 0; i < indices.length; i++) {
      newIds[indices[i]] = orderedIds[i];
    }
    this.allPages = newIds.map(id => idToPage.get(id)!).filter(Boolean);
    this.scheduleStorageUpdate();
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
export const reorderCachedPages = (orderedIds: string[]) => pageCacheManager.reorderPages(orderedIds);
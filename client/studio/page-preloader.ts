import { getPageFast } from './page-metadata-manager';
import type { PageMeta } from './types';

interface PreloadedPage {
  pageData: PageMeta;
  timestamp: number;
  rendered?: JSX.Element;
}

class PagePreloader {
  private preloadedPages = new Map<string, PreloadedPage>();
  private preloadQueue = new Set<string>();
  private maxCacheSize = 20; // 最大缓存页面数
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存过期

  /**
   * 预加载页面数据
   */
  async preloadPage(pageId: string): Promise<PageMeta | null> {
    if (this.preloadedPages.has(pageId)) {
      const cached = this.preloadedPages.get(pageId)!;
      // 检查缓存是否过期
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.pageData;
      }
    }

    if (this.preloadQueue.has(pageId)) {
      return null; // 正在加载中
    }

    this.preloadQueue.add(pageId);

    try {
      const pageData = await getPageFast(pageId);
      if (pageData) {
        this.preloadedPages.set(pageId, {
          pageData,
          timestamp: Date.now()
        });
        
        // 清理过期缓存
        this.cleanupExpiredCache();
        
        // 限制缓存大小
        this.limitCacheSize();
      }
      
      this.preloadQueue.delete(pageId);
      return pageData;
    } catch (error) {
      this.preloadQueue.delete(pageId);
      console.error('预加载页面失败:', pageId, error);
      return null;
    }
  }

  /**
   * 获取预加载的页面数据
   */
  getPreloadedPage(pageId: string): PageMeta | null {
    const cached = this.preloadedPages.get(pageId);
    if (!cached) return null;

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp >= this.cacheTimeout) {
      this.preloadedPages.delete(pageId);
      return null;
    }

    return cached.pageData;
  }

  /**
   * 批量预加载页面
   */
  async preloadPages(pageIds: string[]): Promise<void> {
    const promises = pageIds.map(pageId => this.preloadPage(pageId));
    await Promise.allSettled(promises);
  }

  /**
   * 检查页面是否已预加载
   */
  isPagePreloaded(pageId: string): boolean {
    const cached = this.preloadedPages.get(pageId);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [pageId, cached] of this.preloadedPages.entries()) {
      if (now - cached.timestamp >= this.cacheTimeout) {
        this.preloadedPages.delete(pageId);
      }
    }
  }

  /**
   * 限制缓存大小
   */
  private limitCacheSize(): void {
    if (this.preloadedPages.size <= this.maxCacheSize) return;

    // 按时间戳排序，删除最旧的缓存
    const entries = Array.from(this.preloadedPages.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
    toDelete.forEach(([pageId]) => {
      this.preloadedPages.delete(pageId);
    });
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.preloadedPages.clear();
    this.preloadQueue.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      cachedPages: this.preloadedPages.size,
      loadingPages: this.preloadQueue.size,
      maxCacheSize: this.maxCacheSize
    };
  }
}

// 全局页面预加载器实例
export const pagePreloader = new PagePreloader();

/**
 * 智能预加载相关页面
 * 根据页面关系和用户行为模式预加载可能访问的页面
 */
export async function smartPreload(currentPageId: string, allPageIds?: string[]): Promise<void> {
  try {
    // 获取当前页面数据
    const currentPage = await getPageFast(currentPageId);
    if (!currentPage) return;

    const pagesToPreload = new Set<string>();
    
    // 策略1: 扫描页面内容，查找嵌套页面引用
    extractNestedPageIds(currentPage.root, pagesToPreload);
    
    // 策略2: 如果提供了页面列表，预加载相邻页面
    if (allPageIds && allPageIds.length > 0) {
      const currentIndex = allPageIds.indexOf(currentPageId);
      if (currentIndex !== -1) {
        // 预加载前后各2个页面
        for (let i = Math.max(0, currentIndex - 2); i <= Math.min(allPageIds.length - 1, currentIndex + 2); i++) {
          if (i !== currentIndex && allPageIds[i]) {
            pagesToPreload.add(allPageIds[i]);
          }
        }
      }
    }
    
    // 预加载找到的页面
    for (const pageId of pagesToPreload) {
      if (pageId !== currentPageId && !pagePreloader.isPagePreloaded(pageId)) {
        pagePreloader.preloadPage(pageId).catch(error => {
          console.warn(`预加载页面 ${pageId} 失败:`, error);
        });
      }
    }
    
    console.log(`智能预加载: ${currentPageId}, 发现 ${pagesToPreload.size} 个相关页面`);
  } catch (error) {
    console.error('智能预加载失败:', error);
  }
}

/**
 * 从页面节点中提取嵌套页面ID
 */
function extractNestedPageIds(node: any, pageIds: Set<string>): void {
  if (!node) return;

  // 检查当前节点是否是嵌套页面容器
  if (node.type === 'NestedPageContainer' && node.props?.pageId) {
    pageIds.add(node.props.pageId);
  }

  // 递归检查子节点
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      extractNestedPageIds(child, pageIds);
    }
  }

  // 检查props中的子节点
  if (node.props) {
    Object.values(node.props).forEach(prop => {
      if (typeof prop === 'object' && prop !== null) {
        extractNestedPageIds(prop, pageIds);
      }
    });
  }
}
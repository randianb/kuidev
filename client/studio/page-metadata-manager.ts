import type { PageMeta, NodeMeta } from "./types";
import { pagePreloader } from "./page-preloader";

/**
 * 高效的页面元数据管理器
 * 避免重复的 localStorage 读取，提供内存缓存和快速访问
 */
class PageMetadataManager {
  private cache: Map<string, PageMeta> = new Map();
  private allPagesCache: PageMeta[] | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5000; // 5秒缓存有效期
  private readonly STORAGE_KEY = "studio.pages";

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastLoadTime < this.CACHE_DURATION;
  }

  /**
   * 从 localStorage 加载所有页面数据
   */
  private loadAllPages(): PageMeta[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PageMeta[];
    } catch {
      return [];
    }
  }

  /**
   * 刷新缓存
   */
  private refreshCache(): void {
    const pages = this.loadAllPages();
    this.allPagesCache = pages;
    this.cache.clear();
    
    // 重新构建页面缓存
    pages.forEach(page => {
      this.cache.set(page.id, page);
    });
    
    this.lastLoadTime = Date.now();
  }

  /**
   * 获取单个页面数据（高效版本）
   */
  getPage(id: string): PageMeta | null {
    // 如果缓存中有且缓存有效，直接返回
    if (this.isCacheValid() && this.cache.has(id)) {
      const page = this.cache.get(id) || null;
      
      // 如果获取到页面数据，触发嵌套页面预加载
      if (page) {
        this.triggerNestedPagePreload(page);
      }
      
      return page;
    }

    // 缓存无效或没有该页面，刷新缓存
    this.refreshCache();
    
    const page = this.cache.get(id) || null;
    
    // 如果获取到页面数据，触发嵌套页面预加载
    if (page) {
      this.triggerNestedPagePreload(page);
    }
    
    return page;
  }

  /**
   * 获取所有页面数据
   */
  getAllPages(): PageMeta[] {
    if (this.isCacheValid() && this.allPagesCache) {
      return this.allPagesCache;
    }

    this.refreshCache();
    return this.allPagesCache || [];
  }

  /**
   * 批量获取页面数据
   */
  getPages(ids: string[]): (PageMeta | null)[] {
    // 检查是否所有页面都在缓存中
    const allInCache = this.isCacheValid() && ids.every(id => this.cache.has(id));
    
    if (!allInCache) {
      this.refreshCache();
    }

    return ids.map(id => this.cache.get(id) || null);
  }

  /**
   * 检查页面是否存在
   */
  hasPage(id: string): boolean {
    if (this.isCacheValid() && this.cache.has(id)) {
      return true;
    }

    this.refreshCache();
    return this.cache.has(id);
  }

  /**
   * 获取页面的基本信息（只包含 id, name, template）
   */
  getPageInfo(id: string): { id: string; name: string; template: string } | null {
    const page = this.getPage(id);
    if (!page) return null;

    return {
      id: page.id,
      name: page.name,
      template: page.template || 'blank'
    };
  }

  /**
   * 手动刷新缓存（当页面数据更新时调用）
   */
  invalidateCache(): void {
    this.cache.clear();
    this.allPagesCache = null;
    this.lastLoadTime = 0;
  }

  /**
   * 预加载指定页面到缓存
   */
  preloadPages(ids: string[]): void {
    if (!this.isCacheValid()) {
      this.refreshCache();
    }
    // 页面已经在缓存中，无需额外操作
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; lastLoadTime: number; isValid: boolean } {
    return {
      size: this.cache.size,
      lastLoadTime: this.lastLoadTime,
      isValid: this.isCacheValid()
    };
  }

  /**
   * 从页面节点中提取嵌套页面ID
   */
  private extractNestedPageIds(node: NodeMeta, pageIds: Set<string>): void {
    if (!node) return;

    // 检查当前节点是否是嵌套页面容器
    if (node.type === 'NestedPageContainer' && node.props?.pageId) {
      pageIds.add(node.props.pageId);
    }

    // 递归检查子节点
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.extractNestedPageIds(child, pageIds);
      }
    }

    // 检查props中的子节点
    if (node.props) {
      Object.values(node.props).forEach(prop => {
        if (typeof prop === 'object' && prop !== null && prop.type) {
          this.extractNestedPageIds(prop as NodeMeta, pageIds);
        }
      });
    }
  }

  /**
   * 触发嵌套页面的预加载
   */
  private triggerNestedPagePreload(page: PageMeta): void {
    // 异步执行预加载，避免阻塞主线程
    setTimeout(() => {
      try {
        const nestedPageIds = new Set<string>();
        
        // 从主根节点提取嵌套页面ID
        if (page.root) {
          this.extractNestedPageIds(page.root, nestedPageIds);
        }
        
        // 从多个根节点提取嵌套页面ID（如果有的话）
        if (page.roots && Array.isArray(page.roots)) {
          for (const root of page.roots) {
            this.extractNestedPageIds(root, nestedPageIds);
          }
        }

        // 异步预加载找到的嵌套页面
        if (nestedPageIds.size > 0) {
          const pageIdsArray = Array.from(nestedPageIds);
          pagePreloader.preloadPages(pageIdsArray).catch(error => {
            console.warn(`预加载嵌套页面失败:`, error);
          });
          
          console.log(`页面 ${page.id} 触发预加载 ${nestedPageIds.size} 个嵌套页面:`, pageIdsArray);
        }
      } catch (error) {
        console.error('触发嵌套页面预加载失败:', error);
      }
    }, 0);
  }
}

// 创建全局实例
const pageMetadataManager = new PageMetadataManager();

// 导出便捷函数
export const getPageFast = (id: string) => pageMetadataManager.getPage(id);
export const getPagesFast = (ids: string[]) => pageMetadataManager.getPages(ids);
export const getAllPagesFast = () => pageMetadataManager.getAllPages();
export const hasPageFast = (id: string) => pageMetadataManager.hasPage(id);
export const getPageInfoFast = (id: string) => pageMetadataManager.getPageInfo(id);
export const invalidatePageCache = () => pageMetadataManager.invalidateCache();
export const preloadPagesFast = (ids: string[]) => pageMetadataManager.preloadPages(ids);
export const getPageCacheStats = () => pageMetadataManager.getCacheStats();

export default pageMetadataManager;
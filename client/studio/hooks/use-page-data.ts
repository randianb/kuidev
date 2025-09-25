import { useState, useEffect, useCallback, useRef } from 'react';
import { getPageFast } from '../page-metadata-manager';
import { pagePreloader, smartPreload } from '../page-preloader';
import type { PageMeta } from '../types';
import { getCachedPage } from '../page-cache';

interface UsePageDataResult {
  pageData: PageMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UsePageDataOptions {
  enabled?: boolean;
  retryCount?: number;
  retryDelay?: number;
  preload?: boolean;
}

/**
 * 高效的页面数据获取 Hook
 * 集成预加载、缓存、错误处理和重试机制
 */
export function usePageData(
  pageId: string | null,
  options: UsePageDataOptions = {}
): UsePageDataResult {
  const { enabled = true, retryCount = 3, retryDelay = 1000, preload = true } = options;
  
  const [pageData, setPageData] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true); // 初始状态为loading，避免闪现空内容
  const [error, setError] = useState<string | null>(null);
  const [currentRetry, setCurrentRetry] = useState(0);
  const lastPageIdRef = useRef<string | null>(null);

  const fetchPageData = useCallback(async () => {
    if (!pageId || !enabled) {
      setPageData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // 检查是否有预加载的数据
    const preloadedData = preload ? pagePreloader.getPreloadedPage(pageId) : null;
    
    if (preloadedData && preloadedData.root) {
      // 使用预加载的数据，但只有在数据完整时才使用
      setPageData(preloadedData);
      setLoading(false);
      setError(null);
      setCurrentRetry(0);
      lastPageIdRef.current = pageId;
      return;
    }

    // 先尝试同步获取缓存数据，避免显示loading状态
    try {
      const cachedData = await getPageFast(pageId);
      if (cachedData) {
        // 如果能立即获取到数据，直接设置，不显示loading
        setPageData(cachedData);
        setLoading(false);
        setError(null);
        setCurrentRetry(0);
        lastPageIdRef.current = pageId;
        
        // 触发智能预加载（在后台进行）
        if (preload) {
          smartPreload(pageId).catch(console.error);
        }
        return;
      }
    } catch (err) {
      // 如果同步获取失败，继续异步加载流程
    }

    // 如果是相同页面且已有数据，不显示loading
    const isSamePage = lastPageIdRef.current === pageId;
    const hasExistingData = pageData !== null;
    
    // 只有在切换到新页面且没有缓存数据时才显示loading
    if (!isSamePage || !hasExistingData) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getPageFast(pageId);
      if (data) {
        setPageData(data);
        setCurrentRetry(0);
        
        // 触发智能预加载（在后台进行）
        if (preload) {
          smartPreload(pageId).catch(console.error);
        }
      } else {
        // 对于嵌套页面，不显示错误，而是显示空状态
        setError(null);
        setPageData(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取页面数据失败';
      
      if (currentRetry < retryCount) {
        // 重试机制
        setTimeout(() => {
          setCurrentRetry(prev => prev + 1);
        }, retryDelay);
      } else {
        // 对于嵌套页面，不显示错误，而是显示空状态
        setError(null);
        setPageData(null);
      }
    } finally {
      setLoading(false);
      lastPageIdRef.current = pageId;
    }
  }, [pageId, enabled, currentRetry, retryCount, retryDelay, preload, pageData]);

  const refetch = useCallback(() => {
    setCurrentRetry(0);
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  return {
    pageData,
    loading,
    error,
    refetch
  };
}

/**
 * 批量获取页面数据的 Hook
 */
export function useMultiplePageData(pageIds: string[]): {
  pagesData: (PageMeta | null)[];
  loading: boolean;
  errors: (string | null)[];
} {
  const [pagesData, setPagesData] = useState<(PageMeta | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<(string | null)[]>([]);

  useEffect(() => {
    const loadMultiplePages = async () => {
      if (!pageIds.length) {
        setPagesData([]);
        setErrors([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const results: (PageMeta | null)[] = [];
        const errorList: (string | null)[] = [];

        for (const pageId of pageIds) {
          try {
            let page = getCachedPage(pageId);
            if (!page) {
              page = getPageFast(pageId);
            }
            results.push(page);
            errorList.push(null);
          } catch (err) {
            results.push(null);
            errorList.push(err instanceof Error ? err.message : '页面加载失败');
          }
        }

        setPagesData(results);
        setErrors(errorList);
      } catch (err) {
        console.error('Failed to load multiple pages:', err);
        setPagesData(pageIds.map(() => null));
        setErrors(pageIds.map(() => '批量加载失败'));
      } finally {
        setLoading(false);
      }
    };

    loadMultiplePages();
  }, [pageIds.join(',')]);

  return {
    pagesData,
    loading,
    errors
  };
}
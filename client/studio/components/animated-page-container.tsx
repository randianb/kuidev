import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedPageContainerProps {
  children: React.ReactNode;
  pageId: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
  animationDuration?: number;
}

/**
 * 带有平滑过渡动画的页面容器
 * 支持淡入淡出效果，避免页面切换时的闪动
 */
export function AnimatedPageContainer({
  children,
  pageId,
  loading = false,
  error = null,
  className,
  animationDuration = 150
}: AnimatedPageContainerProps) {
  const [currentPageId, setCurrentPageId] = useState(pageId);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayContent, setDisplayContent] = useState(children);
  const [opacity, setOpacity] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果页面ID没有变化，直接更新内容
    if (pageId === currentPageId && !loading) {
      setDisplayContent(children);
      setOpacity(1);
      return;
    }

    // 如果正在加载或有错误，不进行动画
    if (loading || error) {
      setDisplayContent(children);
      setCurrentPageId(pageId);
      setOpacity(1);
      return;
    }

    // 页面切换逻辑
    if (pageId !== currentPageId) {
      // 检查是否有内容可以立即显示（预加载的情况）
      const hasContent = children && React.Children.count(children) > 0;
      
      if (hasContent && !loading) {
        // 如果有预加载的内容且不在加载状态，直接切换无动画
        setDisplayContent(children);
        setCurrentPageId(pageId);
        setOpacity(1);
        setIsTransitioning(false);
      } else {
        // 否则进行动画切换
        setIsTransitioning(true);
        
        // 淡出当前内容
        setOpacity(0);

        timeoutRef.current = setTimeout(() => {
          // 更新内容和页面ID
          setDisplayContent(children);
          setCurrentPageId(pageId);
          
          // 淡入新内容
          setOpacity(1);
          setIsTransitioning(false);
        }, animationDuration / 2); // 使用一半的时间进行淡出，另一半进行淡入
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pageId, children, currentPageId, loading, error, animationDuration]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "transition-all duration-150 ease-out w-full h-full ",
        isTransitioning && "pointer-events-none",
        className
      )}
      style={{
        opacity,
        transform: isTransitioning ? 'translateY(2px)' : 'translateY(0px)',
        transitionDuration: `${animationDuration}ms`,
        transitionProperty: 'opacity, transform'
      }}
    >
      <div className="w-full h-full">
        {displayContent}
      </div>
    </div>
  );
}

/**
 * 页面内容渲染器的包装组件
 * 提供加载状态和错误状态的统一处理
 */
interface PageContentWrapperProps {
  pageId: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  className?: string;
}

export function PageContentWrapper({
  pageId,
  loading,
  error,
  children,
  className
}: PageContentWrapperProps) {
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className={cn("nested-page-content w-full h-full ", className)}>
        <div className="flex items-center justify-center p-4 h-full">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-gray-500">加载页面中...</div>
          </div>
        </div>
      </div>
    );
  }

  // 对于嵌套页面，不显示错误状态，而是显示空内容或默认内容
  if (error) {
    return (
      <div className={cn("nested-page-content w-full h-full ", className)}>
        <div className="flex items-center justify-center p-4 h-full text-gray-400">
          <div className="text-center">
            <div className="text-sm">页面内容暂时无法显示</div>
            <div className="text-xs mt-1 opacity-60">页面ID: {pageId}</div>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有子内容，显示空状态
  if (!children) {
    return (
      <div className={cn("nested-page-content w-full h-full ", className)}>
        <div className="flex items-center justify-center p-4 h-full text-gray-400">
          <div className="text-center">
            <div className="text-sm">页面内容为空</div>
            <div className="text-xs mt-1 opacity-60">页面ID: {pageId}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPageContainer 
      pageId={pageId} 
      loading={loading} 
      error={error}
      className={cn("nested-page-content w-full h-full", className)}
    >
      {children}
    </AnimatedPageContainer>
  );
}
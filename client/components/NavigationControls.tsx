import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { bus } from '../lib/eventBus';
import { execHandler } from '../lib/handlers';
import navigationHistory, { NavigationHistoryItem } from '../lib/navigation-history';

interface NavigationControlsProps {
  className?: string;
  showBackButton?: boolean;
  showForwardButton?: boolean;
  showHistoryButton?: boolean;
  buttonSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  children?: React.ReactNode;
  layout?: 'row' | 'col';
  gap?: 'sm' | 'md' | 'lg';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end';
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({ 
  className = '',
  showBackButton = true,
  showForwardButton = true,
  showHistoryButton = true,
  buttonSize = 'md',
  variant = 'default',
  children,
  layout = 'row',
  gap = 'sm',
  justify = 'start',
  align = 'center'
}) => {
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentItem, setCurrentItem] = useState<NavigationHistoryItem | null>(null);
  const [history, setHistory] = useState<NavigationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // 监听历史记录更新事件
    const unsubscribe = bus.subscribe('navigation.history.updated', (payload: any) => {
      setCanGoBack(payload.canGoBack);
      setCanGoForward(payload.canGoForward);
      setCurrentItem(payload.currentItem);
      setHistory(payload.history);
    });

    // 初始化状态
    setCanGoBack(navigationHistory.canGoBack());
    setCanGoForward(navigationHistory.canGoForward());
    setCurrentItem(navigationHistory.getCurrentItem());
    setHistory(navigationHistory.getHistory());

    return unsubscribe;
  }, []);

  const handleGoBack = () => {
    if (canGoBack) {
      execHandler('navigateBack', {});
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      execHandler('navigateForward', {});
    }
  };

  const handleHistoryItemClick = (item: NavigationHistoryItem) => {
    execHandler('navigate', {
      pageId: item.pageId,
      pageName: item.pageName
    });
    setShowHistory(false);
  };

  // 按钮尺寸样式
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // 按钮变体样式
  const getButtonClasses = (enabled: boolean) => {
    const baseClasses = `${sizeClasses[buttonSize]} rounded-md transition-colors duration-200`;
    
    if (!enabled) {
      return `${baseClasses} text-gray-300 cursor-not-allowed`;
    }

    switch (variant) {
      case 'outline':
        return `${baseClasses} text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400`;
      case 'ghost':
        return `${baseClasses} text-gray-700 hover:bg-gray-100`;
      default:
        return `${baseClasses} text-gray-700 hover:bg-gray-100 hover:text-gray-900`;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 布局样式
  const getLayoutClasses = () => {
    const baseClasses = 'flex';
    const directionClass = layout === 'col' ? 'flex-col' : 'flex-row';
    
    const gapClasses = {
      sm: layout === 'col' ? 'space-y-1' : 'space-x-1',
      md: layout === 'col' ? 'space-y-2' : 'space-x-2',
      lg: layout === 'col' ? 'space-y-4' : 'space-x-4'
    };
    
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around'
    };
    
    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end'
    };
    
    return `${baseClasses} ${directionClass} ${gapClasses[gap]} ${justifyClasses[justify]} ${alignClasses[align]}`;
  };

  return (
    <div className={`${getLayoutClasses()} ${className}`}>
      {/* 后退按钮 */}
      {showBackButton && (
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className={getButtonClasses(canGoBack)}
          title="后退"
        >
          <ChevronLeft className={iconSizes[buttonSize]} />
        </button>
      )}

      {/* 前进按钮 */}
      {showForwardButton && (
        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className={getButtonClasses(canGoForward)}
          title="前进"
        >
          <ChevronRight className={iconSizes[buttonSize]} />
        </button>
      )}

      {/* 历史记录按钮 */}
      {showHistoryButton && (
        <div className="relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={getButtonClasses(true)}
            title="历史记录"
          >
            <Clock className={iconSizes[buttonSize]} />
          </button>

        {/* 历史记录下拉菜单 */}
        {showHistory && history.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {history.map((item, index) => (
              <button
                key={`${item.pageId}-${item.timestamp}`}
                onClick={() => handleHistoryItemClick(item)}
                className={`
                  w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors duration-200
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === history.length - 1 ? 'rounded-b-lg' : ''}
                  ${item.pageId === currentItem?.pageId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                `}
              >
                <div className="font-medium truncate">{item.pageName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </button>
            ))}
          </div>
        )}
        </div>
      )}

      {/* 点击外部关闭历史记录菜单 */}
      {showHistory && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* 子组件 */}
      {children}
    </div>
  );
};

export default NavigationControls;
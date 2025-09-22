import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  navigateToPage, 
  onPageChanged, 
  onNavigateToPage, 
  subscribeToNavigationEvents,
  NavigationListener 
} from '@/lib/navigation';

interface NavigationEvent {
  type: 'navigate_request' | 'page_changed';
  pageId: string;
  timestamp: number;
  data?: any;
}

export function NavigationDemo() {
  const [events, setEvents] = useState<NavigationEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isListening) return;

    // 方法1: 使用单独的订阅函数
    const unsubscribePageChanged = onPageChanged((data) => {
      setEvents(prev => [...prev, {
        type: 'page_changed',
        pageId: data.pageId,
        timestamp: Date.now(),
        data
      }]);
    });

    const unsubscribeNavigateRequest = onNavigateToPage((event) => {
      setEvents(prev => [...prev, {
        type: 'navigate_request',
        pageId: event.pageId,
        timestamp: Date.now(),
        data: event.options
      }]);
    });

    // 方法2: 使用批量订阅
    const unsubscribeAll = subscribeToNavigationEvents({
      onNavigateRequest: (event) => {
        console.log('批量订阅 - 导航请求:', event.pageId);
      },
      onPageChanged: (data) => {
        console.log('批量订阅 - 页面切换:', data.pageId);
      }
    });

    // 方法3: 使用NavigationListener类
    const navigationListener = new NavigationListener();
    navigationListener
      .onNavigateRequest((event) => {
        console.log('NavigationListener - 导航请求:', event.pageId);
      })
      .onPageChanged((data) => {
        console.log('NavigationListener - 页面切换:', data.pageId);
      });

    return () => {
      unsubscribePageChanged();
      unsubscribeNavigateRequest();
      unsubscribeAll();
      navigationListener.destroy();
    };
  }, [isListening]);

  const handleTestNavigation = (pageId: string) => {
    navigateToPage(pageId, {
      saveCurrentPage: true,
      clearHistory: false,
      updateUrl: true
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (isListening) {
      setEvents([]);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">导航事件订阅演示</h3>
      
      {/* 控制按钮 */}
      <div className="flex gap-2 mb-4">
        <Button 
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
        >
          {isListening ? '停止监听' : '开始监听'}
        </Button>
        <Button onClick={clearEvents} variant="outline">
          清空事件
        </Button>
      </div>

      {/* 测试导航按钮 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">测试导航功能:</p>
        <div className="flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleTestNavigation('test-page-1')}
          >
            导航到页面1
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleTestNavigation('test-page-2')}
          >
            导航到页面2
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleTestNavigation('test-page-3')}
          >
            导航到页面3
          </Button>
        </div>
      </div>

      {/* 事件日志 */}
      <div className="border rounded p-3 bg-gray-50 max-h-60 overflow-y-auto">
        <p className="text-sm font-medium mb-2">事件日志:</p>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">
            {isListening ? '等待事件...' : '点击"开始监听"来查看导航事件'}
          </p>
        ) : (
          <div className="space-y-1">
            {events.map((event, index) => (
              <div key={index} className="text-xs font-mono">
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className={`ml-2 px-2 py-1 rounded text-white ${
                  event.type === 'navigate_request' 
                    ? 'bg-blue-500' 
                    : 'bg-green-500'
                }`}>
                  {event.type === 'navigate_request' ? '导航请求' : '页面切换'}
                </span>
                <span className="ml-2 font-semibold">
                  {event.pageId}
                </span>
                {event.data && (
                  <span className="ml-2 text-gray-600">
                    {JSON.stringify(event.data)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <p className="font-medium text-blue-800 mb-1">使用说明:</p>
        <ul className="text-blue-700 space-y-1">
          <li>• 点击"开始监听"开始监听导航事件</li>
          <li>• 使用测试按钮或页面树中的导航按钮触发事件</li>
          <li>• 查看控制台可以看到不同订阅方法的日志输出</li>
          <li>• 事件日志显示实时的导航请求和页面切换事件</li>
        </ul>
      </div>
    </div>
  );
}
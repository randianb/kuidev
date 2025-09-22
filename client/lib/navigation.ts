import { bus, EVENT_TOPICS, NavigateToPageEvent } from './eventBus';

/**
 * 导航到指定页面
 * @param pageId 目标页面ID
 * @param options 导航选项
 */
export function navigateToPage(pageId: string, options?: NavigateToPageEvent['options']) {
  const event: NavigateToPageEvent = {
    pageId,
    options: {
      saveCurrentPage: true,
      clearHistory: true,
      updateUrl: true,
      ...options,
    },
  };
  
  bus.publish(EVENT_TOPICS.NAVIGATE_TO_PAGE, event);
}

/**
 * 快速导航到页面（使用默认选项）
 * @param pageId 目标页面ID
 */
export function quickNavigateToPage(pageId: string) {
  navigateToPage(pageId);
}

/**
 * 静默导航到页面（不更新URL，不保存当前页面）
 * @param pageId 目标页面ID
 */
export function silentNavigateToPage(pageId: string) {
  navigateToPage(pageId, {
    saveCurrentPage: false,
    clearHistory: false,
    updateUrl: false,
  });
}

/**
 * 监听页面切换事件
 * @param callback 页面切换时的回调函数
 * @returns 取消监听的函数
 */
export function onPageChanged(callback: (data: { pageId: string; page: any }) => void) {
  return bus.subscribe(EVENT_TOPICS.PAGE_CHANGED, callback);
}

/**
 * 监听页面导航请求事件
 * @param callback 页面导航请求时的回调函数
 * @returns 取消监听的函数
 */
export function onNavigateToPage(callback: (event: NavigateToPageEvent) => void) {
  return bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, callback);
}

/**
 * 监听所有导航相关事件
 * @param callbacks 事件回调函数对象
 * @returns 取消所有监听的函数
 */
export function subscribeToNavigationEvents(callbacks: {
  onNavigateRequest?: (event: NavigateToPageEvent) => void;
  onPageChanged?: (data: { pageId: string; page: any }) => void;
}) {
  const unsubscribers: (() => void)[] = [];

  if (callbacks.onNavigateRequest) {
    unsubscribers.push(bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, callbacks.onNavigateRequest));
  }

  if (callbacks.onPageChanged) {
    unsubscribers.push(bus.subscribe(EVENT_TOPICS.PAGE_CHANGED, callbacks.onPageChanged));
  }

  // 返回取消所有订阅的函数
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
}

/**
 * 创建页面导航监听器类
 * 提供更高级的事件管理功能
 */
export class NavigationListener {
  private unsubscribers: (() => void)[] = [];

  /**
   * 监听页面导航请求
   */
  onNavigateRequest(callback: (event: NavigateToPageEvent) => void) {
    const unsubscribe = bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, callback);
    this.unsubscribers.push(unsubscribe);
    return this;
  }

  /**
   * 监听页面切换完成
   */
  onPageChanged(callback: (data: { pageId: string; page: any }) => void) {
    const unsubscribe = bus.subscribe(EVENT_TOPICS.PAGE_CHANGED, callback);
    this.unsubscribers.push(unsubscribe);
    return this;
  }

  /**
   * 监听特定页面的导航
   */
  onPageNavigate(pageId: string, callback: (event: NavigateToPageEvent) => void) {
    const unsubscribe = bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, (event: NavigateToPageEvent) => {
      if (event.pageId === pageId) {
        callback(event);
      }
    });
    this.unsubscribers.push(unsubscribe);
    return this;
  }

  /**
   * 取消所有监听
   */
  destroy() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }
}

/**
 * 发布自定义导航事件
 * @param pageId 目标页面ID
 * @param customOptions 自定义选项
 */
export function publishNavigationEvent(pageId: string, customOptions?: NavigateToPageEvent['options']) {
  const event: NavigateToPageEvent = {
    pageId,
    options: customOptions,
  };
  
  bus.publish(EVENT_TOPICS.NAVIGATE_TO_PAGE, event);
}

// 导出事件主题常量，方便其他地方使用
export { EVENT_TOPICS } from './eventBus';

/* ==================== 使用示例 ==================== */

/**
 * 示例1: 基础导航使用
 */
// import { navigateToPage, quickNavigateToPage, silentNavigateToPage } from '@/lib/navigation';
// 
// // 基础导航
// navigateToPage('page-123');
// 
// // 带选项的导航
// navigateToPage('page-123', {
//   saveCurrentPage: false,  // 不保存当前页面
//   clearHistory: false,     // 不清空历史记录
//   updateUrl: true          // 更新URL参数
// });
// 
// // 快速导航（使用默认选项）
// quickNavigateToPage('page-123');
// 
// // 静默导航（不更新URL，不保存状态）
// silentNavigateToPage('page-123');

/**
 * 示例2: 事件订阅使用
 */
// import { onPageChanged, onNavigateToPage, subscribeToNavigationEvents } from '@/lib/navigation';
// 
// // 监听页面切换完成事件
// const unsubscribePageChanged = onPageChanged((data) => {
//   console.log('页面已切换到:', data.pageId, data.page);
// });
// 
// // 监听页面导航请求事件
// const unsubscribeNavigateRequest = onNavigateToPage((event) => {
//   console.log('收到导航请求:', event.pageId, event.options);
// });
// 
// // 批量订阅导航事件
// const unsubscribeAll = subscribeToNavigationEvents({
//   onNavigateRequest: (event) => {
//     console.log('导航请求:', event.pageId);
//   },
//   onPageChanged: (data) => {
//     console.log('页面切换完成:', data.pageId);
//   }
// });
// 
// // 取消订阅
// unsubscribePageChanged();
// unsubscribeNavigateRequest();
// unsubscribeAll();

/**
 * 示例3: 使用NavigationListener类
 */
// import { NavigationListener } from '@/lib/navigation';
// 
// const navigationListener = new NavigationListener();
// 
// navigationListener
//   .onNavigateRequest((event) => {
//     console.log('导航请求:', event.pageId);
//   })
//   .onPageChanged((data) => {
//     console.log('页面切换完成:', data.pageId);
//   })
//   .onPageNavigate('specific-page-id', (event) => {
//     console.log('特定页面导航:', event.pageId);
//   });
// 
// // 组件卸载时取消所有监听
// // navigationListener.destroy();

/**
 * 示例4: React组件中的使用
 */
// import React, { useEffect } from 'react';
// import { navigateToPage, onPageChanged } from '@/lib/navigation';
// 
// function MyComponent() {
//   useEffect(() => {
//     // 监听页面切换事件
//     const unsubscribe = onPageChanged((data) => {
//       console.log('当前页面:', data.pageId);
//     });
// 
//     // 组件卸载时取消监听
//     return unsubscribe;
//   }, []);
// 
//   const handleNavigate = (pageId: string) => {
//     navigateToPage(pageId, {
//       saveCurrentPage: true,
//       updateUrl: true
//     });
//   };
// 
//   return (
//     <button onClick={() => handleNavigate('target-page')}>
//       导航到目标页面
//     </button>
//   );
// }

/**
 * 示例5: 高级用法 - 导航拦截器
 */
// import { onNavigateToPage, EVENT_TOPICS, bus } from '@/lib/navigation';
// 
// // 创建导航拦截器
// const navigationInterceptor = onNavigateToPage((event) => {
//   // 检查权限或其他条件
//   if (event.pageId === 'restricted-page' && !userHasPermission()) {
//     console.warn('没有权限访问该页面');
//     return; // 阻止导航
//   }
// 
//   // 记录导航日志
//   console.log('导航到页面:', event.pageId, '选项:', event.options);
// });
// 
// function userHasPermission(): boolean {
//   // 权限检查逻辑
//   return true;
// }

/**
 * 示例6: 自定义导航事件
 */
// import { publishNavigationEvent, EVENT_TOPICS, bus } from '@/lib/navigation';
// 
// // 发布自定义导航事件
// publishNavigationEvent('custom-page', {
//   saveCurrentPage: false,
//   clearHistory: true,
//   updateUrl: false,
//   // 可以添加自定义属性
//   customData: { source: 'menu', timestamp: Date.now() }
// });
// 
// // 监听自定义导航事件
// bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, (event) => {
//   if (event.options?.customData) {
//     console.log('自定义导航数据:', event.options.customData);
//   }
// });
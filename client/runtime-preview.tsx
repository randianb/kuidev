import React from 'react';
import { createRoot } from 'react-dom/client';
import RuntimePreview from './pages/CleanPreview';
import { PageMeta } from '@/studio/types';
import './global.css';

// 运行时预览的独立入口
class RuntimePreviewApp {
  private root: any = null;
  private container: HTMLElement | null = null;

  constructor(containerId = 'root') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
  }

  // 从URL参数获取页面数据
  private getPageDataFromUrl(): PageMeta | null {
    const urlParams = new URLSearchParams(window.location.search);
    const pageId = urlParams.get('id');
    const pageDataParam = urlParams.get('data');
    
    if (pageDataParam) {
      try {
        return JSON.parse(decodeURIComponent(pageDataParam));
      } catch (err) {
        console.error('解析页面数据失败:', err);
      }
    }
    
    if (pageId) {
      // 尝试从localStorage获取
      try {
        const storedPages = localStorage.getItem('pages');
        if (storedPages) {
          const pages = JSON.parse(storedPages);
          return pages.find((p: PageMeta) => p.id === pageId);
        }
      } catch (err) {
        console.error('从localStorage获取页面数据失败:', err);
      }
    }
    
    // 尝试从全局变量获取
    if ((window as any).pageData) {
      return (window as any).pageData;
    }
    
    return null;
  }

  // 渲染预览
  public render(pageData?: PageMeta): void {
    if (!this.container) return;

    const data = pageData || this.getPageDataFromUrl();
    
    if (!data) {
      this.renderError('页面数据不存在', '请确保URL参数包含有效的页面ID或页面数据');
      return;
    }

    try {
      if (!this.root) {
        this.root = createRoot(this.container);
      }
      
      this.root.render(<RuntimePreview pageData={data} />);
    } catch (err: any) {
      console.error('渲染预览失败:', err);
      this.renderError('渲染失败', err.message || '预览组件渲染失败');
    }
  }

  // 渲染错误信息
  private renderError(title: string, message: string): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        flex-direction: column;
        color: #e74c3c;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${title}</div>
        <div style="font-size: 14px; color: #666;">${message}</div>
      </div>
    `;
  }

  // 销毁预览
  public destroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// 全局函数，用于外部调用
export function createRuntimePreview(pageData?: PageMeta, containerId = 'root'): RuntimePreviewApp {
  const app = new RuntimePreviewApp(containerId);
  app.render(pageData);
  return app;
}

// 自动初始化（如果作为独立入口使用）
if (typeof window !== 'undefined') {
  // 页面加载完成后自动初始化
  const initApp = () => {
    try {
      const app = new RuntimePreviewApp();
      app.render();
      
      // 将app实例挂载到全局，方便调试
      (window as any).runtimePreviewApp = app;
    } catch (err) {
      console.error('自动初始化运行时预览失败:', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

export default RuntimePreviewApp;
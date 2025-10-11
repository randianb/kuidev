import { bus } from "./eventBus";
import { formValidationManager } from "../studio/form-validation";
import navigationHistory from "./navigation-history";

export type HandlerContext = {
  getText: (id: string) => string | null;
  getValue: (id: string) => any;
  setText: (id: string, text: string) => void;
  publish: (topic: string, payload?: any) => void;
  getFormValue: (nodeId: string, fieldName?: string) => any;
  getAllFormValues: () => Record<string, any>;
};

export type NamedHandler = (params: any, ctx: HandlerContext) => void | Promise<void>;

// Built-in handlers (Open/Closed Principle: extend by adding new handlers without modifying existing ones)
const handlers: Record<string, NamedHandler> = {
  log: (params, _ctx) => {
    // eslint-disable-next-line no-console
    console.log("handler.log", params);
  },
  publish: (params, ctx) => {
    ctx.publish(params?.topic ?? "app.event", params?.payload);
  },
  openDialog: (params, ctx) => {
    const dialogData = { 
      title: params?.title ?? "提示", 
      content: params?.content ?? "",
      type: params?.type ?? "info",
      size: params?.size ?? "medium",
      showCloseButton: params?.showCloseButton !== false,
      backdrop: params?.backdrop !== false,
      keyboard: params?.keyboard !== false,
      autoClose: params?.autoClose,
      onConfirm: params?.onConfirm,
      onCancel: params?.onCancel,
      confirmText: params?.confirmText ?? "确定",
      cancelText: params?.cancelText ?? "取消",
      icon: params?.icon,
      className: params?.className,
      // 新增页面支持
      pageId: params?.pageId,
      pageName: params?.pageName
    };
    ctx.publish("dialog.open", dialogData);
  },
  setTextById: (params, ctx) => {
    if (!params?.id) return;
    ctx.setText(params.id, params?.text ?? "");
  },
  navigate: (params, ctx) => {
    const { pageId, pageName, url, target = '_self', replace = false, type = 'internal', fromHistory = false } = params;
    
    if (type === 'external' && url) {
      // 外部URL导航
      if (target === '_blank') {
        window.open(url, '_blank');
      } else {
        if (replace) {
          window.location.replace(url);
        } else {
          window.location.href = url;
        }
      }
    } else if (pageId || pageName) {
      // 内部页面导航
      const targetPage = pageId || pageName;
      
      // 发布页面导航事件
      ctx.publish('page.navigate', {
        pageId: targetPage,
        pageName,
        timestamp: Date.now(),
        fromHistory
      });
      
      // 只有非历史记录导航才添加到历史记录中
      if (!fromHistory) {
        navigationHistory.addToHistory({
          pageId: targetPage,
          pageName,
          url: `/preview/${encodeURIComponent(targetPage)}`,
          timestamp: Date.now(),
          title: pageName || targetPage
        });
      }
      
      // 检查是否在Studio环境中
      if (window.location.pathname.includes('/studio')) {
        // 在Studio中，更新URL参数
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('page', targetPage);
        if (replace) {
          window.history.replaceState({}, '', currentUrl.toString());
        } else {
          window.history.pushState({}, '', currentUrl.toString());
        }
        // 触发页面更新
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        // 在其他环境中，导航到预览页面
        const targetUrl = `/preview/${encodeURIComponent(targetPage)}`;
        
        // 使用SPA导航，避免页面刷新
        if (replace) {
          window.history.replaceState({}, '', targetUrl);
        } else {
          window.history.pushState({}, '', targetUrl);
        }
        
        // 触发自定义导航事件，让React Router处理
        window.dispatchEvent(new CustomEvent('spa-navigate', {
          detail: { to: targetUrl }
        }));
      }
    } else {
      console.warn('navigate handler: 需要提供 pageId、pageName 或 url 参数');
    }
  },
  resolvefetch: async (params, ctx) => {
    const { id, code, type = 'form', script, sendFormData = false, returnFormData = false, getFormData = false } = params;
    
    // 如果需要直接返回表单数据
    if (returnFormData || getFormData) {
      const allValues = ctx.getAllFormValues();
      console.log('resolvefetch 直接返回实际表单数据:', allValues);
      
      // 发布数据到事件总线
      ctx.publish('form.data.resolved', {
        id: id || code || 'form-data',
        type: getFormData ? 'formComponents' : type,
        data: allValues,
        timestamp: Date.now(),
        source: 'actual_form_data'
      });
      
      return allValues;
    }
    
    // 如果提供了脚本，执行JavaScript代码
    if (script) {
      try {
        // 创建安全的执行环境
        const scriptContext = {
          console,
          fetch,
          setTimeout,
          setInterval,
          clearTimeout,
          clearInterval,
          JSON,
          Date,
          Math,
          Object,
          Array,
          String,
          Number,
          Boolean,
          // 提供上下文方法
          getText: ctx.getText,
          getValue: ctx.getValue,
          setText: ctx.setText,
          publish: ctx.publish,
          getFormValue: ctx.getFormValue,
          getAllFormValues: ctx.getAllFormValues,
          // 提供参数
          params: { id, code, type }
        };
        
        // 执行脚本代码
        const scriptFunction = new Function(
          ...Object.keys(scriptContext),
          `
          return (async () => {
            ${script}
          })();
          `
        );
        
        const result = await scriptFunction(...Object.values(scriptContext));
        
        // 如果脚本返回数据，发布到事件总线
        if (result !== undefined) {
          ctx.publish('form.data.resolved', {
            id: id || code || 'script',
            type,
            data: result,
            timestamp: Date.now()
          });
          return result;
        }
        
      } catch (error) {
        console.error('resolvefetch 脚本执行错误:', error);
        ctx.publish('form.data.error', {
          id: id || code || 'script',
          type,
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
      return;
    }
    
    // 检查必要参数
    if (!id && !code) {
      console.error('resolvefetch: 需要提供 id、code 或 script 参数');
      return;
    }
    
    try {
      let formData = null;
      let dataSource = 'api';
      
      // 优先从 localStorage 获取页面数据
      if (type === 'page' && (id || code)) {
        try {
          const storedPages = localStorage.getItem('studio.pages');
          if (storedPages) {
            const pages = JSON.parse(storedPages);
            let foundPage = null;
            
            // 根据 id 或 code 查找页面
            if (id) {
              foundPage = pages.find((p: any) => p.id === id);
            } else if (code) {
              foundPage = pages.find((p: any) => p.root?.code === code || p.code === code);
            }
            
            if (foundPage) {
              console.log('从 localStorage 获取到页面数据:', foundPage);
              formData = foundPage;
              dataSource = 'localStorage';
              
              // 立即发布数据到事件总线，确保加载状态能及时更新
              ctx.publish('form.data.resolved', {
                id: id,
                code: code,
                type,
                data: formData,
                timestamp: Date.now(),
                source: dataSource
              });
              
              return formData;
            } else {
              console.log('在 localStorage 中未找到页面数据，将使用 API 获取');
            }
          } else {
            console.log('localStorage 中没有页面数据，将使用 API 获取');
          }
        } catch (error) {
          console.warn('从 localStorage 读取页面数据失败:', error);
        }
      }
      
      // 如果 localStorage 中没有找到数据，则调用 API
      if (!formData) {
        let response;
        
        if (sendFormData) {
          // POST 请求：发送当前表单数据
          const currentFormData = ctx.getAllFormValues();
          console.log('发送表单数据到后端:', currentFormData);
          
          response = await fetch('/api/resolve-form', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id,
              code,
              type,
              formData: currentFormData
            })
          });
        } else {
          // GET 请求：获取模板数据
          const queryParams = new URLSearchParams();
          if (id) queryParams.append('id', id);
          if (code) queryParams.append('code', code);
          queryParams.append('type', type);
          if (getFormData) queryParams.append('getFormData', 'true');
          
          console.log('从 API 获取数据:', `/api/resolve-form?${queryParams.toString()}`);
          response = await fetch(`/api/resolve-form?${queryParams.toString()}`);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        formData = await response.json();
        dataSource = 'api';
        console.log('从 API 获取到数据:', formData);
      }
      
      // 发布数据到事件总线
      ctx.publish('form.data.resolved', {
        id: id,
        code: code,
        type,
        data: formData,
        timestamp: Date.now(),
        source: dataSource
      });
      
      return formData;
    } catch (error) {
      console.error('resolvefetch 错误:', error);
      ctx.publish('form.data.error', {
        id: id,
        code: code,
        type,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  },
  
  navigateBack: (params, ctx) => {
    const historyItem = navigationHistory.goBack();
    if (historyItem) {
      console.log('导航后退到:', historyItem);
      
      // 发布导航事件
      ctx.publish('page.navigate', {
        pageId: historyItem.pageId,
        pageName: historyItem.pageName,
        fromHistory: true
      });
      
      // 使用SPA导航，避免页面刷新
      window.history.pushState(
        { pageId: historyItem.pageId, fromHistory: true },
        historyItem.title || historyItem.pageId,
        historyItem.url
      );
      
      // 触发自定义导航事件
      window.dispatchEvent(new CustomEvent('spa-navigate', {
        detail: {
          pageId: historyItem.pageId,
          pageName: historyItem.pageName,
          fromHistory: true
        }
      }));
    } else {
      console.log('无法后退：已在历史记录的开始位置');
    }
  },
  
  openCodeEditor: (params, ctx) => {
    const { field = 'handler', currentValue = '', title = '代码编辑器' } = params;
    
    // 发布打开代码编辑器事件
    ctx.publish('codeEditor.open', {
      field,
      currentValue,
      title,
      timestamp: Date.now()
    });
  },
  
  navigateForward: (params, ctx) => {
    const historyItem = navigationHistory.goForward();
    if (historyItem) {
      // 发布导航事件
      ctx.publish('page.navigate', {
        pageId: historyItem.pageId,
        pageName: historyItem.pageName,
        fromHistory: true
      });
      
      // 使用SPA导航，避免页面刷新
      window.history.pushState(
        { pageId: historyItem.pageId, fromHistory: true },
        historyItem.title || historyItem.pageId,
        historyItem.url
      );
      
      // 触发自定义导航事件
      window.dispatchEvent(new CustomEvent('spa-navigate', {
        detail: {
          pageId: historyItem.pageId,
          pageName: historyItem.pageName,
          fromHistory: true
        }
      }));
    } else {
      console.log('无法前进：已在历史记录的末尾位置');
    }
  },

  // 页面刷新功能
  refreshPage: (params, ctx) => {
    console.log('[handlers] refreshPage 被调用:', params);
    // 发布页面刷新事件，清除缓存并重新加载数据
    ctx.publish('page.refresh', {
      pageId: params?.pageId,
      clearCache: params?.clearCache !== false, // 默认清除缓存
      timestamp: Date.now()
    });
  },

  // 列表刷新功能
  refreshList: (params, ctx) => {
    // 发布列表刷新事件
    ctx.publish('list.refresh', {
      listId: params?.listId,
      componentId: params?.componentId,
      nodeId: params?.nodeId,
      timestamp: Date.now()
    });
  },

  // 刷新当前页面
  refreshCurrentPage: (params, ctx) => {
    console.log('[handlers] refreshCurrentPage 被调用:', params);
    // 刷新当前页面，清除所有缓存
    ctx.publish('page.refresh', {
      clearCache: true,
      timestamp: Date.now()
    });
  },

  // 刷新所有列表
  refreshAllLists: (params, ctx) => {
    // 刷新页面上的所有列表组件
    ctx.publish('list.refresh.all', {
      timestamp: Date.now()
    });
  }
};

export function getHandlers() {
  return handlers;
}

export async function execHandler(name: string, params: any) {
  // 如果params包含script属性，执行JavaScript脚本
  if (params && typeof params.script === 'string') {
    const ctx: HandlerContext = {
      getText: (id) => document.getElementById(id)?.textContent ?? null,
      getValue: (id) => (document.getElementById(id) as HTMLInputElement | null)?.value,
      setText: (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      },
      publish: (topic, payload) => bus.publish(topic, payload),
      // 统一复用 formValidationManager 提供的方法，保证键优先使用 nodeCode
      getFormValue: (nodeId, fieldName = 'value') => formValidationManager.getFormValue(nodeId, fieldName),
      getAllFormValues: () => formValidationManager.getAllFormValues(),
    };
    
    try {
      // 创建一个异步函数来执行脚本，支持await语法
      // 注入 payload 变量，兼容脚本中直接使用 `payload`
      const scriptFunction = new Function('ctx', 'params', 'event', 'execHandler', `
        const payload = params?.payload;
        return (async () => {
          ${params.script}
        })();
      `);
      return await scriptFunction(ctx, params, params.event || null, execHandler);
    } catch (error) {
      console.error('执行事件脚本时出错:', error);
      return;
    }
  }
  
  // 原有的处理器逻辑
  const h = handlers[name];
  if (!h) return;
  const ctx: HandlerContext = {
    getText: (id) => document.getElementById(id)?.textContent ?? null,
    getValue: (id) => (document.getElementById(id) as HTMLInputElement | null)?.value,
    setText: (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    },
    publish: (topic, payload) => bus.publish(topic, payload),
    // 统一复用 formValidationManager 提供的方法
    getFormValue: (nodeId, fieldName = 'value') => formValidationManager.getFormValue(nodeId, fieldName),
    getAllFormValues: () => formValidationManager.getAllFormValues(),
  };
  return h(params, ctx);
}

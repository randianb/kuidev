import { bus } from "./eventBus";
import { formValidationManager } from "../studio/form-validation";

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
    ctx.publish("dialog.open", { title: params?.title ?? "提示", content: params?.content ?? "" });
  },
  setTextById: (params, ctx) => {
    if (!params?.id) return;
    ctx.setText(params.id, params?.text ?? "");
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
    
    // 原有的API调用逻辑
    if (!id && !code) {
      console.error('resolvefetch: 需要提供 id、code 或 script 参数');
      return;
    }
    
    try {
      let response;
      let formData;
      
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
        // GET 请求：获取模板数据（原有逻辑）
        const queryParams = new URLSearchParams();
        if (id) queryParams.append('id', id);
        if (code) queryParams.append('code', code);
        queryParams.append('type', type);
        if (getFormData) queryParams.append('getFormData', 'true');
        
        response = await fetch(`/api/resolve-form?${queryParams.toString()}`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      formData = await response.json();
      
      // 发布数据到事件总线
      ctx.publish('form.data.resolved', {
        id: id || code,
        type,
        data: formData,
        timestamp: Date.now()
      });
      
      return formData;
    } catch (error) {
      console.error('resolvefetch 错误:', error);
      ctx.publish('form.data.error', {
        id: id || code,
        type,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  },
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
      const scriptFunction = new Function('ctx', 'params', 'event', 'execHandler', `
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

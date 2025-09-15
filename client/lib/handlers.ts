import { bus } from "./eventBus";

export type HandlerContext = {
  getText: (id: string) => string | null;
  getValue: (id: string) => any;
  setText: (id: string, text: string) => void;
  publish: (topic: string, payload?: any) => void;
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
    const { id, code, type = 'form' } = params;
    if (!id && !code) {
      console.error('resolvefetch: 需要提供 id 或 code 参数');
      return;
    }
    
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (id) queryParams.append('id', id);
      if (code) queryParams.append('code', code);
      queryParams.append('type', type);
      
      // 发起请求获取表单数据
      const response = await fetch(`/api/resolve-form?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const formData = await response.json();
      
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

export function execHandler(name: string, params: any) {
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
  };
  return h(params, ctx);
}

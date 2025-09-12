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

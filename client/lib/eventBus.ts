export type Handler<T = any> = (payload: T) => void;

class EventBus {
  private topics = new Map<string, Set<Handler>>();

  subscribe(topic: string, handler: Handler) {
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic)!.add(handler);
    return () => this.unsubscribe(topic, handler);
  }

  unsubscribe(topic: string, handler: Handler) {
    this.topics.get(topic)?.delete(handler);
  }

  publish<T = any>(topic: string, payload?: T) {
    this.topics.get(topic)?.forEach((h) => h(payload));
  }
}

export const bus = new EventBus();

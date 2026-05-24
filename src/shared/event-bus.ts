type EventCallback<T = unknown> = (data: T) => void;

class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Record<string, EventCallback<any>[]> = {};

  public on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return an unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  public off<T = unknown>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  public emit<T = unknown>(event: string, data: T): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

export const eventBus = new EventBus();

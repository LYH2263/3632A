import { defineStore } from 'pinia';
import { reactive, readonly } from 'vue';
import { getDataSource } from '../services/data-source';
import { useSessionStore } from './session';

interface MessageState {
  unreadCount: number;
}

type Listener = (count: number) => void;

class MessageStoreManager {
  private state: MessageState = reactive({
    unreadCount: 0
  });
  private listeners: Set<Listener> = new Set();

  getState(): MessageState {
    return readonly(this.state) as MessageState;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private _notify(count: number): void {
    for (const listener of this.listeners) {
      try {
        listener(count);
      } catch {
        // ignore
      }
    }
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const sessionStore = useSessionStore();
      const buyerId = sessionStore.state.user.id;
      const dataSource = getDataSource();
      const count = await dataSource.getUnreadMessageCount(buyerId);
      this._setUnreadCount(count);
    } catch {
      // ignore
    }
  }

  private _setUnreadCount(count: number): void {
    this.state.unreadCount = Math.max(0, count);
    this._notify(this.state.unreadCount);
  }

  decrementUnreadCount(amount = 1): void {
    this._setUnreadCount(Math.max(0, this.state.unreadCount - amount));
  }

  clearUnreadCount(): void {
    this._setUnreadCount(0);
  }

  setUnreadCount(count: number): void {
    this._setUnreadCount(count);
  }
}

const manager = new MessageStoreManager();

export const useMessageStore = defineStore('message', () => {
  return {
    state: manager.getState(),
    refreshUnreadCount: manager.refreshUnreadCount.bind(manager),
    decrementUnreadCount: manager.decrementUnreadCount.bind(manager),
    clearUnreadCount: manager.clearUnreadCount.bind(manager),
    setUnreadCount: manager.setUnreadCount.bind(manager),
    subscribe: manager.subscribe.bind(manager)
  };
});

import { reactive, readonly } from 'vue';
import { getDataSource } from '../services/data-source';
import { useSessionStore } from './session';

interface MessageState {
  unreadCount: number;
}

type Listener = (count: number) => void;

const state = reactive<MessageState>({
  unreadCount: 0
});

const listeners = new Set<Listener>();

function notify(count: number): void {
  for (const listener of listeners) {
    try {
      listener(count);
    } catch {
      // ignore
    }
  }
}

function setUnreadCount(count: number): void {
  state.unreadCount = Math.max(0, count);
  notify(state.unreadCount);
}

export function useMessageStore() {
  async function refreshUnreadCount(): Promise<void> {
    try {
      const sessionStore = useSessionStore();
      const buyerId = sessionStore.state.user.id;
      const dataSource = getDataSource();
      const count = await dataSource.getUnreadMessageCount(buyerId);
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }

  function decrementUnreadCount(amount = 1): void {
    setUnreadCount(Math.max(0, state.unreadCount - amount));
  }

  function clearUnreadCount(): void {
    setUnreadCount(0);
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    state: readonly(state),
    refreshUnreadCount,
    decrementUnreadCount,
    clearUnreadCount,
    setUnreadCount,
    subscribe
  };
}

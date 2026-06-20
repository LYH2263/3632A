function isWeixinMiniProgramRuntime(): boolean {
  const host = globalThis as { wx?: unknown };
  return typeof host.wx === 'object' && host.wx !== null;
}

export function showMessage(message: string): void {
  const host = globalThis as { alert?: (msg?: string) => void };
  if (isWeixinMiniProgramRuntime()) {
    if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
      uni.showToast({
        title: message,
        icon: 'none',
        duration: 1800
      });
      return;
    }
  }

  if (typeof host.alert === 'function') {
    host.alert(message);
    return;
  }

  if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 1800
    });
  }
}

export async function confirmAction(message: string): Promise<boolean> {
  if (isWeixinMiniProgramRuntime()) {
    if (typeof uni !== 'undefined' && typeof uni.showModal === 'function') {
      return new Promise((resolve) => {
        uni.showModal({
          title: '提示',
          content: message,
          success(result) {
            resolve(Boolean(result.confirm));
          },
          fail() {
            resolve(false);
          }
        });
      });
    }
  }

  const host = globalThis as { confirm?: (msg?: string) => boolean };
  if (typeof host.confirm === 'function') {
    return host.confirm(message);
  }

  if (typeof uni !== 'undefined' && typeof uni.showModal === 'function') {
    return new Promise((resolve) => {
      uni.showModal({
        title: '提示',
        content: message,
        success(result) {
          resolve(Boolean(result.confirm));
        },
        fail() {
          resolve(false);
        }
      });
    });
  }

  return true;
}

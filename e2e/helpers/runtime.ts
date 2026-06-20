import type { Page } from '@playwright/test';

export type RuntimeMode = 'mock' | 'api';

export const MINIAPP_BASE_URL = 'http://127.0.0.1:4173';
export const MERCHANT_WEB_BASE_URL = 'http://127.0.0.1:4174';
export const API_BASE_URL = 'http://127.0.0.1:8001/api/v1';

export interface DialogRecord {
  type: 'alert' | 'confirm';
  message: string;
}

export async function injectRuntimeConfig(
  page: Page,
  mode: RuntimeMode,
  apiBaseUrl = API_BASE_URL
): Promise<void> {
  await page.addInitScript(
    ({ dataMode, baseUrl }) => {
      const host = globalThis as {
        __COMMUNITY_STORE_RUNTIME__?: { dataMode: string; apiBaseUrl: string };
        __COMMUNITY_STORE_WEB_RUNTIME__?: { dataMode: string; apiBaseUrl: string };
      };

      host.__COMMUNITY_STORE_RUNTIME__ = {
        dataMode,
        apiBaseUrl: baseUrl
      };

      host.__COMMUNITY_STORE_WEB_RUNTIME__ = {
        dataMode,
        apiBaseUrl: baseUrl
      };
    },
    {
      dataMode: mode,
      baseUrl: apiBaseUrl
    }
  );
}

export async function injectDialogStubs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const host = globalThis as {
      __E2E_DIALOGS__?: Array<{ type: 'alert' | 'confirm'; message: string }>;
      __E2E_CONFIRM_RESPONSES__?: boolean[];
      alert?: (message?: string) => void;
      confirm?: (message?: string) => boolean;
    };

    host.__E2E_DIALOGS__ = [];
    host.__E2E_CONFIRM_RESPONSES__ = [];

    host.alert = (message?: string) => {
      host.__E2E_DIALOGS__?.push({
        type: 'alert',
        message: String(message ?? '')
      });
    };

    host.confirm = (message?: string) => {
      host.__E2E_DIALOGS__?.push({
        type: 'confirm',
        message: String(message ?? '')
      });

      const next = host.__E2E_CONFIRM_RESPONSES__?.shift();
      if (typeof next === 'boolean') {
        return next;
      }
      return true;
    };
  });
}

export async function queueConfirmResponse(
  page: Page,
  value: boolean
): Promise<void> {
  await page.evaluate((nextValue) => {
    const host = globalThis as {
      __E2E_CONFIRM_RESPONSES__?: boolean[];
    };

    if (!host.__E2E_CONFIRM_RESPONSES__) {
      host.__E2E_CONFIRM_RESPONSES__ = [];
    }

    host.__E2E_CONFIRM_RESPONSES__.push(nextValue);
  }, value);
}

export async function readDialogs(page: Page): Promise<DialogRecord[]> {
  return page.evaluate(() => {
    const host = globalThis as {
      __E2E_DIALOGS__?: Array<{ type: 'alert' | 'confirm'; message: string }>;
    };
    return (host.__E2E_DIALOGS__ ?? []).map((item) => ({
      type: item.type,
      message: item.message
    }));
  });
}

export async function clearDialogs(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = globalThis as {
      __E2E_DIALOGS__?: Array<{ type: 'alert' | 'confirm'; message: string }>;
    };
    host.__E2E_DIALOGS__ = [];
  });
}

export async function gotoMiniapp(
  page: Page,
  path = '/',
  mode: RuntimeMode = 'mock'
): Promise<void> {
  await injectRuntimeConfig(page, mode);
  await injectDialogStubs(page);
  await page.goto(`${MINIAPP_BASE_URL}${path}`);
}

export async function gotoMerchantWeb(
  page: Page,
  path = '/',
  mode: RuntimeMode = 'mock'
): Promise<void> {
  await injectRuntimeConfig(page, mode);
  await page.goto(`${MERCHANT_WEB_BASE_URL}${path}`);
}

export async function clearOriginStorage(
  page: Page,
  origin: string
): Promise<void> {
  await page.goto(origin);
  await page.evaluate(() => {
    globalThis.localStorage?.clear();
    globalThis.sessionStorage?.clear();
  });
}

export async function setStorageJSON<T>(
  page: Page,
  key: string,
  value: T
): Promise<void> {
  await page.evaluate(
    ({ storageKey, storageValue }) => {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify(storageValue));
    },
    {
      storageKey: key,
      storageValue: value
    }
  );
}

export async function getStorageJSON<T>(
  page: Page,
  key: string
): Promise<T | null> {
  return page.evaluate((storageKey) => {
    const raw = globalThis.localStorage?.getItem(storageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }, key);
}

/**
 * 兼容 uniapp(H5) 下 input 渲染为 <uni-input> 包裹结构的场景。
 * 当 data-testid 标在容器节点时，优先填充其内部真实可编辑控件。
 */
export async function fillByTestId(
  page: Page,
  testId: string,
  value: string
): Promise<void> {
  const target = page.getByTestId(testId).first();
  const textbox = target.getByRole('textbox');
  if (await textbox.count()) {
    await textbox.first().fill(value);
    return;
  }
  const editable = target.locator('input, textarea, [contenteditable="true"]');
  if (await editable.count()) {
    await editable.first().fill(value);
    return;
  }

  await target.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  if (value) {
    await page.keyboard.type(value);
  }
}

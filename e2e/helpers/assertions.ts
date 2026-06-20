import { expect, type APIResponse, type Page } from '@playwright/test';
import { readDialogs } from './runtime';

export async function expectApiSuccess<T>(
  response: APIResponse,
  statusCode = 200
): Promise<T> {
  expect(response.status()).toBe(statusCode);
  const payload = (await response.json()) as {
    message: string;
    data: T;
  };
  expect(payload.message).toBe('ok');
  return payload.data;
}

export async function expectApiError(
  response: APIResponse,
  statusCode: number,
  message: string
): Promise<string[]> {
  expect(response.status()).toBe(statusCode);
  const payload = (await response.json()) as {
    message?: string;
    errors?: string[];
  };
  expect(payload.message ?? '').toContain(message);
  return payload.errors ?? [];
}

export async function expectLatestDialogContains(
  page: Page,
  message: string,
  type: 'alert' | 'confirm' = 'alert'
): Promise<void> {
  await expect
    .poll(async () => {
      const dialogs = await readDialogs(page);
      return dialogs.filter((item) => item.type === type).at(-1)?.message ?? '';
    })
    .toContain(message);
}

export async function expectLatestToastContains(
  page: Page,
  message: string
): Promise<void> {
  await expect
    .poll(async () => {
      const toast = page.locator('.el-message .el-message__content').last();
      if (!(await toast.count())) {
        return '';
      }
      return (await toast.textContent()) ?? '';
    })
    .toContain(message);
}

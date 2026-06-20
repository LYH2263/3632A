import type { APIRequestContext, APIResponse } from '@playwright/test';
import { execSync } from 'node:child_process';
import { API_BASE_URL } from './runtime';

export interface ApiEnvelope<T> {
  message: string;
  data: T;
  errors?: string[];
}

interface ApiRequestOptions {
  token?: string;
}

function buildHeaders(options?: ApiRequestOptions): Record<string, string> | undefined {
  if (!options?.token) {
    return undefined;
  }
  return {
    Authorization: `Bearer ${options.token}`
  };
}

export async function apiGet(
  request: APIRequestContext,
  path: string,
  options?: ApiRequestOptions
): Promise<APIResponse> {
  return request.get(`${API_BASE_URL}${path}`, {
    headers: buildHeaders(options)
  });
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  data: unknown,
  options?: ApiRequestOptions
): Promise<APIResponse> {
  return request.post(`${API_BASE_URL}${path}`, {
    data,
    headers: buildHeaders(options)
  });
}

export async function apiPatch(
  request: APIRequestContext,
  path: string,
  data: unknown,
  options?: ApiRequestOptions
): Promise<APIResponse> {
  return request.patch(`${API_BASE_URL}${path}`, {
    data,
    headers: buildHeaders(options)
  });
}

export async function parseEnvelope<T>(response: APIResponse): Promise<ApiEnvelope<T>> {
  return (await response.json()) as ApiEnvelope<T>;
}

export function resetBackendData(): void {
  execSync('pnpm --filter backend run e2e:reset', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
}

export function tokenOf(userId: number): string {
  return `django-token-${userId}`;
}

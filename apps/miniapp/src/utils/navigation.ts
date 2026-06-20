type QueryValue = string | number | boolean | undefined | null;

function toQueryString(query?: Record<string, QueryValue>): string {
  if (!query) {
    return '';
  }

  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return entries.length ? `?${entries.join('&')}` : '';
}

export function buildPageUrl(path: string, query?: Record<string, QueryValue>): string {
  return `/${path}${toQueryString(query)}`;
}

export function navigateTo(path: string, query?: Record<string, QueryValue>): void {
  uni.navigateTo({
    url: buildPageUrl(path, query)
  });
}

export function redirectTo(path: string, query?: Record<string, QueryValue>): void {
  uni.redirectTo({
    url: buildPageUrl(path, query)
  });
}

export function numberOption(
  source: Record<string, unknown>,
  key: string,
  fallback = 0
): number {
  const raw = source[key];
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

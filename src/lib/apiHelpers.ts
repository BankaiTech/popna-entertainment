import type { AxiosResponse } from 'axios';
import { env } from './env';

/** Whether the app should use in-memory mock APIs instead of the real backend. */
export function isMockMode(): boolean {
  return env.USE_MOCK_API;
}

/** Unwrap `{ data: T }` envelope or return body as-is. */
export function unwrapApiData<T>(response: AxiosResponse): T {
  const body = response.data;
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Recursively convert object keys from snake_case to camelCase. */
export function toCamelCase<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => toCamelCase(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        snakeToCamel(key),
        toCamelCase(val),
      ])
    ) as T;
  }
  return value as T;
}

/** Recursively convert object keys from camelCase to snake_case. */
export function toSnakeCase(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const snakeKey = camelToSnake(key);
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[snakeKey] = toSnakeCase(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      result[snakeKey] = val.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? toSnakeCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[snakeKey] = val;
    }
  }
  return result;
}

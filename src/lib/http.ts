/**
 * Shared HTTP helpers for real backend integration.
 * Backend uses snake_case; frontend types use camelCase.
 */

import { env } from './env';

export const useMockApi = (): boolean => env.USE_MOCK_API;

/** Convert snake_case keys to camelCase (shallow + nested objects/arrays). */
export function toCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => toCamel(item)) as T;
  }
  if (input !== null && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      out[camel] = toCamel(value);
    }
    return out as T;
  }
  return input as T;
}

/** Convert camelCase keys to snake_case (shallow + nested objects/arrays). */
export function toSnake<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => toSnake(item)) as T;
  }
  if (input !== null && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      out[snake] = toSnake(value);
    }
    return out as T;
  }
  return input as T;
}

/** Unwrap common API list envelopes: [], { results }, { data }, { items } */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return toCamel<T[]>(data);
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.results)) return toCamel<T[]>(obj.results);
    if (Array.isArray(obj.data)) return toCamel<T[]>(obj.data);
    if (Array.isArray(obj.items)) return toCamel<T[]>(obj.items);
  }
  return [];
}

/** Unwrap single-object envelopes: obj | { data } | { result } */
export function unwrapOne<T>(data: unknown): T {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      return toCamel<T>(obj.data);
    }
    if (obj.result && typeof obj.result === 'object' && !Array.isArray(obj.result)) {
      return toCamel<T>(obj.result);
    }
  }
  return toCamel<T>(data);
}

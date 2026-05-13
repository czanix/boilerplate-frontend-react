import { useState, useCallback } from 'react';
import type { Result } from '../utils/result';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(url: string, options?: RequestInit): Promise<Result<T>> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const err = body.error ?? `HTTP ${response.status}`;
        setError(err);
        return { ok: false, error: err };
      }
      return { ok: true, value: await response.json() };
    } catch {
      setError('Network error');
      return { ok: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}

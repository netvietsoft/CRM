/**
 * React Hook for API calls with auto-refresh
 * 
 * Usage:
 * const { data, loading, error, refetch } = useApi('/api/customers');
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface UseApiOptions {
  skip?: boolean; // Skip initial fetch
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = any>(
  url: string,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClientClient.get<T>(url);
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    if (!options.skip) {
      fetchData();
    }
  }, [fetchData, options.skip]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 * 
 * Usage:
 * const { mutate, loading, error } = useMutation('/api/customers', 'POST');
 * await mutate({ name: 'John' });
 */
export function useMutation<TData = any, TResponse = any>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data?: TData): Promise<TResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        let result: TResponse;
        if (method === 'POST') {
          result = await apiClientClient.post<TResponse>(url, data || {});
        } else if (method === 'PUT') {
          result = await apiClientClient.put<TResponse>(url, data || {});
        } else {
          result = await apiClientClient.delete<TResponse>(url);
        }
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  return {
    mutate,
    loading,
    error,
  };
}

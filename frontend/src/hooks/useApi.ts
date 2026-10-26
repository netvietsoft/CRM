/**
 * React Hook for API calls with auto-refresh
 * 
 * Usage:
 * const { data, loading, error, refetch } = useApi('/api/customers');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface UseApiOptions<TData> {
  skip?: boolean; // Skip initial fetch
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = unknown>(
  url: string,
  options: UseApiOptions<T> = {}
) {
  const { skip = false, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClientClient.get<T>(url);
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!skip) {
      Promise.resolve().then(() => {
        void fetchData();
      });
    }
  }, [fetchData, skip]);

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
export function useMutation<TData = unknown, TResponse = unknown>(
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

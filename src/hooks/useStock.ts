/**
 * 株価データ取得用カスタムフック
 *
 * UIコンポーネントからAPIを呼び出すための抽象化レイヤーです。
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StockQuote } from '@/types';

interface StockData {
  nikkei: StockQuote | null;
  sp500: StockQuote | null;
}

interface UseStockReturn {
  data: StockData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 株価データを取得するフック
 */
export function useStock(): UseStockReturn {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stock', { signal });
      if (signal?.aborted) return;
      const result = await response.json();
      if (signal?.aborted) return;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stock data');
      }

      setData(result.data);
      setLoading(false);
    } catch (err) {
      // AbortErrorは無視（コンポーネントのアンマウント時など）
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (signal?.aborted) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort('component unmounted');
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData() };
}

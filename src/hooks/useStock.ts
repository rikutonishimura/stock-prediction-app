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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stock');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stock data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

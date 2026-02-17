/**
 * 株価履歴取得用カスタムフック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export type Period = '1w' | '3m' | '1y' | '5y';

export interface HistoryDataPoint {
  date: string;
  timestamp: number;
  price: number;
}

export interface StockHistoryData {
  symbol: string;
  name: string;
  data: HistoryDataPoint[];
  currentPrice: number;
  previousClose: number;
  changePercent: number;
}

interface UseStockHistoryReturn {
  nikkei: StockHistoryData | null;
  sp500: StockHistoryData | null;
  gold: StockHistoryData | null;
  usdjpy: StockHistoryData | null;
  loading: boolean;
  error: string | null;
  period: Period;
  setPeriod: (period: Period) => void;
  refetch: () => void;
}

export function useStockHistory(initialPeriod: Period = '3m'): UseStockHistoryReturn {
  const [nikkei, setNikkei] = useState<StockHistoryData | null>(null);
  const [sp500, setSp500] = useState<StockHistoryData | null>(null);
  const [gold, setGold] = useState<StockHistoryData | null>(null);
  const [usdjpy, setUsdjpy] = useState<StockHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const fetchHistory = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock/history?period=${period}`, { signal });
      if (signal?.aborted) return;
      const result = await response.json();
      if (signal?.aborted) return;

      if (result.success) {
        setNikkei(result.data.nikkei);
        setSp500(result.data.sp500);
        setGold(result.data.gold);
        setUsdjpy(result.data.usdjpy);
      } else {
        setError(result.error || 'Failed to fetch stock history');
      }
      setLoading(false);
    } catch (err) {
      // AbortErrorは無視（コンポーネントのアンマウント時など）
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (signal?.aborted) {
        return;
      }
      setError('ネットワークエラーが発生しました');
      console.error('Stock history fetch error:', err);
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort('component unmounted');
  }, [fetchHistory]);

  return {
    nikkei,
    sp500,
    gold,
    usdjpy,
    loading,
    error,
    period,
    setPeriod,
    refetch: () => fetchHistory(),
  };
}

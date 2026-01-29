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
  loading: boolean;
  error: string | null;
  period: Period;
  setPeriod: (period: Period) => void;
  refetch: () => void;
}

export function useStockHistory(initialPeriod: Period = '3m'): UseStockHistoryReturn {
  const [nikkei, setNikkei] = useState<StockHistoryData | null>(null);
  const [sp500, setSp500] = useState<StockHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock/history?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setNikkei(result.data.nikkei);
        setSp500(result.data.sp500);
      } else {
        setError(result.error || 'Failed to fetch stock history');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
      console.error('Stock history fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    nikkei,
    sp500,
    loading,
    error,
    period,
    setPeriod,
    refetch: fetchHistory,
  };
}

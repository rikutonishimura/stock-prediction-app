/**
 * 予想データ管理用カスタムフック
 *
 * Supabaseへの保存・読み込みを抽象化し、
 * UIコンポーネントから簡単にデータを操作できるようにします。
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PredictionRecord, PredictionInput, OverallStats, StockQuote, StockSymbol } from '@/types';
import { PREDICTABLE_SYMBOLS } from '@/types';
import {
  getAllPredictions,
  addPrediction,
  getTodayPrediction,
  updatePredictionResult,
  deletePrediction,
  getPendingPredictions,
  editPrediction,
} from '@/lib/supabase-storage';
import { calculateStockStats } from '@/lib/stats';
import { canAutoConfirm } from '@/lib/marketHours';
import { useAuth } from '@/hooks/useAuth';

interface StockData {
  nikkei: StockQuote | null;
  sp500: StockQuote | null;
  gold: StockQuote | null;
  bitcoin: StockQuote | null;
}

interface UsePredictionsOptions {
  stockData?: StockData | null;
}

interface UsePredictionsReturn {
  predictions: PredictionRecord[];
  todayPrediction: PredictionRecord | null;
  pendingPredictions: PredictionRecord[];
  stats: OverallStats;
  loading: boolean;
  add: (input: PredictionInput) => Promise<PredictionRecord | null>;
  updateResult: (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
      gold?: { actualChange: number };
      bitcoin?: { actualChange: number };
    }
  ) => Promise<PredictionRecord | null>;
  edit: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
      gold?: { predictedChange?: number; actualChange?: number | null };
      bitcoin?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => Promise<PredictionRecord | null>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => void;
}

/** レコードから予想した銘柄を取得 */
function getPredictedAssets(record: PredictionRecord): StockSymbol[] {
  return PREDICTABLE_SYMBOLS.filter(s => record[s] != null);
}

export function usePredictions(options: UsePredictionsOptions = {}): UsePredictionsReturn {
  const { stockData } = options;
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [todayPrediction, setTodayPrediction] = useState<PredictionRecord | null>(null);
  const [pendingPredictions, setPendingPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const autoConfirmProcessedRef = useRef<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [allData, today, pending] = await Promise.all([
        getAllPredictions(user.id),
        getTodayPrediction(user.id),
        getPendingPredictions(user.id),
      ]);
      setPredictions(allData);
      setTodayPrediction(today);
      setPendingPredictions(pending);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自動確定処理
  const autoConfirmRunRef = useRef(false);
  useEffect(() => {
    if (!user || !stockData) {
      autoConfirmRunRef.current = false;
      return;
    }

    // 少なくとも1つの株価データがあるか
    const hasAnyData = PREDICTABLE_SYMBOLS.some(s => stockData[s]?.changePercent != null);
    if (!hasAnyData) {
      autoConfirmRunRef.current = false;
      return;
    }

    if (autoConfirmRunRef.current) return;
    autoConfirmRunRef.current = true;

    const processAutoConfirm = async () => {
      let hasUpdates = false;

      for (const record of pendingPredictions) {
        if (autoConfirmProcessedRef.current.has(record.id)) continue;

        const predictedAssets = getPredictedAssets(record);
        if (predictedAssets.length === 0) continue;

        if (canAutoConfirm(record.date, record.confirmedAt, predictedAssets)) {
          const results: Record<string, { actualChange: number }> = {};
          let allDataAvailable = true;

          for (const asset of predictedAssets) {
            const quote = stockData[asset];
            if (quote?.changePercent != null) {
              results[asset] = { actualChange: quote.changePercent };
            } else {
              allDataAvailable = false;
              break;
            }
          }

          if (!allDataAvailable) continue;

          const updated = await updatePredictionResult(user.id, record.id, results);
          if (updated) {
            autoConfirmProcessedRef.current.add(record.id);
            setPredictions(prev => prev.map(p => (p.id === record.id ? updated : p)));
            hasUpdates = true;
            console.log(`[自動確定] ${record.date} の予想を自動確定しました`);
          }
        }
      }

      if (hasUpdates) {
        const [today, pending] = await Promise.all([
          getTodayPrediction(user.id),
          getPendingPredictions(user.id),
        ]);
        setTodayPrediction(today);
        setPendingPredictions(pending);
      }
    };

    processAutoConfirm();
  }, [user, stockData]);

  const add = useCallback(async (input: PredictionInput): Promise<PredictionRecord | null> => {
    if (!user) return null;

    const newRecord = await addPrediction(user.id, input);
    if (newRecord) {
      setPredictions(prev => [newRecord, ...prev]);
      setTodayPrediction(newRecord);
      setPendingPredictions(prev => [newRecord, ...prev]);
    }
    return newRecord;
  }, [user]);

  const updateResultFn = useCallback(
    async (
      id: string,
      results: {
        nikkei?: { actualChange: number };
        sp500?: { actualChange: number };
        gold?: { actualChange: number };
        bitcoin?: { actualChange: number };
      }
    ): Promise<PredictionRecord | null> => {
      if (!user) return null;

      const updated = await updatePredictionResult(user.id, id, results);
      if (updated) {
        setPredictions(prev => prev.map(p => (p.id === id ? updated : p)));
        const [today, pending] = await Promise.all([
          getTodayPrediction(user.id),
          getPendingPredictions(user.id),
        ]);
        setTodayPrediction(today);
        setPendingPredictions(pending);
      }
      return updated;
    },
    [user]
  );

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    const success = await deletePrediction(user.id, id);
    if (success) {
      setPredictions(prev => prev.filter(p => p.id !== id));
      const [today, pending] = await Promise.all([
        getTodayPrediction(user.id),
        getPendingPredictions(user.id),
      ]);
      setTodayPrediction(today);
      setPendingPredictions(pending);
    }
    return success;
  }, [user]);

  const editFn = useCallback(
    async (
      id: string,
      updates: {
        nikkei?: { predictedChange?: number; actualChange?: number | null };
        sp500?: { predictedChange?: number; actualChange?: number | null };
        gold?: { predictedChange?: number; actualChange?: number | null };
        bitcoin?: { predictedChange?: number; actualChange?: number | null };
      }
    ): Promise<PredictionRecord | null> => {
      if (!user) return null;

      const updated = await editPrediction(user.id, id, updates);
      if (updated) {
        setPredictions(prev => prev.map(p => (p.id === id ? updated : p)));
        const [today, pending] = await Promise.all([
          getTodayPrediction(user.id),
          getPendingPredictions(user.id),
        ]);
        setTodayPrediction(today);
        setPendingPredictions(pending);
      }
      return updated;
    },
    [user]
  );

  const stats: OverallStats = {
    nikkei: calculateStockStats(predictions, 'nikkei'),
    sp500: calculateStockStats(predictions, 'sp500'),
    gold: calculateStockStats(predictions, 'gold'),
    bitcoin: calculateStockStats(predictions, 'bitcoin'),
  };

  return {
    predictions,
    todayPrediction,
    pendingPredictions,
    stats,
    loading,
    add,
    updateResult: updateResultFn,
    edit: editFn,
    remove,
    refresh: loadData,
  };
}

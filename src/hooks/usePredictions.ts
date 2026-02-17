/**
 * 予想データ管理用カスタムフック
 *
 * Supabaseへの保存・読み込みを抽象化し、
 * UIコンポーネントから簡単にデータを操作できるようにします。
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PredictionRecord, PredictionInput, OverallStats, StockQuote } from '@/types';
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
}

interface UsePredictionsOptions {
  /** 株価データ（自動確定に使用） */
  stockData?: StockData | null;
}

interface UsePredictionsReturn {
  /** すべての予想レコード */
  predictions: PredictionRecord[];
  /** 今日の予想 */
  todayPrediction: PredictionRecord | null;
  /** 未確定の予想 */
  pendingPredictions: PredictionRecord[];
  /** 統計サマリー */
  stats: OverallStats;
  /** 読み込み中フラグ */
  loading: boolean;
  /** 新しい予想を追加 */
  add: (input: PredictionInput) => Promise<PredictionRecord | null>;
  /** 結果を更新 */
  updateResult: (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
    }
  ) => Promise<PredictionRecord | null>;
  /** 予想を編集 */
  edit: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => Promise<PredictionRecord | null>;
  /** 予想を削除 */
  remove: (id: string) => Promise<boolean>;
  /** データを再読み込み */
  refresh: () => void;
}

/**
 * 予想データを管理するフック
 * @param options.stockData 株価データ（自動確定に使用）
 */
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

  // 自動確定処理（株価データが更新されたときのみ実行）
  const autoConfirmRunRef = useRef(false);
  useEffect(() => {
    if (!user || !stockData?.nikkei?.changePercent || !stockData?.sp500?.changePercent) {
      autoConfirmRunRef.current = false;
      return;
    }

    // 既に実行済みの場合はスキップ（株価データが同じ間は1回だけ実行）
    if (autoConfirmRunRef.current) {
      return;
    }
    autoConfirmRunRef.current = true;

    const processAutoConfirm = async () => {
      let hasUpdates = false;

      for (const record of pendingPredictions) {
        // 既に処理済みの場合はスキップ
        if (autoConfirmProcessedRef.current.has(record.id)) {
          continue;
        }

        // 自動確定可能かチェック
        if (canAutoConfirm(record.date, record.confirmedAt)) {
          // 自動確定を実行
          const updated = await updatePredictionResult(user.id, record.id, {
            nikkei: { actualChange: stockData.nikkei!.changePercent },
            sp500: { actualChange: stockData.sp500!.changePercent },
          });

          if (updated) {
            autoConfirmProcessedRef.current.add(record.id);
            setPredictions((prev) =>
              prev.map((p) => (p.id === record.id ? updated : p))
            );
            hasUpdates = true;
            console.log(`[自動確定] ${record.date} の予想を自動確定しました`);
          }
        }
      }

      // 更新があった場合のみ再読み込み
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
      // 新規追加したレコードは未確定なので、ローカルstateに直接追加（追加のAPI呼び出しを避ける）
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
      }
    ): Promise<PredictionRecord | null> => {
      if (!user) return null;

      const updated = await updatePredictionResult(user.id, id, results);
      if (updated) {
        setPredictions(prev =>
          prev.map(p => (p.id === id ? updated : p))
        );
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
      }
    ): Promise<PredictionRecord | null> => {
      if (!user) return null;

      const updated = await editPrediction(user.id, id, updates);
      if (updated) {
        setPredictions(prev =>
          prev.map(p => (p.id === id ? updated : p))
        );
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

  // 統計データ
  const stats: OverallStats = {
    nikkei: calculateStockStats(predictions, 'nikkei'),
    sp500: calculateStockStats(predictions, 'sp500'),
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

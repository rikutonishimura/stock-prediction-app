/**
 * 予想データ管理用カスタムフック
 *
 * localStorageへの保存・読み込みを抽象化し、
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
} from '@/lib/storage';
import { calculateStockStats } from '@/lib/stats';
import { canAutoConfirm } from '@/lib/marketHours';

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
  add: (input: PredictionInput) => PredictionRecord;
  /** 結果を更新 */
  updateResult: (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
    }
  ) => PredictionRecord | null;
  /** 予想を編集 */
  edit: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => PredictionRecord | null;
  /** 予想を削除 */
  remove: (id: string) => boolean;
  /** データを再読み込み */
  refresh: () => void;
}

/**
 * 予想データを管理するフック
 * @param options.stockData 株価データ（自動確定に使用）
 */
export function usePredictions(options: UsePredictionsOptions = {}): UsePredictionsReturn {
  const { stockData } = options;
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [todayPrediction, setTodayPrediction] = useState<PredictionRecord | null>(null);
  const [pendingPredictions, setPendingPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const autoConfirmProcessedRef = useRef<Set<string>>(new Set());

  const loadData = useCallback(() => {
    setLoading(true);
    const data = getAllPredictions();
    setPredictions(data);
    setTodayPrediction(getTodayPrediction());
    setPendingPredictions(getPendingPredictions());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自動確定処理
  useEffect(() => {
    if (!stockData?.nikkei?.changePercent || !stockData?.sp500?.changePercent) {
      return;
    }

    const pending = getPendingPredictions();

    pending.forEach((record) => {
      // 既に処理済みの場合はスキップ
      if (autoConfirmProcessedRef.current.has(record.id)) {
        return;
      }

      // 自動確定可能かチェック
      if (canAutoConfirm(record.date, record.confirmedAt)) {
        // 自動確定を実行
        const updated = updatePredictionResult(record.id, {
          nikkei: { actualChange: stockData.nikkei!.changePercent },
          sp500: { actualChange: stockData.sp500!.changePercent },
        });

        if (updated) {
          autoConfirmProcessedRef.current.add(record.id);
          setPredictions((prev) =>
            prev.map((p) => (p.id === record.id ? updated : p))
          );
          setTodayPrediction(getTodayPrediction());
          setPendingPredictions(getPendingPredictions());
          console.log(`[自動確定] ${record.date} の予想を自動確定しました`);
        }
      }
    });
  }, [stockData]);

  const add = useCallback((input: PredictionInput): PredictionRecord => {
    const newRecord = addPrediction(input);
    setPredictions(prev => [...prev, newRecord]);
    setTodayPrediction(newRecord);
    setPendingPredictions(getPendingPredictions());
    return newRecord;
  }, []);

  const updateResult = useCallback(
    (
      id: string,
      results: {
        nikkei?: { actualChange: number };
        sp500?: { actualChange: number };
      }
    ): PredictionRecord | null => {
      const updated = updatePredictionResult(id, results);
      if (updated) {
        setPredictions(prev =>
          prev.map(p => (p.id === id ? updated : p))
        );
        setTodayPrediction(getTodayPrediction());
        setPendingPredictions(getPendingPredictions());
      }
      return updated;
    },
    []
  );

  const remove = useCallback((id: string): boolean => {
    const success = deletePrediction(id);
    if (success) {
      setPredictions(prev => prev.filter(p => p.id !== id));
      setTodayPrediction(getTodayPrediction());
      setPendingPredictions(getPendingPredictions());
    }
    return success;
  }, []);

  const edit = useCallback(
    (
      id: string,
      updates: {
        nikkei?: { predictedChange?: number; actualChange?: number | null };
        sp500?: { predictedChange?: number; actualChange?: number | null };
      }
    ): PredictionRecord | null => {
      const updated = editPrediction(id, updates);
      if (updated) {
        setPredictions(prev =>
          prev.map(p => (p.id === id ? updated : p))
        );
        setTodayPrediction(getTodayPrediction());
        setPendingPredictions(getPendingPredictions());
      }
      return updated;
    },
    []
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
    updateResult,
    edit,
    remove,
    refresh: loadData,
  };
}

/**
 * データ永続化レイヤー
 *
 * localStorageを使用した予想データの保存・取得を担当します。
 * 将来的にデータベースに移行する場合は、このファイルの実装を
 * 変更するだけで対応できます。
 */

import type { PredictionRecord, PredictionInput } from '@/types';
import { calculateDeviation } from './stats';

const STORAGE_KEY = 'stock_predictions';

/**
 * ユニークIDを生成する
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * localStorageが使用可能か確認
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * すべての予想レコードを取得する
 */
export function getAllPredictions(): PredictionRecord[] {
  if (!isStorageAvailable()) return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as PredictionRecord[];
  } catch (error) {
    console.error('Failed to load predictions:', error);
    return [];
  }
}

/**
 * 予想レコードを保存する
 */
export function savePredictions(records: PredictionRecord[]): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Failed to save predictions:', error);
    return false;
  }
}

/**
 * 新しい予想を追加する
 */
export function addPrediction(input: PredictionInput): PredictionRecord {
  const records = getAllPredictions();

  const newRecord: PredictionRecord = {
    id: generateId(),
    date: getTodayDate(),
    nikkei: {
      previousClose: input.nikkei.previousClose,
      predictedChange: input.nikkei.predictedChange,
      actualChange: null,
      deviation: null,
    },
    sp500: {
      previousClose: input.sp500.previousClose,
      predictedChange: input.sp500.predictedChange,
      actualChange: null,
      deviation: null,
    },
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };

  records.push(newRecord);
  savePredictions(records);

  return newRecord;
}

/**
 * 特定の日付の予想を取得する
 */
export function getPredictionByDate(date: string): PredictionRecord | null {
  const records = getAllPredictions();
  return records.find(r => r.date === date) || null;
}

/**
 * 今日の予想を取得する
 */
export function getTodayPrediction(): PredictionRecord | null {
  return getPredictionByDate(getTodayDate());
}

/**
 * 予想の結果を更新する（実際の変化率を設定）
 */
export function updatePredictionResult(
  id: string,
  results: {
    nikkei?: { actualChange: number };
    sp500?: { actualChange: number };
  }
): PredictionRecord | null {
  const records = getAllPredictions();
  const index = records.findIndex(r => r.id === id);

  if (index === -1) return null;

  const record = records[index];

  if (results.nikkei) {
    record.nikkei.actualChange = results.nikkei.actualChange;
    record.nikkei.deviation = calculateDeviation(
      record.nikkei.predictedChange,
      results.nikkei.actualChange
    );
  }

  if (results.sp500) {
    record.sp500.actualChange = results.sp500.actualChange;
    record.sp500.deviation = calculateDeviation(
      record.sp500.predictedChange,
      results.sp500.actualChange
    );
  }

  // 両方確定したら確定日時を設定
  if (record.nikkei.actualChange !== null && record.sp500.actualChange !== null) {
    record.confirmedAt = new Date().toISOString();
  }

  records[index] = record;
  savePredictions(records);

  return record;
}

/**
 * 予想を削除する
 */
export function deletePrediction(id: string): boolean {
  const records = getAllPredictions();
  const filtered = records.filter(r => r.id !== id);

  if (filtered.length === records.length) return false;

  return savePredictions(filtered);
}

/**
 * すべてのデータをクリアする
 */
export function clearAllPredictions(): boolean {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear predictions:', error);
    return false;
  }
}

/**
 * 未確定の予想一覧を取得する
 */
export function getPendingPredictions(): PredictionRecord[] {
  return getAllPredictions().filter(r => r.confirmedAt === null);
}

/**
 * 確定済みの予想一覧を取得する
 */
export function getConfirmedPredictions(): PredictionRecord[] {
  return getAllPredictions().filter(r => r.confirmedAt !== null);
}

/**
 * 予想を編集する（予想値と実際値の両方を編集可能）
 */
export function editPrediction(
  id: string,
  updates: {
    nikkei?: { predictedChange?: number; actualChange?: number | null };
    sp500?: { predictedChange?: number; actualChange?: number | null };
  }
): PredictionRecord | null {
  const records = getAllPredictions();
  const index = records.findIndex(r => r.id === id);

  if (index === -1) return null;

  const record = records[index];

  // 日経平均の更新
  if (updates.nikkei) {
    if (updates.nikkei.predictedChange !== undefined) {
      record.nikkei.predictedChange = updates.nikkei.predictedChange;
    }
    if (updates.nikkei.actualChange !== undefined) {
      record.nikkei.actualChange = updates.nikkei.actualChange;
    }
    // 乖離を再計算
    if (record.nikkei.actualChange !== null) {
      record.nikkei.deviation = calculateDeviation(
        record.nikkei.predictedChange,
        record.nikkei.actualChange
      );
    } else {
      record.nikkei.deviation = null;
    }
  }

  // S&P500の更新
  if (updates.sp500) {
    if (updates.sp500.predictedChange !== undefined) {
      record.sp500.predictedChange = updates.sp500.predictedChange;
    }
    if (updates.sp500.actualChange !== undefined) {
      record.sp500.actualChange = updates.sp500.actualChange;
    }
    // 乖離を再計算
    if (record.sp500.actualChange !== null) {
      record.sp500.deviation = calculateDeviation(
        record.sp500.predictedChange,
        record.sp500.actualChange
      );
    } else {
      record.sp500.deviation = null;
    }
  }

  // 確定状態を更新
  if (record.nikkei.actualChange !== null && record.sp500.actualChange !== null) {
    if (!record.confirmedAt) {
      record.confirmedAt = new Date().toISOString();
    }
  } else {
    record.confirmedAt = null;
  }

  records[index] = record;
  savePredictions(records);

  return record;
}

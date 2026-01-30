/**
 * Supabase用ストレージ関数
 *
 * 予想データをSupabaseデータベースに保存・取得します。
 */

import { createClient } from '@/lib/supabase/client';
import type { PredictionRecord, PredictionInput } from '@/types';

// DBの行をPredictionRecordに変換
function rowToRecord(row: Record<string, unknown>): PredictionRecord {
  return {
    id: row.id as string,
    date: row.date as string,
    nikkei: {
      previousClose: Number(row.nikkei_previous_close) || 0,
      predictedChange: Number(row.nikkei_predicted_change) || 0,
      actualChange: row.nikkei_actual_change != null ? Number(row.nikkei_actual_change) : null,
      deviation: row.nikkei_deviation != null ? Number(row.nikkei_deviation) : null,
    },
    sp500: {
      previousClose: Number(row.sp500_previous_close) || 0,
      predictedChange: Number(row.sp500_predicted_change) || 0,
      actualChange: row.sp500_actual_change != null ? Number(row.sp500_actual_change) : null,
      deviation: row.sp500_deviation != null ? Number(row.sp500_deviation) : null,
    },
    createdAt: row.created_at as string,
    confirmedAt: row.confirmed_at as string | null,
  };
}

// 乖離を計算
function calculateDeviation(predicted: number, actual: number): number {
  return Math.abs(predicted - actual);
}

// 今日の日付を取得 (YYYY-MM-DD)
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * すべての予想を取得
 */
export async function getAllPredictions(userId: string): Promise<PredictionRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching predictions:', error);
    return [];
  }

  return (data || []).map(rowToRecord);
}

/**
 * 今日の予想を取得
 */
export async function getTodayPrediction(userId: string): Promise<PredictionRecord | null> {
  const supabase = createClient();
  const today = getToday();

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToRecord(data);
}

/**
 * 未確定の予想を取得
 */
export async function getPendingPredictions(userId: string): Promise<PredictionRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .is('confirmed_at', null)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching pending predictions:', error);
    return [];
  }

  return (data || []).map(rowToRecord);
}

/**
 * 予想を追加
 */
export async function addPrediction(
  userId: string,
  input: PredictionInput
): Promise<PredictionRecord | null> {
  const supabase = createClient();
  const today = getToday();

  const { data, error } = await supabase
    .from('predictions')
    .insert({
      user_id: userId,
      date: today,
      nikkei_previous_close: input.nikkei.previousClose,
      nikkei_predicted_change: input.nikkei.predictedChange,
      sp500_previous_close: input.sp500.previousClose,
      sp500_predicted_change: input.sp500.predictedChange,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding prediction:', error);
    return null;
  }

  return rowToRecord(data);
}

/**
 * 予想結果を更新
 */
export async function updatePredictionResult(
  userId: string,
  id: string,
  results: {
    nikkei?: { actualChange: number };
    sp500?: { actualChange: number };
  }
): Promise<PredictionRecord | null> {
  const supabase = createClient();

  // 現在のレコードを取得
  const { data: current, error: fetchError } = await supabase
    .from('predictions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !current) {
    console.error('Error fetching prediction:', fetchError);
    return null;
  }

  const updates: Record<string, unknown> = {};

  if (results.nikkei) {
    updates.nikkei_actual_change = results.nikkei.actualChange;
    updates.nikkei_deviation = calculateDeviation(
      Number(current.nikkei_predicted_change),
      results.nikkei.actualChange
    );
  }

  if (results.sp500) {
    updates.sp500_actual_change = results.sp500.actualChange;
    updates.sp500_deviation = calculateDeviation(
      Number(current.sp500_predicted_change),
      results.sp500.actualChange
    );
  }

  // 両方確定したらconfirmed_atを設定
  const nikkeiActual = results.nikkei?.actualChange ?? current.nikkei_actual_change;
  const sp500Actual = results.sp500?.actualChange ?? current.sp500_actual_change;

  if (nikkeiActual != null && sp500Actual != null) {
    updates.confirmed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('predictions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating prediction:', error);
    return null;
  }

  return rowToRecord(data);
}

/**
 * 予想を編集
 */
export async function editPrediction(
  userId: string,
  id: string,
  updates: {
    nikkei?: { predictedChange?: number; actualChange?: number | null };
    sp500?: { predictedChange?: number; actualChange?: number | null };
  }
): Promise<PredictionRecord | null> {
  const supabase = createClient();

  const dbUpdates: Record<string, unknown> = {};

  if (updates.nikkei) {
    if (updates.nikkei.predictedChange !== undefined) {
      dbUpdates.nikkei_predicted_change = updates.nikkei.predictedChange;
    }
    if (updates.nikkei.actualChange !== undefined) {
      dbUpdates.nikkei_actual_change = updates.nikkei.actualChange;
      if (updates.nikkei.actualChange != null && dbUpdates.nikkei_predicted_change !== undefined) {
        dbUpdates.nikkei_deviation = calculateDeviation(
          dbUpdates.nikkei_predicted_change as number,
          updates.nikkei.actualChange
        );
      } else {
        dbUpdates.nikkei_deviation = null;
      }
    }
  }

  if (updates.sp500) {
    if (updates.sp500.predictedChange !== undefined) {
      dbUpdates.sp500_predicted_change = updates.sp500.predictedChange;
    }
    if (updates.sp500.actualChange !== undefined) {
      dbUpdates.sp500_actual_change = updates.sp500.actualChange;
      if (updates.sp500.actualChange != null && dbUpdates.sp500_predicted_change !== undefined) {
        dbUpdates.sp500_deviation = calculateDeviation(
          dbUpdates.sp500_predicted_change as number,
          updates.sp500.actualChange
        );
      } else {
        dbUpdates.sp500_deviation = null;
      }
    }
  }

  // confirmed_atの更新チェック
  const { data: current } = await supabase
    .from('predictions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (current) {
    const nikkeiActual = updates.nikkei?.actualChange !== undefined
      ? updates.nikkei.actualChange
      : current.nikkei_actual_change;
    const sp500Actual = updates.sp500?.actualChange !== undefined
      ? updates.sp500.actualChange
      : current.sp500_actual_change;

    if (nikkeiActual != null && sp500Actual != null) {
      dbUpdates.confirmed_at = new Date().toISOString();
    } else {
      dbUpdates.confirmed_at = null;
    }
  }

  const { data, error } = await supabase
    .from('predictions')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error editing prediction:', error);
    return null;
  }

  return rowToRecord(data);
}

/**
 * 予想を削除
 */
export async function deletePrediction(userId: string, id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting prediction:', error);
    return false;
  }

  return true;
}

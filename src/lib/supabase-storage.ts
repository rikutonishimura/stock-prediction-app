/**
 * Supabase用ストレージ関数
 *
 * 予想データをSupabaseデータベースに保存・取得します。
 */

import { createClient } from '@/lib/supabase/client';
import type { PredictionRecord, PredictionInput, StockSymbol } from '@/types';

const ASSET_KEYS: StockSymbol[] = ['nikkei', 'sp500', 'gold', 'bitcoin'];

// DBの行からStockPredictionを生成（predicted_changeがnullなら未予想=null）
function assetFromRow(row: Record<string, unknown>, prefix: string) {
  if (row[`${prefix}_predicted_change`] == null) return null;
  return {
    previousClose: Number(row[`${prefix}_previous_close`]) || 0,
    predictedChange: Number(row[`${prefix}_predicted_change`]) || 0,
    actualChange: row[`${prefix}_actual_change`] != null ? Number(row[`${prefix}_actual_change`]) : null,
    deviation: row[`${prefix}_deviation`] != null ? Number(row[`${prefix}_deviation`]) : null,
  };
}

// DBの行をPredictionRecordに変換
function rowToRecord(row: Record<string, unknown>): PredictionRecord {
  return {
    id: row.id as string,
    date: row.date as string,
    nikkei: assetFromRow(row, 'nikkei'),
    sp500: assetFromRow(row, 'sp500'),
    gold: assetFromRow(row, 'gold'),
    bitcoin: assetFromRow(row, 'bitcoin'),
    reviewComment: (row.review_comment as string | null) ?? null,
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
    .maybeSingle();

  if (error) {
    console.error('Error fetching today prediction:', error);
    return null;
  }

  if (!data) {
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
 * 予想を追加（選択した銘柄のみ）
 */
export async function addPrediction(
  userId: string,
  input: PredictionInput
): Promise<PredictionRecord | null> {
  const startTime = Date.now();
  const today = getToday();

  console.log('[addPrediction] 開始', { userId, today });

  try {
    const supabase = createClient();
    console.log('[addPrediction] Supabaseクライアント作成完了', Date.now() - startTime, 'ms');

    const insertData: Record<string, unknown> = {
      user_id: userId,
      date: today,
    };

    // 選択された銘柄のカラムだけ挿入
    for (const key of ASSET_KEYS) {
      const asset = input[key];
      if (asset) {
        insertData[`${key}_previous_close`] = asset.previousClose;
        insertData[`${key}_predicted_change`] = asset.predictedChange;
      }
    }

    console.log('[addPrediction] INSERT実行開始', insertData);

    const { data, error } = await supabase
      .from('predictions')
      .insert(insertData)
      .select()
      .single();

    console.log('[addPrediction] INSERT完了', Date.now() - startTime, 'ms');

    if (error) {
      console.error('[addPrediction] INSERT エラー:', error);

      // unique制約違反の場合は既存データを取得
      if (error.code === '23505') {
        console.log('[addPrediction] 既存データを取得中...');
        const { data: existing } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();
        console.log('[addPrediction] 既存データ取得完了', Date.now() - startTime, 'ms');
        return existing ? rowToRecord(existing) : null;
      }
      return null;
    }

    console.log('[addPrediction] 成功', data);
    return data ? rowToRecord(data) : null;
  } catch (err) {
    console.error('[addPrediction] 例外:', err, Date.now() - startTime, 'ms');
    return null;
  }
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
    gold?: { actualChange: number };
    bitcoin?: { actualChange: number };
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

  for (const key of ASSET_KEYS) {
    const result = results[key];
    if (result) {
      updates[`${key}_actual_change`] = result.actualChange;
      updates[`${key}_deviation`] = calculateDeviation(
        Number(current[`${key}_predicted_change`]),
        result.actualChange
      );
    }
  }

  // 予想した全銘柄に実績値があればconfirmed_atを設定
  const allConfirmed = ASSET_KEYS.every(key => {
    if (current[`${key}_predicted_change`] == null) return true; // 未予想はスキップ
    const actualValue = results[key]?.actualChange ?? current[`${key}_actual_change`];
    return actualValue != null;
  });

  if (allConfirmed) {
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
    gold?: { predictedChange?: number; actualChange?: number | null };
    bitcoin?: { predictedChange?: number; actualChange?: number | null };
  }
): Promise<PredictionRecord | null> {
  const supabase = createClient();

  const dbUpdates: Record<string, unknown> = {};

  for (const key of ASSET_KEYS) {
    const upd = updates[key];
    if (!upd) continue;

    if (upd.predictedChange !== undefined) {
      dbUpdates[`${key}_predicted_change`] = upd.predictedChange;
    }
    if (upd.actualChange !== undefined) {
      dbUpdates[`${key}_actual_change`] = upd.actualChange;
      if (upd.actualChange != null && dbUpdates[`${key}_predicted_change`] !== undefined) {
        dbUpdates[`${key}_deviation`] = calculateDeviation(
          dbUpdates[`${key}_predicted_change`] as number,
          upd.actualChange
        );
      } else {
        dbUpdates[`${key}_deviation`] = null;
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
    const allConfirmed = ASSET_KEYS.every(key => {
      if (current[`${key}_predicted_change`] == null) return true;
      const actualVal = updates[key]?.actualChange !== undefined
        ? updates[key]!.actualChange
        : current[`${key}_actual_change`];
      return actualVal != null;
    });

    if (allConfirmed) {
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
 * 振り返りコメントを保存
 */
export async function saveReviewComment(
  userId: string,
  id: string,
  comment: string
): Promise<PredictionRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('predictions')
    .update({ review_comment: comment || null })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error saving review comment:', error);
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

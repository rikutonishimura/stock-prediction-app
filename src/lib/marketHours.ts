/**
 * 市場営業時間ユーティリティ
 *
 * 各市場の終了時刻を判定し、自動確定のトリガーに使用します。
 */

import type { StockSymbol } from '@/types';

/**
 * 各市場の終了時刻（UTC）
 * 日経平均: 日本時間15:00 = UTC 06:00
 * S&P500: 米国東部時間16:00 = 冬時間 UTC 21:00
 * ゴールド (COMEX): UTC 22:00
 * ビットコイン: 24/7だが日次カットオフとしてUTC 21:00を使用
 */
const MARKET_CLOSE_HOURS_UTC: Record<StockSymbol, number> = {
  nikkei: 6,
  sp500: 21,
  gold: 22,
  bitcoin: 21,
};

/**
 * 指定された日付の市場が終了しているかチェック
 */
export function isMarketClosed(symbol: StockSymbol, predictionDate: string): boolean {
  const now = new Date();
  const prediction = new Date(predictionDate + 'T00:00:00');

  // 予想日が今日より前なら市場は確実に終了している
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  prediction.setHours(0, 0, 0, 0);

  if (prediction < today) {
    return true;
  }

  // 予想日が今日より後なら市場はまだ
  if (prediction > today) {
    return false;
  }

  // 予想日が今日の場合、現在時刻をチェック
  const currentHourUTC = now.getUTCHours();
  return currentHourUTC >= MARKET_CLOSE_HOURS_UTC[symbol];
}

/**
 * 予想した銘柄の市場がすべて終了しているかチェック
 */
export function areAllPredictedMarketsClosed(predictionDate: string, predictedAssets: StockSymbol[]): boolean {
  return predictedAssets.every(asset => isMarketClosed(asset, predictionDate));
}

/**
 * 予想が自動確定可能かチェック
 * - 未確定である
 * - 予想した銘柄の市場がすべて終了している
 */
export function canAutoConfirm(
  predictionDate: string,
  confirmedAt: string | null,
  predictedAssets: StockSymbol[]
): boolean {
  if (confirmedAt !== null) {
    return false; // 既に確定済み
  }

  if (predictedAssets.length === 0) {
    return false;
  }

  return areAllPredictedMarketsClosed(predictionDate, predictedAssets);
}

/**
 * 市場営業時間ユーティリティ
 *
 * 各市場の終了時刻を判定し、自動確定のトリガーに使用します。
 */

import type { StockSymbol } from '@/types';

/**
 * 日経平均の市場終了時刻（日本時間15:00 = UTC 06:00）
 */
const NIKKEI_MARKET_CLOSE_HOUR_UTC = 6;

/**
 * S&P500の市場終了時刻（米国東部時間16:00）
 * 冬時間: UTC 21:00、夏時間: UTC 20:00
 * 簡易的に21:00（冬時間）を使用
 */
const SP500_MARKET_CLOSE_HOUR_UTC = 21;

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

  if (symbol === 'nikkei') {
    // 日経平均: UTC 06:00以降なら終了
    return currentHourUTC >= NIKKEI_MARKET_CLOSE_HOUR_UTC;
  } else {
    // S&P500: UTC 21:00以降なら終了
    return currentHourUTC >= SP500_MARKET_CLOSE_HOUR_UTC;
  }
}

/**
 * 両方の市場が終了しているかチェック
 */
export function areBothMarketsClosed(predictionDate: string): boolean {
  return isMarketClosed('nikkei', predictionDate) && isMarketClosed('sp500', predictionDate);
}

/**
 * 予想が自動確定可能かチェック
 * - 未確定である
 * - 両方の市場が終了している
 */
export function canAutoConfirm(
  predictionDate: string,
  confirmedAt: string | null
): boolean {
  if (confirmedAt !== null) {
    return false; // 既に確定済み
  }

  return areBothMarketsClosed(predictionDate);
}

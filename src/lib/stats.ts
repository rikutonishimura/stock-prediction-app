/**
 * 統計計算ユーティリティ
 *
 * 乖離の計算や統計サマリーの生成を担当します。
 * 数学的な計算ロジックはすべてこのファイルに集約しています。
 */

import type { PredictionRecord, StockStats, StockSymbol, DailyDetail } from '@/types';

/** 銘柄別の乖離閾値 */
export interface DeviationThresholds {
  good: number;   // これ以下なら「優秀」
  fair: number;    // これ以下なら「普通」、超えたら「要改善」
}

/** 銘柄別の乖離閾値マップ */
export const DEVIATION_THRESHOLDS: Record<StockSymbol, DeviationThresholds> = {
  nikkei:  { good: 1.0, fair: 2.0 },
  sp500:   { good: 0.8, fair: 1.5 },
  gold:    { good: 1.0, fair: 2.0 },
  bitcoin: { good: 2.0, fair: 4.0 },
};

/** 乖離値に対応するカラークラスを返す */
export function getDeviationColorClass(deviation: number, symbol: StockSymbol): string {
  const t = DEVIATION_THRESHOLDS[symbol];
  if (deviation <= t.good) return 'text-green-600 dark:text-green-400';
  if (deviation <= t.fair) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/** ランキング用（全銘柄平均）の乖離カラークラスを返す */
export function getRankingDeviationColorClass(deviation: number): string {
  if (deviation <= 1.2) return 'text-green-600 dark:text-green-400';
  if (deviation <= 2.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * 乖離を計算する
 * @param predicted 予想変化率 (%)
 * @param actual 実際の変化率 (%)
 * @returns 乖離（絶対値）
 */
export function calculateDeviation(predicted: number, actual: number): number {
  return Math.abs(predicted - actual);
}

/**
 * 方向が一致しているか判定する
 * @param predicted 予想変化率 (%)
 * @param actual 実際の変化率 (%)
 * @returns 方向が一致していればtrue
 */
export function isDirectionCorrect(predicted: number, actual: number): boolean {
  // 両方0の場合は正解とする
  if (predicted === 0 && actual === 0) return true;
  // 符号が同じ、または片方が0で予想が小さい変動の場合
  if (predicted > 0 && actual > 0) return true;
  if (predicted < 0 && actual < 0) return true;
  // 予想が0で実際が小さい変動（±0.1%以内）の場合も正解とする
  if (predicted === 0 && Math.abs(actual) <= 0.1) return true;
  return false;
}

/**
 * 平均を計算する
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 標準偏差を計算する
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
}

/**
 * 特定銘柄の統計サマリーを計算する
 */
export function calculateStockStats(
  records: PredictionRecord[],
  symbol: StockSymbol
): StockStats {
  // この銘柄を予想したレコードのみ抽出（null = 未予想）
  const applicableRecords = records.filter(r => r[symbol] != null);
  // 確定済みのレコードのみ抽出
  const confirmedRecords = applicableRecords.filter(r => r[symbol]!.actualChange !== null);

  if (confirmedRecords.length === 0) {
    return {
      averageDeviation: 0,
      minDeviation: 0,
      minDeviationDate: null,
      maxDeviation: 0,
      maxDeviationDate: null,
      standardDeviation: 0,
      directionAccuracy: 0,
      totalPredictions: applicableRecords.length,
      confirmedPredictions: 0,
    };
  }

  const deviations = confirmedRecords.map(r => ({
    date: r.date,
    deviation: r[symbol]!.deviation!,
    predicted: r[symbol]!.predictedChange,
    actual: r[symbol]!.actualChange!,
  }));

  // 乖離の配列
  const deviationValues = deviations.map(d => d.deviation);

  // 最小・最大を見つける
  let minDeviation = Infinity;
  let minDeviationDate: string | null = null;
  let maxDeviation = -Infinity;
  let maxDeviationDate: string | null = null;

  for (const d of deviations) {
    if (d.deviation < minDeviation) {
      minDeviation = d.deviation;
      minDeviationDate = d.date;
    }
    if (d.deviation > maxDeviation) {
      maxDeviation = d.deviation;
      maxDeviationDate = d.date;
    }
  }

  // 方向正答率
  const correctDirections = deviations.filter(d =>
    isDirectionCorrect(d.predicted, d.actual)
  ).length;

  return {
    averageDeviation: calculateMean(deviationValues),
    minDeviation: minDeviation === Infinity ? 0 : minDeviation,
    minDeviationDate,
    maxDeviation: maxDeviation === -Infinity ? 0 : maxDeviation,
    maxDeviationDate,
    standardDeviation: calculateStandardDeviation(deviationValues),
    directionAccuracy: (correctDirections / confirmedRecords.length) * 100,
    totalPredictions: applicableRecords.length,
    confirmedPredictions: confirmedRecords.length,
  };
}

/**
 * 日別詳細データを取得する
 */
export function getDailyDetails(
  records: PredictionRecord[],
  symbol: StockSymbol
): DailyDetail[] {
  return records
    .filter(r => r[symbol] != null)
    .map(r => ({
      date: r.date,
      predicted: r[symbol]!.predictedChange,
      actual: r[symbol]!.actualChange,
      deviation: r[symbol]!.deviation,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // 新しい順
}

/**
 * 数値を小数点以下2桁でフォーマットする
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value == null || isNaN(value)) return '-';
  return value.toFixed(decimals);
}

/**
 * 変化率をフォーマットする（+/-記号付き）
 */
export function formatChange(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatNumber(value)}%`;
}

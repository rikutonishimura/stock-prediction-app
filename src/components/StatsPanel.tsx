/**
 * 統計パネルコンポーネント
 *
 * 乖離の統計情報を表示します。
 */

'use client';

import type { OverallStats, StockStats, StockSymbol } from '@/types';
import { formatNumber, getDeviationColorClass, DEVIATION_THRESHOLDS } from '@/lib/stats';

interface StatsPanelProps {
  stats: OverallStats;
}

interface SingleStatsProps {
  title: string;
  stats: StockStats;
  symbol: StockSymbol;
}

function SingleStats({ title, stats, symbol }: SingleStatsProps) {
  if (stats.confirmedPredictions === 0) {
    return (
      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">{title}</h4>
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          まだ確定済みのデータがありません
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
      <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h4>

      <div className="space-y-3">
        {/* 平均乖離 - メイン指標 */}
        <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-gray-200 dark:border-slate-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">平均乖離</div>
          <div
            className={`text-2xl font-bold ${getDeviationColorClass(stats.averageDeviation, symbol)}`}
          >
            {formatNumber(stats.averageDeviation)} <span className="text-base">ポイント</span>
          </div>
        </div>

        {/* 詳細統計 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white dark:bg-slate-800 rounded-md p-2 border border-gray-200 dark:border-slate-700">
            <div className="text-gray-500 dark:text-gray-400">最小乖離</div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {formatNumber(stats.minDeviation)}
            </div>
            {stats.minDeviationDate && (
              <div className="text-xs text-gray-400">{stats.minDeviationDate}</div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-md p-2 border border-gray-200 dark:border-slate-700">
            <div className="text-gray-500 dark:text-gray-400">最大乖離</div>
            <div className="font-semibold text-red-600 dark:text-red-400">
              {formatNumber(stats.maxDeviation)}
            </div>
            {stats.maxDeviationDate && (
              <div className="text-xs text-gray-400">{stats.maxDeviationDate}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white dark:bg-slate-800 rounded-md p-2 border border-gray-200 dark:border-slate-700">
            <div className="text-gray-500 dark:text-gray-400">標準偏差</div>
            <div className="font-semibold dark:text-white">{formatNumber(stats.standardDeviation)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-md p-2 border border-gray-200 dark:border-slate-700">
            <div className="text-gray-500 dark:text-gray-400">方向正答率</div>
            <div className="font-semibold dark:text-white">{formatNumber(stats.directionAccuracy)}%</div>
          </div>
        </div>

        {/* 予想回数 */}
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          確定済み: {stats.confirmedPredictions} / 総予想: {stats.totalPredictions}
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">予測精度の統計</h3>

      <div className="grid md:grid-cols-2 gap-6">
        <SingleStats title="日経平均" stats={stats.nikkei} symbol="nikkei" />
        <SingleStats title="S&P500" stats={stats.sp500} symbol="sp500" />
        <SingleStats title="ゴールド" stats={stats.gold} symbol="gold" />
        <SingleStats title="ビットコイン" stats={stats.bitcoin} symbol="bitcoin" />
      </div>

      {/* 精度の目安 */}
      <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-600 bg-[#F8FAFC] dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700">
          <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">乖離の目安（銘柄別）</h4>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-gray-500 dark:text-gray-400 font-medium text-xs">銘柄</th>
                <th className="py-2 px-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    優秀
                  </span>
                </th>
                <th className="py-2 px-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    普通
                  </span>
                </th>
                <th className="py-2 px-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                    要改善
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {([['日経平均', 'nikkei'], ['S&P500', 'sp500'], ['ゴールド', 'gold'], ['ビットコイン', 'bitcoin']] as const).map(([label, sym]) => {
                const t = DEVIATION_THRESHOLDS[sym];
                return (
                  <tr key={sym} className="border-t border-gray-100 dark:border-slate-700">
                    <td className="py-2.5 pr-3 font-bold text-gray-800 dark:text-gray-200">{label}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-green-600 dark:text-green-400">{t.good}以下</td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400">{t.good}~{t.fair}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-red-600 dark:text-red-400">{t.fair}超</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * 週次レポートパネル
 *
 * AIが生成する週間パフォーマンスレポートを表示します。
 */

'use client';

import { useState, useMemo } from 'react';
import type { PredictionRecord, StockSymbol } from '@/types';
import { STOCK_INFO } from '@/types';

interface WeeklyReport {
  weekLabel: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  assetBreakdown: Partial<Record<StockSymbol, string>>;
  growthNote: string;
  tip: string;
}

interface WeeklyReportPanelProps {
  predictions: PredictionRecord[];
}

/** 日付からISO週の月曜日を取得 */
function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/** 月曜日から日曜日のラベルを生成 */
function weekLabel(monday: string): string {
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

export function WeeklyReportPanel({ predictions }: WeeklyReportPanelProps) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 確定済み予測から利用可能な週を導出
  const availableWeeks = useMemo(() => {
    const confirmed = predictions.filter(p => p.confirmedAt);
    const weekMap = new Map<string, number>();
    for (const p of confirmed) {
      const monday = getMonday(p.date);
      weekMap.set(monday, (weekMap.get(monday) || 0) + 1);
    }
    return Array.from(weekMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monday, count]) => ({ monday, count, label: weekLabel(monday) }));
  }, [predictions]);

  const [selectedWeek, setSelectedWeek] = useState<string>(
    availableWeeks[0]?.monday || ''
  );

  const selectedWeekInfo = availableWeeks.find(w => w.monday === selectedWeek);

  const handleGenerate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/report/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate: selectedWeek }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'レポート生成に失敗しました');
      } else {
        setReport(data.report);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (availableWeeks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
          週間レポート
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(e.target.value);
              setReport(null);
              setError(null);
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableWeeks.map(w => (
              <option key={w.monday} value={w.monday}>
                {w.label}（{w.count}件）
              </option>
            ))}
          </select>
          {!report && (
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedWeek}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  生成中...
                </span>
              ) : (
                'AIレポートを生成'
              )}
            </button>
          )}
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={handleGenerate}
            className="ml-3 underline hover:no-underline"
          >
            再試行
          </button>
        </div>
      )}

      {/* レポート未生成時の説明 */}
      {!report && !loading && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          週を選択して「AIレポートを生成」を押すと、その週の予測パフォーマンスをAIが分析します。
          {selectedWeekInfo && ` (${selectedWeekInfo.label}: 確定済み${selectedWeekInfo.count}件)`}
        </p>
      )}

      {/* ローディング */}
      {loading && (
        <div className="py-8 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">AIがレポートを作成中...</p>
        </div>
      )}

      {/* レポート表示 */}
      {report && (
        <div className="space-y-5">
          {/* サマリー */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{report.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 良かった点 */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 text-sm">
                Good
              </h4>
              <ul className="space-y-1">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="text-green-500 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* 改善ポイント */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 text-sm">
                Next Step
              </h4>
              <ul className="space-y-1">
                {report.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="text-amber-500 shrink-0">-</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 銘柄別コメント */}
          {Object.keys(report.assetBreakdown).length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm">
                銘柄別コメント
              </h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {(Object.entries(report.assetBreakdown) as [StockSymbol, string][]).map(
                  ([sym, comment]) => (
                    <div key={sym} className="text-sm">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {STOCK_INFO[sym]?.name || sym}:
                      </span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{comment}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* 成長メモ */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-2 text-sm">
              Growth
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{report.growthNote}</p>
          </div>

          {/* 来週のヒント */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-2 text-sm">
              Tip
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{report.tip}</p>
          </div>

          {/* 閉じる / 再生成ボタン */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setReport(null)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              閉じる
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            >
              再生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

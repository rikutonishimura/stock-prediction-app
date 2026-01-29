/**
 * 履歴テーブルコンポーネント
 *
 * 過去の予想一覧を日別で表示します。
 */

'use client';

import type { PredictionRecord, StockSymbol } from '@/types';
import { formatChange, formatNumber } from '@/lib/stats';
import { useState } from 'react';

interface HistoryTableProps {
  predictions: PredictionRecord[];
  onDelete?: (id: string) => void;
}

export function HistoryTable({ predictions, onDelete }: HistoryTableProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<StockSymbol>('nikkei');

  // 日付の新しい順にソート
  const sortedPredictions = [...predictions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">予想履歴</h3>
        <p className="text-gray-500 text-center py-8">
          まだ予想データがありません
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">予想履歴</h3>

        {/* 銘柄切り替えタブ */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSymbol('nikkei')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedSymbol === 'nikkei'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            日経平均
          </button>
          <button
            onClick={() => setSelectedSymbol('sp500')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedSymbol === 'sp500'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            S&P500
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                日付
              </th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">
                予想
              </th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">
                実際
              </th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">
                乖離
              </th>
              {onDelete && (
                <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedPredictions.map((prediction) => {
              const data = prediction[selectedSymbol];
              const isConfirmed = data.actualChange !== null;

              return (
                <tr
                  key={prediction.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-2 text-sm">{prediction.date}</td>
                  <td className="py-3 px-2 text-sm text-right font-mono">
                    {formatChange(data.predictedChange)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-mono">
                    {isConfirmed ? (
                      <span
                        className={
                          data.actualChange! >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {formatChange(data.actualChange!)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-mono">
                    {isConfirmed ? (
                      <span
                        className={`font-semibold ${
                          data.deviation! <= 0.5
                            ? 'text-green-600'
                            : data.deviation! <= 1.0
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatNumber(data.deviation!)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  {onDelete && (
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => {
                          if (confirm('この予想を削除しますか？')) {
                            onDelete(prediction.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 件数表示 */}
      <div className="mt-4 text-sm text-gray-500 text-right">
        全 {predictions.length} 件
      </div>
    </div>
  );
}

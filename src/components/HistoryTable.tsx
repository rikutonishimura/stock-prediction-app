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
  onEdit?: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => void;
}

interface EditModalProps {
  prediction: PredictionRecord;
  onSave: (
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => void;
  onClose: () => void;
}

function EditModal({ prediction, onSave, onClose }: EditModalProps) {
  const [editValues, setEditValues] = useState({
    nikkei: {
      predicted: prediction.nikkei.predictedChange.toString(),
      actual: prediction.nikkei.actualChange?.toString() ?? '',
    },
    sp500: {
      predicted: prediction.sp500.predictedChange.toString(),
      actual: prediction.sp500.actualChange?.toString() ?? '',
    },
  });

  const handleSave = () => {
    const nikkeiPredicted = parseFloat(editValues.nikkei.predicted);
    const nikkeiActual = editValues.nikkei.actual.trim() === '' ? null : parseFloat(editValues.nikkei.actual);
    const sp500Predicted = parseFloat(editValues.sp500.predicted);
    const sp500Actual = editValues.sp500.actual.trim() === '' ? null : parseFloat(editValues.sp500.actual);

    if (isNaN(nikkeiPredicted) || isNaN(sp500Predicted)) {
      alert('予想変化率を入力してください');
      return;
    }

    if (editValues.nikkei.actual.trim() !== '' && isNaN(nikkeiActual as number)) {
      alert('実際変化率の形式が正しくありません');
      return;
    }

    if (editValues.sp500.actual.trim() !== '' && isNaN(sp500Actual as number)) {
      alert('実際変化率の形式が正しくありません');
      return;
    }

    onSave({
      nikkei: {
        predictedChange: nikkeiPredicted,
        actualChange: nikkeiActual,
      },
      sp500: {
        predictedChange: sp500Predicted,
        actualChange: sp500Actual,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          {prediction.date} の予想を編集
        </h3>

        <div className="space-y-4">
          {/* 日経平均 */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">日経平均</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">予想変化率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editValues.nikkei.predicted}
                  onChange={(e) => setEditValues(prev => ({
                    ...prev,
                    nikkei: { ...prev.nikkei, predicted: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">実際変化率 (%) - 空欄で未確定</label>
                <input
                  type="number"
                  step="0.01"
                  value={editValues.nikkei.actual}
                  onChange={(e) => setEditValues(prev => ({
                    ...prev,
                    nikkei: { ...prev.nikkei, actual: e.target.value }
                  }))}
                  placeholder="未確定"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* S&P500 */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">S&P500</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">予想変化率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editValues.sp500.predicted}
                  onChange={(e) => setEditValues(prev => ({
                    ...prev,
                    sp500: { ...prev.sp500, predicted: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">実際変化率 (%) - 空欄で未確定</label>
                <input
                  type="number"
                  step="0.01"
                  value={editValues.sp500.actual}
                  onChange={(e) => setEditValues(prev => ({
                    ...prev,
                    sp500: { ...prev.sp500, actual: e.target.value }
                  }))}
                  placeholder="未確定"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryTable({ predictions, onDelete, onEdit }: HistoryTableProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<StockSymbol>('nikkei');
  const [editingPrediction, setEditingPrediction] = useState<PredictionRecord | null>(null);

  // 日付の新しい順にソート
  const sortedPredictions = [...predictions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const handleEditSave = (updates: {
    nikkei?: { predictedChange?: number; actualChange?: number | null };
    sp500?: { predictedChange?: number; actualChange?: number | null };
  }) => {
    if (editingPrediction && onEdit) {
      onEdit(editingPrediction.id, updates);
      setEditingPrediction(null);
    }
  };

  if (predictions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">予想履歴</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          まだ予想データがありません
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">予想履歴</h3>

          {/* 銘柄切り替えタブ */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSymbol('nikkei')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedSymbol === 'nikkei'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              日経平均
            </button>
            <button
              onClick={() => setSelectedSymbol('sp500')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedSymbol === 'sp500'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
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
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                  日付
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                  予想
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                  実際
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                  乖離
                </th>
                {(onDelete || onEdit) && (
                  <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
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
                    className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <td className="py-3 px-2 text-sm dark:text-gray-300">{prediction.date}</td>
                    <td className="py-3 px-2 text-sm text-right font-mono dark:text-gray-300">
                      {formatChange(data.predictedChange)}
                    </td>
                    <td className="py-3 px-2 text-sm text-right font-mono">
                      {isConfirmed ? (
                        <span
                          className={
                            data.actualChange! >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
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
                              ? 'text-green-600 dark:text-green-400'
                              : data.deviation! <= 1.0
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatNumber(data.deviation!)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {(onDelete || onEdit) && (
                      <td className="py-3 px-2 text-center">
                        <div className="flex justify-center gap-2">
                          {onEdit && (
                            <button
                              onClick={() => setEditingPrediction(prediction)}
                              className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                            >
                              編集
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => {
                                if (confirm('この予想を削除しますか？')) {
                                  onDelete(prediction.id);
                                }
                              }}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 件数表示 */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
          全 {predictions.length} 件
        </div>
      </div>

      {/* 編集モーダル */}
      {editingPrediction && (
        <EditModal
          prediction={editingPrediction}
          onSave={handleEditSave}
          onClose={() => setEditingPrediction(null)}
        />
      )}
    </>
  );
}

/**
 * 履歴テーブルコンポーネント
 *
 * 過去の予想一覧を日別で表示します。
 */

'use client';

import type { PredictionRecord, StockSymbol } from '@/types';
import { STOCK_INFO, PREDICTABLE_SYMBOLS } from '@/types';
import { formatChange, formatNumber, getDeviationColorClass } from '@/lib/stats';
import { useState } from 'react';

interface HistoryTableProps {
  predictions: PredictionRecord[];
  onDelete?: (id: string) => void;
  onEdit?: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
      gold?: { predictedChange?: number; actualChange?: number | null };
      bitcoin?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => void;
}

interface EditModalProps {
  prediction: PredictionRecord;
  onSave: (
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
      gold?: { predictedChange?: number; actualChange?: number | null };
      bitcoin?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => void;
  onClose: () => void;
}

function EditModal({ prediction, onSave, onClose }: EditModalProps) {
  const predictedAssets = PREDICTABLE_SYMBOLS.filter(s => prediction[s] != null);

  const buildInitialValues = () => {
    const vals: Record<string, { predicted: string; actual: string }> = {};
    for (const s of predictedAssets) {
      const p = prediction[s]!;
      vals[s] = {
        predicted: p.predictedChange.toString(),
        actual: p.actualChange?.toString() ?? '',
      };
    }
    return vals;
  };

  const [editValues, setEditValues] = useState(buildInitialValues);

  const handleSave = () => {
    const updates: Record<string, { predictedChange?: number; actualChange?: number | null }> = {};

    for (const symbol of predictedAssets) {
      const predicted = parseFloat(editValues[symbol].predicted);
      const actualStr = editValues[symbol].actual.trim();
      const actual = actualStr === '' ? null : parseFloat(actualStr);

      if (isNaN(predicted)) {
        alert(`${STOCK_INFO[symbol].name}の予想変化率を入力してください`);
        return;
      }
      if (actualStr !== '' && isNaN(actual as number)) {
        alert(`${STOCK_INFO[symbol].name}の実際変化率の形式が正しくありません`);
        return;
      }

      updates[symbol] = { predictedChange: predicted, actualChange: actual };
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          {prediction.date} の予想を編集
        </h3>

        <div className="space-y-4">
          {predictedAssets.map(symbol => (
            <div key={symbol} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">{STOCK_INFO[symbol].name}</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">予想変化率 (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues[symbol]?.predicted ?? ''}
                    onChange={(e) => setEditValues(prev => ({
                      ...prev,
                      [symbol]: { ...prev[symbol], predicted: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">実際変化率 (%) - 空欄で未確定</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues[symbol]?.actual ?? ''}
                    onChange={(e) => setEditValues(prev => ({
                      ...prev,
                      [symbol]: { ...prev[symbol], actual: e.target.value }
                    }))}
                    placeholder="未確定"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
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

  const sortedPredictions = [...predictions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const handleEditSave = (updates: {
    nikkei?: { predictedChange?: number; actualChange?: number | null };
    sp500?: { predictedChange?: number; actualChange?: number | null };
    gold?: { predictedChange?: number; actualChange?: number | null };
    bitcoin?: { predictedChange?: number; actualChange?: number | null };
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

  // 選択された銘柄で予想がある行のみフィルター
  const filteredPredictions = sortedPredictions.filter(p => p[selectedSymbol] != null);

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">予想履歴</h3>

          <div className="flex flex-wrap gap-2">
            {PREDICTABLE_SYMBOLS.map(symbol => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 text-white active-tab-btn'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {STOCK_INFO[symbol].name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">日付</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">予想</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">実際</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">乖離</th>
                {(onDelete || onEdit) && (
                  <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map((prediction) => {
                const data = prediction[selectedSymbol]!;
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
                        <span className={data.actualChange! >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {formatChange(data.actualChange!)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-right font-mono">
                      {isConfirmed ? (
                        <span className={`font-semibold ${getDeviationColorClass(data.deviation!, selectedSymbol)}`}>
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

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
          全 {filteredPredictions.length} 件
        </div>
      </div>

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

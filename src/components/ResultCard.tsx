/**
 * 結果表示カードコンポーネント
 *
 * 予想と実際の値の比較、乖離を表示します。
 * 編集機能も提供します。
 */

'use client';

import { useState } from 'react';
import type { PredictionRecord, StockQuote } from '@/types';
import { formatChange, formatNumber } from '@/lib/stats';

interface ResultCardProps {
  prediction: PredictionRecord;
  stockData?: { nikkei: StockQuote | null; sp500: StockQuote | null } | null;
  onUpdateResult?: (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
    }
  ) => void;
  onEdit?: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => void;
}

interface SingleResultProps {
  title: string;
  predicted: number;
  actual: number | null;
  deviation: number | null;
  previousClose: number;
  currency: string;
  currentChange?: number;
  onConfirm?: () => void;
  isEditing?: boolean;
  editValues?: { predictedPrice: string; actualPrice: string };
  onEditChange?: (field: 'predictedPrice' | 'actualPrice', value: string) => void;
}

function SingleResult({
  title,
  predicted,
  actual,
  deviation,
  previousClose,
  currency,
  currentChange,
  onConfirm,
  isEditing,
  editValues,
  onEditChange,
}: SingleResultProps) {
  const isConfirmed = actual !== null;

  // 変化率から価格を計算
  const predictedPrice = previousClose * (1 + predicted / 100);
  const actualPrice = actual !== null ? previousClose * (1 + actual / 100) : null;

  if (isEditing && editValues && onEditChange) {
    return (
      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">{title}</h4>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          前日終値: {currency}{formatNumber(previousClose, 2)}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">予想終値 ({currency})</label>
            <input
              type="number"
              step={currency === '¥' ? '1' : '0.01'}
              value={editValues.predictedPrice}
              onChange={(e) => onEditChange('predictedPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono bg-white dark:bg-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">実際終値 ({currency}) - 空欄で未確定</label>
            <input
              type="number"
              step={currency === '¥' ? '1' : '0.01'}
              value={editValues.actualPrice}
              onChange={(e) => onEditChange('actualPrice', e.target.value)}
              placeholder="未確定"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono bg-white dark:bg-slate-600 dark:text-white"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
      <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">{title}</h4>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">予想変化率:</span>
          <span className="font-mono font-semibold dark:text-white">{formatChange(predicted)}</span>
        </div>

        {isConfirmed ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">実際変化率:</span>
              <span
                className={`font-mono font-semibold ${
                  actual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatChange(actual)}
              </span>
            </div>
            <hr className="my-2 dark:border-slate-600" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">乖離:</span>
              <span
                className={`font-mono font-bold text-lg ${
                  deviation! <= 0.5
                    ? 'text-green-600 dark:text-green-400'
                    : deviation! <= 1.0
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatNumber(deviation!)} ポイント
              </span>
            </div>
          </>
        ) : (
          <>
            {currentChange !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">現在変化率:</span>
                <span
                  className={`font-mono ${
                    currentChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatChange(currentChange)}
                </span>
              </div>
            )}
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="mt-2 w-full py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
              >
                結果を確定
              </button>
            )}
            {!onConfirm && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                結果待ち
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 変化率から価格を計算
const percentToPrice = (percent: number, previousClose: number): number => {
  return previousClose * (1 + percent / 100);
};

// 価格から変化率を計算
const priceToPercent = (price: number, previousClose: number): number => {
  return ((price - previousClose) / previousClose) * 100;
};

export function ResultCard({ prediction, stockData, onUpdateResult, onEdit }: ResultCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    nikkei: {
      predictedPrice: percentToPrice(prediction.nikkei.predictedChange, prediction.nikkei.previousClose).toFixed(2),
      actualPrice: prediction.nikkei.actualChange !== null
        ? percentToPrice(prediction.nikkei.actualChange, prediction.nikkei.previousClose).toFixed(2)
        : '',
    },
    sp500: {
      predictedPrice: percentToPrice(prediction.sp500.predictedChange, prediction.sp500.previousClose).toFixed(2),
      actualPrice: prediction.sp500.actualChange !== null
        ? percentToPrice(prediction.sp500.actualChange, prediction.sp500.previousClose).toFixed(2)
        : '',
    },
  });

  const handleConfirmNikkei = () => {
    if (!stockData?.nikkei || !onUpdateResult) return;
    onUpdateResult(prediction.id, {
      nikkei: { actualChange: stockData.nikkei.changePercent },
    });
  };

  const handleConfirmSp500 = () => {
    if (!stockData?.sp500 || !onUpdateResult) return;
    onUpdateResult(prediction.id, {
      sp500: { actualChange: stockData.sp500.changePercent },
    });
  };

  const handleStartEdit = () => {
    setEditValues({
      nikkei: {
        predictedPrice: percentToPrice(prediction.nikkei.predictedChange, prediction.nikkei.previousClose).toFixed(2),
        actualPrice: prediction.nikkei.actualChange !== null
          ? percentToPrice(prediction.nikkei.actualChange, prediction.nikkei.previousClose).toFixed(2)
          : '',
      },
      sp500: {
        predictedPrice: percentToPrice(prediction.sp500.predictedChange, prediction.sp500.previousClose).toFixed(2),
        actualPrice: prediction.sp500.actualChange !== null
          ? percentToPrice(prediction.sp500.actualChange, prediction.sp500.previousClose).toFixed(2)
          : '',
      },
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!onEdit) return;

    const nikkeiPredictedPrice = parseFloat(editValues.nikkei.predictedPrice);
    const nikkeiActualPrice = editValues.nikkei.actualPrice.trim() === '' ? null : parseFloat(editValues.nikkei.actualPrice);
    const sp500PredictedPrice = parseFloat(editValues.sp500.predictedPrice);
    const sp500ActualPrice = editValues.sp500.actualPrice.trim() === '' ? null : parseFloat(editValues.sp500.actualPrice);

    if (isNaN(nikkeiPredictedPrice) || isNaN(sp500PredictedPrice)) {
      alert('予想終値を入力してください');
      return;
    }

    if (editValues.nikkei.actualPrice.trim() !== '' && isNaN(nikkeiActualPrice as number)) {
      alert('実際終値の形式が正しくありません');
      return;
    }

    if (editValues.sp500.actualPrice.trim() !== '' && isNaN(sp500ActualPrice as number)) {
      alert('実際終値の形式が正しくありません');
      return;
    }

    // 価格から変化率に変換
    const nikkeiPredictedChange = priceToPercent(nikkeiPredictedPrice, prediction.nikkei.previousClose);
    const nikkeiActualChange = nikkeiActualPrice !== null
      ? priceToPercent(nikkeiActualPrice, prediction.nikkei.previousClose)
      : null;
    const sp500PredictedChange = priceToPercent(sp500PredictedPrice, prediction.sp500.previousClose);
    const sp500ActualChange = sp500ActualPrice !== null
      ? priceToPercent(sp500ActualPrice, prediction.sp500.previousClose)
      : null;

    onEdit(prediction.id, {
      nikkei: {
        predictedChange: nikkeiPredictedChange,
        actualChange: nikkeiActualChange,
      },
      sp500: {
        predictedChange: sp500PredictedChange,
        actualChange: sp500ActualChange,
      },
    });

    setIsEditing(false);
  };

  const handleEditChange = (
    stock: 'nikkei' | 'sp500',
    field: 'predictedPrice' | 'actualPrice',
    value: string
  ) => {
    setEditValues(prev => ({
      ...prev,
      [stock]: {
        ...prev[stock],
        [field]: value,
      },
    }));
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
          {prediction.date} の予想
        </h3>
        <div className="flex items-center gap-2">
          {prediction.confirmedAt && !isEditing && (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-sm rounded">
              確定済み
            </span>
          )}
          {!isEditing && onEdit && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
            >
              編集
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <SingleResult
              title="日経平均"
              predicted={prediction.nikkei.predictedChange}
              actual={prediction.nikkei.actualChange}
              deviation={prediction.nikkei.deviation}
              previousClose={prediction.nikkei.previousClose}
              currency="¥"
              isEditing={true}
              editValues={editValues.nikkei}
              onEditChange={(field, value) => handleEditChange('nikkei', field, value)}
            />
            <SingleResult
              title="S&P500"
              predicted={prediction.sp500.predictedChange}
              actual={prediction.sp500.actualChange}
              deviation={prediction.sp500.deviation}
              previousClose={prediction.sp500.previousClose}
              currency="$"
              isEditing={true}
              editValues={editValues.sp500}
              onEditChange={(field, value) => handleEditChange('sp500', field, value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <SingleResult
            title="日経平均"
            predicted={prediction.nikkei.predictedChange}
            actual={prediction.nikkei.actualChange}
            deviation={prediction.nikkei.deviation}
            previousClose={prediction.nikkei.previousClose}
            currency="¥"
            currentChange={stockData?.nikkei?.changePercent}
            onConfirm={
              prediction.nikkei.actualChange === null && stockData?.nikkei
                ? handleConfirmNikkei
                : undefined
            }
          />
          <SingleResult
            title="S&P500"
            predicted={prediction.sp500.predictedChange}
            actual={prediction.sp500.actualChange}
            deviation={prediction.sp500.deviation}
            previousClose={prediction.sp500.previousClose}
            currency="$"
            currentChange={stockData?.sp500?.changePercent}
            onConfirm={
              prediction.sp500.actualChange === null && stockData?.sp500
                ? handleConfirmSp500
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

/**
 * 結果表示カードコンポーネント
 *
 * 予想と実際の値の比較、乖離を表示します。
 * 編集機能も提供します。
 */

'use client';

import { useState } from 'react';
import type { PredictionRecord, StockQuote, StockSymbol } from '@/types';
import { STOCK_INFO, PREDICTABLE_SYMBOLS } from '@/types';
import { formatChange, formatNumber, getDeviationColorClass } from '@/lib/stats';

interface ResultCardProps {
  prediction: PredictionRecord;
  stockData?: {
    nikkei: StockQuote | null;
    sp500: StockQuote | null;
    gold: StockQuote | null;
    bitcoin: StockQuote | null;
  } | null;
  onUpdateResult?: (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
      gold?: { actualChange: number };
      bitcoin?: { actualChange: number };
    }
  ) => void;
  onEdit?: (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
      gold?: { predictedChange?: number; actualChange?: number | null };
      bitcoin?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => void;
  onSaveComment?: (id: string, comment: string) => void;
}

interface SingleResultProps {
  title: string;
  symbol: StockSymbol;
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
  title, symbol, predicted, actual, deviation, previousClose, currency,
  currentChange, onConfirm, isEditing, editValues, onEditChange,
}: SingleResultProps) {
  const isConfirmed = actual !== null;

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
              <span className={`font-mono font-semibold ${actual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatChange(actual)}
              </span>
            </div>
            <hr className="my-2 dark:border-slate-600" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">乖離:</span>
              <span className={`font-mono font-bold text-lg ${getDeviationColorClass(deviation!, symbol)}`}>
                {formatNumber(deviation!)} ポイント
              </span>
            </div>
          </>
        ) : (
          <>
            {currentChange !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">現在変化率:</span>
                <span className={`font-mono ${currentChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatChange(currentChange)}
                </span>
              </div>
            )}
            {onConfirm && (
              <button onClick={onConfirm} className="mt-2 w-full py-2 rounded-md transition-colors text-sm font-semibold confirm-result-btn bg-green-100 text-green-700 hover:bg-green-200">
                結果を確定
              </button>
            )}
            {!onConfirm && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">結果待ち</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const percentToPrice = (percent: number, previousClose: number): number => {
  return previousClose * (1 + percent / 100);
};

const priceToPercent = (price: number, previousClose: number): number => {
  return ((price - previousClose) / previousClose) * 100;
};

const getCurrency = (symbol: StockSymbol): string => {
  return symbol === 'nikkei' ? '¥' : '$';
};

export function ResultCard({ prediction, stockData, onUpdateResult, onEdit, onSaveComment }: ResultCardProps) {
  const predictedAssets = PREDICTABLE_SYMBOLS.filter(s => prediction[s] != null);

  type EditState = Record<StockSymbol, { predictedPrice: string; actualPrice: string }>;
  const buildEditValues = (): EditState => {
    const vals = {} as EditState;
    for (const s of PREDICTABLE_SYMBOLS) {
      const p = prediction[s];
      if (p) {
        vals[s] = {
          predictedPrice: percentToPrice(p.predictedChange, p.previousClose).toFixed(2),
          actualPrice: p.actualChange !== null ? percentToPrice(p.actualChange, p.previousClose).toFixed(2) : '',
        };
      } else {
        vals[s] = { predictedPrice: '', actualPrice: '' };
      }
    }
    return vals;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<EditState>(buildEditValues);
  const [commentText, setCommentText] = useState(prediction.reviewComment || '');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  const handleConfirm = (symbol: StockSymbol) => {
    const quote = stockData?.[symbol];
    if (!quote || !onUpdateResult) return;
    onUpdateResult(prediction.id, { [symbol]: { actualChange: quote.changePercent } });
  };

  const handleStartEdit = () => {
    setEditValues(buildEditValues());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!onEdit) return;

    const updates: Record<string, { predictedChange?: number; actualChange?: number | null }> = {};

    for (const symbol of predictedAssets) {
      const p = prediction[symbol]!;
      const ev = editValues[symbol];
      const predPrice = parseFloat(ev.predictedPrice);
      if (isNaN(predPrice)) {
        alert(`${STOCK_INFO[symbol].name}の予想終値を入力してください`);
        return;
      }
      const actPrice = ev.actualPrice.trim() === '' ? null : parseFloat(ev.actualPrice);
      if (ev.actualPrice.trim() !== '' && isNaN(actPrice as number)) {
        alert(`${STOCK_INFO[symbol].name}の実際終値の形式が正しくありません`);
        return;
      }

      updates[symbol] = {
        predictedChange: priceToPercent(predPrice, p.previousClose),
        actualChange: actPrice !== null ? priceToPercent(actPrice, p.previousClose) : null,
      };
    }

    onEdit(prediction.id, updates);
    setIsEditing(false);
  };

  const handleEditChange = (symbol: StockSymbol, field: 'predictedPrice' | 'actualPrice', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], [field]: value },
    }));
  };

  const gridCols = predictedAssets.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
          {prediction.date} の予想
        </h3>
        <div className="flex items-center gap-2">
          {prediction.confirmedAt && !isEditing && (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-sm rounded">確定済み</span>
          )}
          {!isEditing && onEdit && (
            <button onClick={handleStartEdit} className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              編集
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <>
          <div className={`grid ${gridCols} gap-4`}>
            {predictedAssets.map(symbol => {
              const p = prediction[symbol]!;
              return (
                <SingleResult
                  key={symbol}
                  title={STOCK_INFO[symbol].name}
                  symbol={symbol}
                  predicted={p.predictedChange}
                  actual={p.actualChange}
                  deviation={p.deviation}
                  previousClose={p.previousClose}
                  currency={getCurrency(symbol)}
                  isEditing={true}
                  editValues={editValues[symbol]}
                  onEditChange={(field, value) => handleEditChange(symbol, field, value)}
                />
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              キャンセル
            </button>
            <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              保存
            </button>
          </div>
        </>
      ) : (
        <div className={`grid ${gridCols} gap-4`}>
          {predictedAssets.map(symbol => {
            const p = prediction[symbol]!;
            return (
              <SingleResult
                key={symbol}
                title={STOCK_INFO[symbol].name}
                symbol={symbol}
                predicted={p.predictedChange}
                actual={p.actualChange}
                deviation={p.deviation}
                previousClose={p.previousClose}
                currency={getCurrency(symbol)}
                currentChange={stockData?.[symbol]?.changePercent}
                onConfirm={
                  p.actualChange === null && stockData?.[symbol]
                    ? () => handleConfirm(symbol)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* 振り返りコメント（確定済みの場合のみ表示） */}
      {prediction.confirmedAt && onSaveComment && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          {isEditingComment ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                振り返りメモ
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="なぜ外れたか、次回の改善点など..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-700 dark:text-white resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setCommentText(prediction.reviewComment || '');
                    setIsEditingComment(false);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                >
                  キャンセル
                </button>
                <button
                  disabled={savingComment}
                  onClick={async () => {
                    setSavingComment(true);
                    await onSaveComment(prediction.id, commentText);
                    setSavingComment(false);
                    setIsEditingComment(false);
                  }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingComment ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : prediction.reviewComment ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">振り返りメモ</span>
                <button
                  onClick={() => setIsEditingComment(true)}
                  className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  編集
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 rounded-md p-3 whitespace-pre-wrap">
                {prediction.reviewComment}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingComment(true)}
              className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md transition-colors border border-dashed border-gray-300 dark:border-slate-600"
            >
              振り返りメモを追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}

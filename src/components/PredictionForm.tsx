/**
 * 予想入力フォームコンポーネント
 *
 * 銘柄を選択して予想変化率を入力するフォームです。
 * 値（価格）または変化率（%）で入力できます。
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StockQuote, PredictionInput, StockSymbol } from '@/types';
import { STOCK_INFO, PREDICTABLE_SYMBOLS } from '@/types';
import { formatNumber } from '@/lib/stats';

interface SubmittedAsset {
  name: string;
  previousClose: number;
  predictedPrice: number;
  predictedChange: number;
  currency: string;
}

type InputMode = 'price' | 'percent';

interface PredictionFormProps {
  stockData: {
    nikkei: StockQuote | null;
    sp500: StockQuote | null;
    gold: StockQuote | null;
    bitcoin: StockQuote | null;
  } | null;
  onSubmit: (input: PredictionInput) => Promise<void>;
  disabled?: boolean;
}

export function PredictionForm({ stockData, onSubmit, disabled }: PredictionFormProps) {
  const [inputMode, setInputMode] = useState<InputMode>('price');
  const [selectedAssets, setSelectedAssets] = useState<Set<StockSymbol>>(new Set(['nikkei', 'sp500']));
  const [values, setValues] = useState<Record<StockSymbol, string>>({
    nikkei: '', sp500: '', gold: '', bitcoin: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [submittedAssets, setSubmittedAssets] = useState<SubmittedAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues({ nikkei: '', sp500: '', gold: '', bitcoin: '' });
  }, [stockData]);

  const toggleAsset = (symbol: StockSymbol) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        if (next.size > 1) next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const priceToPercent = (price: number, previousClose: number): number => {
    return ((price - previousClose) / previousClose) * 100;
  };

  const percentToPrice = (percent: number, previousClose: number): number => {
    return previousClose * (1 + percent / 100);
  };

  const getCurrencySymbol = (symbol: StockSymbol): string => {
    return symbol === 'nikkei' ? '¥' : '$';
  };

  const getPriceStep = (symbol: StockSymbol): string => {
    if (symbol === 'nikkei') return '1';
    if (symbol === 'bitcoin') return '1';
    return '0.01';
  };

  const getPlaceholder = (symbol: StockSymbol): string => {
    const quote = stockData?.[symbol];
    if (inputMode === 'price') {
      if (quote?.previousClose) {
        const example = symbol === 'nikkei' || symbol === 'bitcoin'
          ? Math.round(quote.previousClose * 1.005).toString()
          : (quote.previousClose * 1.005).toFixed(2);
        return `例: ${example}`;
      }
      return '予想終値';
    }
    return '例: +0.5 または -0.3';
  };

  const getCalculatedDisplay = (value: string, symbol: StockSymbol): string => {
    const previousClose = stockData?.[symbol]?.previousClose;
    if (!previousClose || !value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';

    const currency = getCurrencySymbol(symbol);
    if (inputMode === 'price') {
      const percent = priceToPercent(num, previousClose);
      const sign = percent >= 0 ? '+' : '';
      return `変化率: ${sign}${formatNumber(percent)}%`;
    } else {
      const price = percentToPrice(num, previousClose);
      const decimals = symbol === 'nikkei' || symbol === 'bitcoin' ? 0 : 2;
      return `予想終値: ${currency}${formatNumber(price, decimals)}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: PredictionInput = {};
    const submitted: SubmittedAsset[] = [];

    for (const symbol of PREDICTABLE_SYMBOLS) {
      if (!selectedAssets.has(symbol)) continue;

      const quote = stockData?.[symbol];
      if (!quote?.previousClose) {
        alert(`${STOCK_INFO[symbol].name}の株価データを取得できませんでした`);
        return;
      }

      const num = parseFloat(values[symbol]);
      if (isNaN(num)) {
        alert(`${STOCK_INFO[symbol].name}の予想を正しく入力してください`);
        return;
      }

      let change: number;
      let predictedPrice: number;

      if (inputMode === 'price') {
        change = priceToPercent(num, quote.previousClose);
        predictedPrice = num;
      } else {
        change = num;
        predictedPrice = percentToPrice(num, quote.previousClose);
      }

      input[symbol] = {
        previousClose: quote.previousClose,
        predictedChange: change,
      };

      submitted.push({
        name: STOCK_INFO[symbol].name,
        previousClose: quote.previousClose,
        predictedPrice,
        predictedChange: change,
        currency: getCurrencySymbol(symbol),
      });
    }

    if (Object.keys(input).length === 0) {
      alert('少なくとも1つの銘柄を選択して予想を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('タイムアウト')), 30000)
      );

      await Promise.race([onSubmit(input), timeoutPromise]);

      setSubmittedAssets(submitted);
      setShowModal(true);
      setValues({ nikkei: '', sp500: '', gold: '', bitcoin: '' });
    } catch (error) {
      console.error('Error submitting prediction:', error);
      if (error instanceof Error && error.message === 'タイムアウト') {
        alert('登録処理がタイムアウトしました（30秒）。');
      } else {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        alert(`予想の登録に失敗しました。\n\nエラー: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSelectedData = PREDICTABLE_SYMBOLS.some(
    s => selectedAssets.has(s) && stockData?.[s]
  );

  return (
    <>
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">本日の予想入力</h2>
        <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setInputMode('price');
              setValues({ nikkei: '', sp500: '', gold: '', bitcoin: '' });
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              inputMode === 'price'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            値で入力
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('percent');
              setValues({ nikkei: '', sp500: '', gold: '', bitcoin: '' });
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              inputMode === 'percent'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            %で入力
          </button>
        </div>
      </div>

      {/* 銘柄選択 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PREDICTABLE_SYMBOLS.map(symbol => (
          <button
            key={symbol}
            type="button"
            onClick={() => toggleAsset(symbol)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
              selectedAssets.has(symbol)
                ? 'bg-blue-600 text-white border-blue-600 asset-selected-btn'
                : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-500 hover:border-blue-400'
            }`}
          >
            {STOCK_INFO[symbol].name}
          </button>
        ))}
      </div>

      {/* 選択された銘柄の入力欄 */}
      {PREDICTABLE_SYMBOLS.filter(s => selectedAssets.has(s)).map(symbol => {
        const info = STOCK_INFO[symbol];
        const quote = stockData?.[symbol];
        const currency = getCurrencySymbol(symbol);

        return (
          <div key={symbol} className="mb-4">
            <h3 className="text-base font-semibold mb-2 text-gray-700 dark:text-gray-200">
              {info.name} ({info.symbol})
            </h3>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600 dark:text-gray-300 text-sm">前日終値:</span>
                <span className="font-mono text-lg dark:text-white">
                  {quote?.previousClose != null
                    ? `${currency}${formatNumber(quote.previousClose, symbol === 'nikkei' || symbol === 'bitcoin' ? 0 : 2)}`
                    : '読み込み中...'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-gray-600 dark:text-gray-300 whitespace-nowrap text-sm">
                  {inputMode === 'price' ? '予想終値:' : '予想変化率:'}
                </label>
                <div className="flex-1 flex items-center gap-2">
                  {inputMode === 'price' && <span className="text-gray-600 dark:text-gray-300">{currency}</span>}
                  <input
                    type="number"
                    step={inputMode === 'price' ? getPriceStep(symbol) : '0.01'}
                    value={values[symbol]}
                    onChange={(e) => setValues(prev => ({ ...prev, [symbol]: e.target.value }))}
                    placeholder={getPlaceholder(symbol)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-slate-600 dark:text-white"
                    disabled={disabled}
                  />
                  {inputMode === 'percent' && <span className="text-gray-600 dark:text-gray-300">%</span>}
                </div>
              </div>
              {values[symbol] && quote?.previousClose && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {getCalculatedDisplay(values[symbol], symbol)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="submit"
        disabled={disabled || isSubmitting || !hasSelectedData}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors submit-prediction-btn"
      >
        {disabled ? '本日は入力済みです' : isSubmitting ? '登録中...' : '予想を登録'}
      </button>
    </form>

    {/* 登録完了モーダル */}
    {showModal && submittedAssets.length > 0 && (
      <div className="fixed inset-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">予想を登録しました</h3>
          </div>

          <div className="space-y-3 mb-6">
            {submittedAssets.map((asset, i) => (
              <div key={i} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{asset.name}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">予想終値:</span>
                  <span className="font-mono dark:text-white">
                    {asset.currency}{formatNumber(asset.predictedPrice, asset.currency === '¥' ? 0 : 2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">予想変化率:</span>
                  <span className={`font-mono ${asset.predictedChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {asset.predictedChange >= 0 ? '+' : ''}{formatNumber(asset.predictedChange, 2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
            <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2">結果確定のタイミング</div>
            <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <div className="flex justify-between">
                <span>日経平均:</span>
                <span>本日 15:00（JST）</span>
              </div>
              <div className="flex justify-between">
                <span>S&P500:</span>
                <span>翌朝 6:00（JST）</span>
              </div>
              <div className="flex justify-between">
                <span>ゴールド:</span>
                <span>翌朝 7:00（JST）</span>
              </div>
              <div className="flex justify-between">
                <span>ビットコイン:</span>
                <span>翌朝 6:00（JST）</span>
              </div>
            </div>
          </div>

          <div className="border-t dark:border-slate-600 pt-4 mb-4">
            <Link href="/ranking" className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
              <span>参加者のランキングはこちら</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <button
            onClick={() => setShowModal(false)}
            className="w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    )}
    </>
  );
}

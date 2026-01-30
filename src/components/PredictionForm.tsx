/**
 * 予想入力フォームコンポーネント
 *
 * 日経平均とS&P500の予想変化率を入力するフォームです。
 * 値（価格）または変化率（%）で入力できます。
 */

'use client';

import { useState, useEffect } from 'react';
import type { StockQuote, PredictionInput } from '@/types';
import { formatNumber } from '@/lib/stats';

type InputMode = 'price' | 'percent';

interface PredictionFormProps {
  stockData: { nikkei: StockQuote | null; sp500: StockQuote | null } | null;
  onSubmit: (input: PredictionInput) => void;
  disabled?: boolean;
}

export function PredictionForm({ stockData, onSubmit, disabled }: PredictionFormProps) {
  const [inputMode, setInputMode] = useState<InputMode>('price');
  const [nikkeiValue, setNikkeiValue] = useState('');
  const [sp500Value, setSp500Value] = useState('');

  // 株価データが更新されたら初期値をリセット
  useEffect(() => {
    setNikkeiValue('');
    setSp500Value('');
  }, [stockData]);

  // 値から変化率を計算
  const priceToPercent = (price: number, previousClose: number): number => {
    return ((price - previousClose) / previousClose) * 100;
  };

  // 変化率から値を計算
  const percentToPrice = (percent: number, previousClose: number): number => {
    return previousClose * (1 + percent / 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockData?.nikkei?.previousClose || !stockData?.sp500?.previousClose) {
      alert('株価データを取得できませんでした');
      return;
    }

    const nikkeiNum = parseFloat(nikkeiValue);
    const sp500Num = parseFloat(sp500Value);

    if (isNaN(nikkeiNum) || isNaN(sp500Num)) {
      alert('予想を正しく入力してください');
      return;
    }

    // 入力モードに応じて変化率を計算
    let nikkeiChange: number;
    let sp500Change: number;

    if (inputMode === 'price') {
      nikkeiChange = priceToPercent(nikkeiNum, stockData.nikkei.previousClose);
      sp500Change = priceToPercent(sp500Num, stockData.sp500.previousClose);
    } else {
      nikkeiChange = nikkeiNum;
      sp500Change = sp500Num;
    }

    onSubmit({
      nikkei: {
        previousClose: stockData.nikkei.previousClose,
        predictedChange: nikkeiChange,
      },
      sp500: {
        previousClose: stockData.sp500.previousClose,
        predictedChange: sp500Change,
      },
    });

    setNikkeiValue('');
    setSp500Value('');
  };

  // 計算結果を表示（入力モードの逆を表示）
  const getCalculatedDisplay = (
    value: string,
    previousClose: number | undefined,
    symbol: 'nikkei' | 'sp500'
  ): string => {
    if (!previousClose || !value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';

    const currency = symbol === 'nikkei' ? '¥' : '$';

    if (inputMode === 'price') {
      const percent = priceToPercent(num, previousClose);
      const sign = percent >= 0 ? '+' : '';
      return `変化率: ${sign}${formatNumber(percent)}%`;
    } else {
      const price = percentToPrice(num, previousClose);
      return `予想終値: ${currency}${formatNumber(price)}`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">本日の予想入力</h2>

        {/* 入力モード切り替え */}
        <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setInputMode('price');
              setNikkeiValue('');
              setSp500Value('');
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              inputMode === 'price'
                ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            値で入力
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('percent');
              setNikkeiValue('');
              setSp500Value('');
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              inputMode === 'percent'
                ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            %で入力
          </button>
        </div>
      </div>

      {/* 日経平均 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">日経平均 (^N225)</h3>
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 dark:text-gray-300">前日終値:</span>
            <span className="font-mono text-lg dark:text-white">
              {stockData?.nikkei?.previousClose != null
                ? `¥${formatNumber(stockData.nikkei.previousClose, 2)}`
                : '読み込み中...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {inputMode === 'price' ? '予想終値:' : '予想変化率:'}
            </label>
            <div className="flex-1 flex items-center gap-2">
              {inputMode === 'price' && <span className="text-gray-600 dark:text-gray-300">¥</span>}
              <input
                type="number"
                step={inputMode === 'price' ? '1' : '0.01'}
                value={nikkeiValue}
                onChange={(e) => setNikkeiValue(e.target.value)}
                placeholder={
                  inputMode === 'price'
                    ? stockData?.nikkei?.previousClose
                      ? `例: ${Math.round(stockData.nikkei.previousClose * 1.005)}`
                      : '例: 39000'
                    : '例: +0.5 または -0.3'
                }
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-slate-600 dark:text-white"
                disabled={disabled}
              />
              {inputMode === 'percent' && <span className="text-gray-600 dark:text-gray-300">%</span>}
            </div>
          </div>
          {nikkeiValue && stockData?.nikkei?.previousClose && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {getCalculatedDisplay(nikkeiValue, stockData.nikkei.previousClose, 'nikkei')}
            </div>
          )}
        </div>
      </div>

      {/* S&P500 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">S&P500 (^GSPC)</h3>
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 dark:text-gray-300">前日終値:</span>
            <span className="font-mono text-lg dark:text-white">
              {stockData?.sp500?.previousClose != null
                ? `$${formatNumber(stockData.sp500.previousClose, 2)}`
                : '読み込み中...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {inputMode === 'price' ? '予想終値:' : '予想変化率:'}
            </label>
            <div className="flex-1 flex items-center gap-2">
              {inputMode === 'price' && <span className="text-gray-600 dark:text-gray-300">$</span>}
              <input
                type="number"
                step={inputMode === 'price' ? '0.01' : '0.01'}
                value={sp500Value}
                onChange={(e) => setSp500Value(e.target.value)}
                placeholder={
                  inputMode === 'price'
                    ? stockData?.sp500?.previousClose
                      ? `例: ${(stockData.sp500.previousClose * 1.005).toFixed(2)}`
                      : '例: 6100'
                    : '例: +0.5 または -0.3'
                }
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-slate-600 dark:text-white"
                disabled={disabled}
              />
              {inputMode === 'percent' && <span className="text-gray-600 dark:text-gray-300">%</span>}
            </div>
          </div>
          {sp500Value && stockData?.sp500?.previousClose && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {getCalculatedDisplay(sp500Value, stockData.sp500.previousClose, 'sp500')}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !stockData?.nikkei || !stockData?.sp500}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? '本日は入力済みです' : '予想を登録'}
      </button>
    </form>
  );
}

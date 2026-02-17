/**
 * 予想入力フォームコンポーネント
 *
 * 日経平均とS&P500の予想変化率を入力するフォームです。
 * 値（価格）または変化率（%）で入力できます。
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StockQuote, PredictionInput } from '@/types';
import { formatNumber } from '@/lib/stats';

interface SubmittedPrediction {
  nikkei: {
    previousClose: number;
    predictedPrice: number;
    predictedChange: number;
  };
  sp500: {
    previousClose: number;
    predictedPrice: number;
    predictedChange: number;
  };
}

type InputMode = 'price' | 'percent';

interface PredictionFormProps {
  stockData: { nikkei: StockQuote | null; sp500: StockQuote | null } | null;
  onSubmit: (input: PredictionInput) => Promise<void>;
  disabled?: boolean;
}

export function PredictionForm({ stockData, onSubmit, disabled }: PredictionFormProps) {
  const [inputMode, setInputMode] = useState<InputMode>('price');
  const [nikkeiValue, setNikkeiValue] = useState('');
  const [sp500Value, setSp500Value] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submittedPrediction, setSubmittedPrediction] = useState<SubmittedPrediction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    let nikkeiPredictedPrice: number;
    let sp500PredictedPrice: number;

    if (inputMode === 'price') {
      nikkeiChange = priceToPercent(nikkeiNum, stockData.nikkei.previousClose);
      sp500Change = priceToPercent(sp500Num, stockData.sp500.previousClose);
      nikkeiPredictedPrice = nikkeiNum;
      sp500PredictedPrice = sp500Num;
    } else {
      nikkeiChange = nikkeiNum;
      sp500Change = sp500Num;
      nikkeiPredictedPrice = percentToPrice(nikkeiNum, stockData.nikkei.previousClose);
      sp500PredictedPrice = percentToPrice(sp500Num, stockData.sp500.previousClose);
    }

    setIsSubmitting(true);

    try {
      // タイムアウト付きで登録処理を実行（30秒）
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('タイムアウト')), 30000)
      );

      await Promise.race([
        onSubmit({
          nikkei: {
            previousClose: stockData.nikkei.previousClose,
            predictedChange: nikkeiChange,
          },
          sp500: {
            previousClose: stockData.sp500.previousClose,
            predictedChange: sp500Change,
          },
        }),
        timeoutPromise,
      ]);

      // モーダル表示用のデータを保存
      setSubmittedPrediction({
        nikkei: {
          previousClose: stockData.nikkei.previousClose,
          predictedPrice: nikkeiPredictedPrice,
          predictedChange: nikkeiChange,
        },
        sp500: {
          previousClose: stockData.sp500.previousClose,
          predictedPrice: sp500PredictedPrice,
          predictedChange: sp500Change,
        },
      });
      setShowModal(true);

      setNikkeiValue('');
      setSp500Value('');
    } catch (error) {
      console.error('Error submitting prediction:', error);
      if (error instanceof Error && error.message === 'タイムアウト') {
        alert('登録処理がタイムアウトしました（30秒）。\n\nブラウザの開発者ツール（F12）のコンソールでエラーを確認してください。\n\nSupabaseダッシュボードでプロジェクトが一時停止していないか確認してください。');
      } else {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        alert(`予想の登録に失敗しました。\n\nエラー: ${errorMessage}\n\nコンソールで詳細を確認してください。`);
      }
    } finally {
      setIsSubmitting(false);
    }
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
    <>
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
              setNikkeiValue('');
              setSp500Value('');
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
        disabled={disabled || isSubmitting || !stockData?.nikkei || !stockData?.sp500}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? '本日は入力済みです' : isSubmitting ? '登録中...' : '予想を登録'}
      </button>
    </form>

    {/* 登録完了モーダル */}
    {showModal && submittedPrediction && (
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

          {/* 登録内容 */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">日経平均</div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">予想終値:</span>
                <span className="font-mono dark:text-white">¥{formatNumber(submittedPrediction.nikkei.predictedPrice, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">予想変化率:</span>
                <span className={`font-mono ${submittedPrediction.nikkei.predictedChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {submittedPrediction.nikkei.predictedChange >= 0 ? '+' : ''}{formatNumber(submittedPrediction.nikkei.predictedChange, 2)}%
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">S&P500</div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">予想終値:</span>
                <span className="font-mono dark:text-white">${formatNumber(submittedPrediction.sp500.predictedPrice, 2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">予想変化率:</span>
                <span className={`font-mono ${submittedPrediction.sp500.predictedChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {submittedPrediction.sp500.predictedChange >= 0 ? '+' : ''}{formatNumber(submittedPrediction.sp500.predictedChange, 2)}%
                </span>
              </div>
            </div>
          </div>

          {/* 市場終了時間 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
            <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2">結果確定のタイミング</div>
            <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <div className="flex justify-between">
                <span>日経平均:</span>
                <span>本日 15:00（日本時間）</span>
              </div>
              <div className="flex justify-between">
                <span>S&P500:</span>
                <span>翌朝 6:00（日本時間）</span>
              </div>
            </div>
          </div>

          {/* ランキングリンク */}
          <div className="border-t dark:border-slate-600 pt-4 mb-4">
            <Link
              href="/ranking"
              className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              <span>参加者のランキングはこちら</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* 閉じるボタン */}
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

/**
 * 結果表示カードコンポーネント
 *
 * 予想と実際の値の比較、乖離を表示します。
 */

'use client';

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
}

interface SingleResultProps {
  title: string;
  predicted: number;
  actual: number | null;
  deviation: number | null;
  currentChange?: number;
  onConfirm?: () => void;
}

function SingleResult({
  title,
  predicted,
  actual,
  deviation,
  currentChange,
  onConfirm,
}: SingleResultProps) {
  const isConfirmed = actual !== null;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-700 mb-3">{title}</h4>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">予想変化率:</span>
          <span className="font-mono font-semibold">{formatChange(predicted)}</span>
        </div>

        {isConfirmed ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">実際変化率:</span>
              <span
                className={`font-mono font-semibold ${
                  actual >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatChange(actual)}
              </span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600">乖離:</span>
              <span
                className={`font-mono font-bold text-lg ${
                  deviation! <= 0.5
                    ? 'text-green-600'
                    : deviation! <= 1.0
                    ? 'text-yellow-600'
                    : 'text-red-600'
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
                <span className="text-gray-600">現在変化率:</span>
                <span
                  className={`font-mono ${
                    currentChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatChange(currentChange)}
                </span>
              </div>
            )}
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="mt-2 w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                結果を確定
              </button>
            )}
            {!onConfirm && (
              <div className="mt-2 text-sm text-gray-500 text-center">
                結果待ち
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ResultCard({ prediction, stockData, onUpdateResult }: ResultCardProps) {
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {prediction.date} の予想
        </h3>
        {prediction.confirmedAt && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
            確定済み
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SingleResult
          title="日経平均"
          predicted={prediction.nikkei.predictedChange}
          actual={prediction.nikkei.actualChange}
          deviation={prediction.nikkei.deviation}
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
          currentChange={stockData?.sp500?.changePercent}
          onConfirm={
            prediction.sp500.actualChange === null && stockData?.sp500
              ? handleConfirmSp500
              : undefined
          }
        />
      </div>
    </div>
  );
}

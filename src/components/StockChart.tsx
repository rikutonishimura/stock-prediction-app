/**
 * 株価チャートコンポーネント
 *
 * 日経平均とS&P500の過去の変動推移をグラフ表示します。
 */

'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useStockHistory, Period, StockHistoryData } from '@/hooks/useStockHistory';

const PERIOD_LABELS: Record<Period, string> = {
  '1w': '1週間',
  '3m': '3ヶ月',
  '1y': '1年',
  '5y': '5年',
};

interface ChartPanelProps {
  data: StockHistoryData;
  period: Period;
  color: string;
  currency: string;
}

function ChartPanel({ data, period, color, currency }: ChartPanelProps) {
  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === '1w') {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: 'numeric' });
    } else if (period === '5y') {
      return date.toLocaleDateString('ja-JP', { year: '2-digit', month: 'numeric' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    }
  };

  // 価格フォーマット
  const formatPrice = (price: number) => {
    if (currency === '¥') {
      return `¥${price.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // チャートデータを準備
  const chartData = data.data.map((point) => ({
    ...point,
    formattedDate: formatDate(point.date),
  }));

  // Y軸の範囲を計算
  const prices = data.data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;

  // 変化率の色を決定
  const isPositive = data.changePercent >= 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{data.name}</h3>
          <div className="text-2xl font-bold mt-1">{formatPrice(data.currentPrice)}</div>
          <div
            className={`text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}
            {data.changePercent.toFixed(2)}%
          </div>
        </div>
        <div className="text-xs text-gray-500">
          前日終値: {formatPrice(data.previousClose)}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) =>
                currency === '¥'
                  ? `${(value / 1000).toFixed(0)}k`
                  : value.toFixed(0)
              }
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatPrice(value), '価格']}
              labelFormatter={(label) => label}
            />
            <ReferenceLine
              y={data.previousClose}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StockChart() {
  const { nikkei, sp500, loading, error, period, setPeriod } = useStockHistory('3m');
  const [activeTab, setActiveTab] = useState<'both' | 'nikkei' | 'sp500'>('both');

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 期間選択タブ */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              disabled={loading}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              } disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 表示切り替え */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'both'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            両方
          </button>
          <button
            onClick={() => setActiveTab('nikkei')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'nikkei'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            日経
          </button>
          <button
            onClick={() => setActiveTab('sp500')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sp500'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            S&P
          </button>
        </div>
      </div>

      {/* ローディング表示 */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 h-80 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-48 bg-gray-100 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 h-80 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-48 bg-gray-100 rounded"></div>
          </div>
        </div>
      )}

      {/* チャート表示 */}
      {!loading && (
        <div
          className={`grid gap-4 ${
            activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {(activeTab === 'both' || activeTab === 'nikkei') && nikkei && (
            <ChartPanel data={nikkei} period={period} color="#dc2626" currency="¥" />
          )}
          {(activeTab === 'both' || activeTab === 'sp500') && sp500 && (
            <ChartPanel data={sp500} period={period} color="#2563eb" currency="$" />
          )}
        </div>
      )}
    </div>
  );
}

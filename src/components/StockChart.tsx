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
import { useTheme } from '@/contexts/ThemeContext';

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
  isDark: boolean;
}

function ChartPanel({ data, period, color, currency, isDark }: ChartPanelProps) {
  // ダークモード用の色設定
  const tickColor = isDark ? '#ffffff' : '#6b7280';
  const gridColor = isDark ? '#ffffff' : '#e5e7eb';
  const lineColor = color; // 常に元の色（青/赤）を使用
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
    if (currency === '円') {
      // ドル円用（通貨ペア）
      return `${price.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`;
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{data.name}</h3>
          <div className="text-2xl font-bold mt-1 dark:text-white">{formatPrice(data.currentPrice)}</div>
          <div
            className={`text-sm font-medium ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}
            {data.changePercent.toFixed(2)}%
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          前日終値: {formatPrice(data.previousClose)}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(value) => {
                if (currency === '¥') {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                if (currency === '円') {
                  return value.toFixed(1);
                }
                return value.toFixed(0);
              }}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [formatPrice(value as number), '価格']}
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
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type ChartType = 'both' | 'nikkei' | 'sp500' | 'gold' | 'usdjpy';

const CHART_CONFIG: Record<ChartType, { label: string; color: string; currency: string }> = {
  both: { label: '両方', color: '', currency: '' },
  sp500: { label: 'S&P', color: '#2563eb', currency: '$' },
  nikkei: { label: '日経', color: '#dc2626', currency: '¥' },
  gold: { label: 'ゴールド', color: '#f59e0b', currency: '$' },
  usdjpy: { label: 'ドル円', color: '#10b981', currency: '円' },
};

export function StockChart() {
  const { nikkei, sp500, gold, usdjpy, loading, error, period, setPeriod } = useStockHistory('3m');
  const [activeTab, setActiveTab] = useState<ChartType>('both');
  const { isDark } = useTheme();

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="text-red-600 dark:text-red-400 text-center">{error}</div>
      </div>
    );
  }

  const chartTypes: ChartType[] = ['both', 'sp500', 'nikkei', 'gold', 'usdjpy'];

  return (
    <div className="space-y-4">
      {/* 期間選択タブ */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              disabled={loading}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === key
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
              } disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 表示切り替え */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {chartTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === type
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              {CHART_CONFIG[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* ローディング表示 */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 h-80 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-4"></div>
            <div className="h-48 bg-gray-100 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 h-80 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-4"></div>
            <div className="h-48 bg-gray-100 dark:bg-slate-700 rounded"></div>
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
          {(activeTab === 'both' || activeTab === 'sp500') && sp500 && (
            <ChartPanel data={sp500} period={period} color={CHART_CONFIG.sp500.color} currency={CHART_CONFIG.sp500.currency} isDark={isDark} />
          )}
          {(activeTab === 'both' || activeTab === 'nikkei') && nikkei && (
            <ChartPanel data={nikkei} period={period} color={CHART_CONFIG.nikkei.color} currency={CHART_CONFIG.nikkei.currency} isDark={isDark} />
          )}
          {activeTab === 'gold' && gold && (
            <ChartPanel data={gold} period={period} color={CHART_CONFIG.gold.color} currency={CHART_CONFIG.gold.currency} isDark={isDark} />
          )}
          {activeTab === 'usdjpy' && usdjpy && (
            <ChartPanel data={usdjpy} period={period} color={CHART_CONFIG.usdjpy.color} currency={CHART_CONFIG.usdjpy.currency} isDark={isDark} />
          )}
        </div>
      )}
    </div>
  );
}

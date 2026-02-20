/**
 * 株価ティッカーコンポーネント
 *
 * 東証のような横スクロールする経済指数表示
 */

'use client';

import { useEffect, useState } from 'react';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

interface StockTickerProps {
  nikkeiPrice?: number;
  nikkeiChange?: number;
  sp500Price?: number;
  sp500Change?: number;
  goldPrice?: number;
  goldChange?: number;
  bitcoinPrice?: number;
  bitcoinChange?: number;
}

// 追加の経済指数（ダミーデータ）
const ADDITIONAL_INDICES: TickerItem[] = [
  { symbol: 'DJI', name: 'NYダウ', price: 44424.25, change: 0.65, changePercent: 0.65, currency: '$' },
  { symbol: 'IXIC', name: 'NASDAQ', price: 19954.30, change: -0.28, changePercent: -0.28, currency: '$' },
  { symbol: 'VIX', name: '恐怖指数', price: 14.85, change: -2.15, changePercent: -2.15, currency: '' },
  { symbol: 'USDJPY', name: 'ドル円', price: 154.32, change: 0.12, changePercent: 0.08, currency: '¥' },
  { symbol: 'EURJPY', name: 'ユーロ円', price: 162.45, change: -0.23, changePercent: -0.14, currency: '¥' },
  { symbol: 'WTI', name: '原油WTI', price: 73.42, change: -0.85, changePercent: -1.14, currency: '$' },
];

export function StockTicker({ nikkeiPrice, nikkeiChange, sp500Price, sp500Change, goldPrice, goldChange, bitcoinPrice, bitcoinChange }: StockTickerProps) {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const tickerItems: TickerItem[] = [];

    if (nikkeiPrice != null) {
      tickerItems.push({
        symbol: 'N225', name: '日経平均', price: nikkeiPrice,
        change: nikkeiChange || 0, changePercent: nikkeiChange || 0, currency: '¥',
      });
    }

    if (sp500Price != null) {
      tickerItems.push({
        symbol: 'SPX', name: 'S&P500', price: sp500Price,
        change: sp500Change || 0, changePercent: sp500Change || 0, currency: '$',
      });
    }

    if (goldPrice != null) {
      tickerItems.push({
        symbol: 'GOLD', name: 'ゴールド', price: goldPrice,
        change: goldChange || 0, changePercent: goldChange || 0, currency: '$',
      });
    }

    if (bitcoinPrice != null) {
      tickerItems.push({
        symbol: 'BTC', name: 'ビットコイン', price: bitcoinPrice,
        change: bitcoinChange || 0, changePercent: bitcoinChange || 0, currency: '$',
      });
    }

    setItems([...tickerItems, ...ADDITIONAL_INDICES]);
  }, [nikkeiPrice, nikkeiChange, sp500Price, sp500Change, goldPrice, goldChange, bitcoinPrice, bitcoinChange]);

  const formatPrice = (price: number, currency: string): string => {
    if (currency === '¥') {
      return `¥${price.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === '$') {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return price.toFixed(2);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // ティッカーを2回繰り返してシームレスなループを作成
  const tickerContent = [...items, ...items];

  return (
    <div className="bg-gray-900 text-white overflow-hidden">
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {tickerContent.map((item, index) => (
            <div key={`${item.symbol}-${index}`} className="ticker-item">
              <span className="ticker-name">{item.name}</span>
              <span className="ticker-price">{formatPrice(item.price, item.currency)}</span>
              <span className={`ticker-change ${item.changePercent >= 0 ? 'positive' : 'negative'}`}>
                {item.changePercent >= 0 ? '▲' : '▼'} {formatChange(item.changePercent)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

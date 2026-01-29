/**
 * 株価API連携モジュール
 *
 * Yahoo Finance APIを使用して株価データを取得します。
 * 将来的に別のAPIに切り替える場合は、このファイルの実装を変更するだけで対応できます。
 */

import type { StockQuote, StockSymbol } from '@/types';
import { STOCK_INFO } from '@/types';

/** APIのベースURL */
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

/** APIレスポンスの型 */
interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
      };
      indicators: {
        quote: Array<{
          close: number[];
          open: number[];
        }>;
      };
    }> | null;
    error: {
      code: string;
      description: string;
    } | null;
  };
}

/**
 * Yahoo Finance APIから株価を取得する
 */
async function fetchFromYahoo(symbol: string): Promise<StockQuote | null> {
  try {
    const url = `${YAHOO_FINANCE_API}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data: YahooFinanceResponse = await response.json();

    if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
      throw new Error(data.chart.error?.description || 'No data returned');
    }

    const result = data.chart.result[0];
    const { meta } = result;

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: meta.symbol,
      name: symbol === '^N225' ? '日経平均' : 'S&P500',
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

/**
 * 特定の銘柄の株価を取得する
 */
export async function getStockQuote(stockSymbol: StockSymbol): Promise<StockQuote | null> {
  const info = STOCK_INFO[stockSymbol];
  return fetchFromYahoo(info.symbol);
}

/**
 * 日経平均とS&P500の両方の株価を取得する
 */
export async function getAllQuotes(): Promise<{
  nikkei: StockQuote | null;
  sp500: StockQuote | null;
}> {
  const [nikkei, sp500] = await Promise.all([
    getStockQuote('nikkei'),
    getStockQuote('sp500'),
  ]);

  return { nikkei, sp500 };
}

/**
 * 株価データをキャッシュから取得（またはAPIから取得してキャッシュ）
 * ブラウザのsessionStorageを使用して同一セッション内でのAPI呼び出しを削減
 */
export async function getCachedQuotes(): Promise<{
  nikkei: StockQuote | null;
  sp500: StockQuote | null;
}> {
  if (typeof window === 'undefined') {
    return getAllQuotes();
  }

  const cacheKey = 'stock_quotes_cache';
  const cacheExpiry = 5 * 60 * 1000; // 5分

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheExpiry) {
        return data;
      }
    }
  } catch {
    // キャッシュ読み取りエラーは無視
  }

  const quotes = await getAllQuotes();

  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ data: quotes, timestamp: Date.now() })
    );
  } catch {
    // キャッシュ書き込みエラーは無視
  }

  return quotes;
}

/**
 * 市場が開いているか確認する
 * 注意: 簡易的な判定です。祝日などは考慮していません。
 */
export function isMarketOpen(stockSymbol: StockSymbol): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();

  // 土日は休場
  if (day === 0 || day === 6) return false;

  if (stockSymbol === 'nikkei') {
    // 日経平均: 9:00 - 15:00 (日本時間)
    const time = hours * 60 + minutes;
    return time >= 9 * 60 && time < 15 * 60;
  } else {
    // S&P500: 23:30 - 6:00 (日本時間、夏時間は22:30 - 5:00)
    // 簡易的に23:00 - 6:00とする
    return hours >= 23 || hours < 6;
  }
}

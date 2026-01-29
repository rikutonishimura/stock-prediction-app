/**
 * 株価取得API Route
 *
 * サーバーサイドからYahoo Finance APIを呼び出し、
 * CORSの問題を回避します。
 */

import { NextResponse } from 'next/server';

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface StockQuoteResult {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

async function fetchStock(symbol: string, name: string): Promise<StockQuoteResult | null> {
  try {
    const url = `${YAHOO_FINANCE_API}/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 60 }, // 1分間キャッシュ
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
      console.error(`No data for ${symbol}:`, data.chart.error);
      return null;
    }

    const result = data.chart.result[0];
    const { meta, indicators } = result;

    const currentPrice = meta.regularMarketPrice;
    // previousCloseを複数の方法で取得を試みる
    let previousClose = meta.previousClose || meta.chartPreviousClose;

    // previousCloseがない場合、過去のデータから取得を試みる
    if (!previousClose && indicators?.quote?.[0]?.close) {
      const closes = indicators.quote[0].close.filter((c: number | null) => c !== null);
      if (closes.length >= 2) {
        previousClose = closes[closes.length - 2];
      } else if (closes.length === 1) {
        previousClose = closes[0];
      }
    }

    // それでもない場合は現在価格を使用
    if (!previousClose) {
      previousClose = currentPrice;
    }

    const change = currentPrice - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: meta.symbol,
      name: name,
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    const [nikkei, sp500] = await Promise.all([
      fetchStock('^N225', '日経平均'),
      fetchStock('^GSPC', 'S&P500'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        nikkei,
        sp500,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock data',
      },
      { status: 500 }
    );
  }
}

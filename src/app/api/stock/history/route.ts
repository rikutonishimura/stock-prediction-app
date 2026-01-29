/**
 * 株価履歴取得API Route
 *
 * 指定した期間の株価履歴データを取得します。
 */

import { NextRequest, NextResponse } from 'next/server';

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// 期間に応じたAPIパラメータ
const PERIOD_CONFIG: Record<string, { range: string; interval: string }> = {
  '1w': { range: '5d', interval: '1h' },
  '3m': { range: '3mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '5y': { range: '5y', interval: '1wk' },
};

export interface HistoryDataPoint {
  date: string;
  timestamp: number;
  price: number;
}

export interface StockHistoryResult {
  symbol: string;
  name: string;
  data: HistoryDataPoint[];
  currentPrice: number;
  previousClose: number;
  changePercent: number;
}

async function fetchStockHistory(
  symbol: string,
  name: string,
  period: string
): Promise<StockHistoryResult | null> {
  try {
    const config = PERIOD_CONFIG[period] || PERIOD_CONFIG['3m'];
    const url = `${YAHOO_FINANCE_API}/${encodeURIComponent(symbol)}?interval=${config.interval}&range=${config.range}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 300 }, // 5分間キャッシュ
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
    const { meta, timestamp, indicators } = result;
    const quotes = indicators.quote[0];

    // データポイントを作成
    const historyData: HistoryDataPoint[] = [];

    if (timestamp && quotes.close) {
      for (let i = 0; i < timestamp.length; i++) {
        const price = quotes.close[i];
        if (price !== null && price !== undefined) {
          historyData.push({
            date: new Date(timestamp[i] * 1000).toISOString(),
            timestamp: timestamp[i] * 1000,
            price: price,
          });
        }
      }
    }

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const changePercent = previousClose !== 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : 0;

    return {
      symbol: meta.symbol,
      name: name,
      data: historyData,
      currentPrice,
      previousClose,
      changePercent,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol} history:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '3m';

    const [nikkei, sp500] = await Promise.all([
      fetchStockHistory('^N225', '日経平均', period),
      fetchStockHistory('^GSPC', 'S&P500', period),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        nikkei,
        sp500,
      },
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock history',
      },
      { status: 500 }
    );
  }
}

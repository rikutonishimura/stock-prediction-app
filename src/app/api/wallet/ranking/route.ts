/**
 * ポイントランキングAPI
 * GET /api/wallet/ranking
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';
const SYMBOL_MAP: Record<string, string> = {
  nikkei: '^N225',
  sp500: '^GSPC',
  gold: 'GC=F',
  bitcoin: 'BTC-USD',
};

async function getCurrentPrice(symbol: string): Promise<number | null> {
  const yahooSymbol = SYMBOL_MAP[symbol];
  if (!yahooSymbol) return null;
  try {
    const url = `${YAHOO_FINANCE_API}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.chart.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // 全ウォレット取得
    const { data: wallets } = await supabaseAdmin
      .from('wallets').select('user_id, balance');

    // 全保有銘柄取得
    const { data: allHoldings } = await supabaseAdmin
      .from('holdings').select('user_id, symbol, units').gt('units', 0);

    // 現在価格を並行取得
    const prices: Record<string, number> = {};
    await Promise.all(Object.keys(SYMBOL_MAP).map(async (sym) => {
      prices[sym] = (await getCurrentPrice(sym)) ?? 0;
    }));

    // プロフィール取得
    const { data: profiles } = await supabaseAdmin
      .from('profiles').select('id, name');
    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) ?? []);

    // 保有銘柄をユーザーごとにまとめる
    const holdingsByUser = new Map<string, { symbol: string; units: number }[]>();
    for (const h of allHoldings ?? []) {
      if (!holdingsByUser.has(h.user_id)) holdingsByUser.set(h.user_id, []);
      holdingsByUser.get(h.user_id)!.push({ symbol: h.symbol, units: Number(h.units) });
    }

    // ランキング計算
    const ranking = (wallets ?? []).map(w => {
      const holdings = holdingsByUser.get(w.user_id) ?? [];
      const holdingValue = holdings.reduce((sum, h) => sum + h.units * (prices[h.symbol] ?? 0), 0);
      const totalAssets = w.balance + Math.round(holdingValue);
      return {
        userId: w.user_id,
        userName: profileMap.get(w.user_id) ?? '匿名ユーザー',
        balance: w.balance,
        holdingValue: Math.round(holdingValue),
        totalAssets,
        holdings: holdings.map(h => ({
          symbol: h.symbol,
          units: h.units,
          currentValue: Math.round(h.units * (prices[h.symbol] ?? 0)),
        })),
      };
    });

    ranking.sort((a, b) => b.totalAssets - a.totalAssets);

    return NextResponse.json({ ranking: ranking.slice(0, 50) });
  } catch (error) {
    console.error('Point ranking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

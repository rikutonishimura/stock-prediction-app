/**
 * ウォレット情報取得API
 * GET /api/wallet - 自分のウォレット・保有銘柄・取引履歴を取得
 * GET /api/wallet?userId=xxx - 他ユーザーのポートフォリオ（読み取り専用）
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function GET(request: Request) {
  try {
    // 認証
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || user.id;
    const isOwnWallet = targetUserId === user.id;

    // ウォレット取得
    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('balance').eq('user_id', targetUserId).single();

    // 保有銘柄取得
    const { data: holdings } = await supabaseAdmin
      .from('holdings').select('*').eq('user_id', targetUserId).gt('units', 0);

    // 現在価格を並行取得
    const symbols = [...new Set((holdings || []).map(h => h.symbol))];
    const prices: Record<string, number | null> = {};
    await Promise.all(symbols.map(async (sym) => {
      prices[sym] = await getCurrentPrice(sym);
    }));

    // 保有銘柄の時価評価
    const holdingsWithValue = (holdings || []).map(h => {
      const currentPrice = prices[h.symbol] ?? 0;
      const currentValue = Number(h.units) * currentPrice;
      const costBasis = Number(h.units) * Number(h.avg_purchase_price);
      return {
        symbol: h.symbol,
        units: Number(h.units),
        avgPurchasePrice: Number(h.avg_purchase_price),
        currentPrice,
        currentValue: Math.round(currentValue),
        costBasis: Math.round(costBasis),
        profitLoss: Math.round(currentValue - costBasis),
        profitLossPercent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
      };
    });

    const balance = wallet?.balance ?? 0;
    const totalAssetValue = holdingsWithValue.reduce((sum, h) => sum + h.currentValue, 0);
    const totalAssets = balance + totalAssetValue;

    // 自分のウォレットの場合は取引履歴も返す
    let recentTransactions = null;
    if (isOwnWallet) {
      const { data: txns } = await supabaseAdmin
        .from('point_transactions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      recentTransactions = txns;
    }

    return NextResponse.json({
      balance,
      holdings: holdingsWithValue,
      totalAssets,
      recentTransactions,
    });
  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

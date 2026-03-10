/**
 * 売買API
 * POST /api/wallet/trade
 * body: { action: 'buy'|'sell', symbol: string, points: number }
 *
 * 価格モデル: 1pt = 1単位の価格（通貨を無視して数値をそのまま使用）
 * 例: 日経38000 → 1口=38000pt、5000pt投資 → 0.1316口
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
const SYMBOL_NAMES: Record<string, string> = {
  nikkei: '日経平均',
  sp500: 'S&P500',
  gold: 'ゴールド',
  bitcoin: 'ビットコイン',
};

const MIN_TRADE_POINTS = 1000;

async function getCurrentPrice(symbol: string): Promise<number | null> {
  const yahooSymbol = SYMBOL_MAP[symbol];
  if (!yahooSymbol) return null;
  try {
    const url = `${YAHOO_FINANCE_API}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.chart.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // ユーザー認証
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, symbol, points } = await request.json();

    if (!['buy', 'sell'].includes(action)) {
      return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });
    }
    if (!SYMBOL_MAP[symbol]) {
      return NextResponse.json({ error: '無効な銘柄です' }, { status: 400 });
    }
    if (typeof points !== 'number' || points < MIN_TRADE_POINTS) {
      return NextResponse.json({ error: `最低${MIN_TRADE_POINTS.toLocaleString()}pt以上で取引してください` }, { status: 400 });
    }

    // 現在価格を取得
    const currentPrice = await getCurrentPrice(symbol);
    if (!currentPrice || currentPrice <= 0) {
      return NextResponse.json({ error: '現在の価格を取得できませんでした' }, { status: 503 });
    }

    // ウォレット取得
    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('*').eq('user_id', user.id).single();
    if (!wallet) {
      return NextResponse.json({ error: 'ウォレットが見つかりません。ページを再読み込みしてください。' }, { status: 404 });
    }

    if (action === 'buy') {
      if (wallet.balance < points) {
        return NextResponse.json({ error: 'ポイントが不足しています' }, { status: 400 });
      }
      const unitsBought = points / currentPrice;

      // 既存の保有銘柄を取得
      const { data: existing } = await supabaseAdmin
        .from('holdings').select('*').eq('user_id', user.id).eq('symbol', symbol).single();

      if (existing) {
        // 加重平均価格を更新
        const newUnits = Number(existing.units) + unitsBought;
        const newAvgPrice = (Number(existing.units) * Number(existing.avg_purchase_price) + unitsBought * currentPrice) / newUnits;
        await supabaseAdmin.from('holdings').update({
          units: newUnits,
          avg_purchase_price: newAvgPrice,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabaseAdmin.from('holdings').insert({
          user_id: user.id,
          symbol,
          units: unitsBought,
          avg_purchase_price: currentPrice,
        });
      }

      const newBalance = wallet.balance - points;
      await supabaseAdmin.from('wallets').update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      await supabaseAdmin.from('point_transactions').insert({
        user_id: user.id,
        type: 'buy',
        amount: -points,
        symbol,
        description: `${SYMBOL_NAMES[symbol]} 購入 (${currentPrice.toLocaleString()} × ${unitsBought.toFixed(6)}口)`,
      });

      return NextResponse.json({ balance: newBalance, action: 'buy', symbol, points, units: unitsBought, price: currentPrice });

    } else {
      // SELL
      const { data: holding } = await supabaseAdmin
        .from('holdings').select('*').eq('user_id', user.id).eq('symbol', symbol).single();
      if (!holding || Number(holding.units) <= 0) {
        return NextResponse.json({ error: 'この銘柄を保有していません' }, { status: 400 });
      }

      const currentHoldingValue = Number(holding.units) * currentPrice;
      const sellPoints = Math.min(points, Math.round(currentHoldingValue));
      const unitsToSell = sellPoints / currentPrice;
      const actualUnitsToSell = Math.min(unitsToSell, Number(holding.units));
      const actualSellPoints = Math.round(actualUnitsToSell * currentPrice);

      const newUnits = Number(holding.units) - actualUnitsToSell;
      if (newUnits < 0.000001) {
        await supabaseAdmin.from('holdings').delete().eq('id', holding.id);
      } else {
        await supabaseAdmin.from('holdings').update({
          units: newUnits,
          updated_at: new Date().toISOString(),
        }).eq('id', holding.id);
      }

      const newBalance = wallet.balance + actualSellPoints;
      await supabaseAdmin.from('wallets').update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      await supabaseAdmin.from('point_transactions').insert({
        user_id: user.id,
        type: 'sell',
        amount: actualSellPoints,
        symbol,
        description: `${SYMBOL_NAMES[symbol]} 売却 (${currentPrice.toLocaleString()} × ${actualUnitsToSell.toFixed(6)}口)`,
      });

      return NextResponse.json({ balance: newBalance, action: 'sell', symbol, points: actualSellPoints, units: actualUnitsToSell, price: currentPrice });
    }
  } catch (error) {
    console.error('Trade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

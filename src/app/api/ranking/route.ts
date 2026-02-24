/**
 * ランキングAPI
 *
 * 全ユーザーの予測精度ランキングを取得します。
 * 市場終了後は未確定の予想を自動確定します。
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// サーバーサイド用Supabaseクライアント（service_roleでRLSをバイパス）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

const ASSET_KEYS = ['nikkei', 'sp500', 'gold', 'bitcoin'] as const;
const ASSET_SYMBOLS: Record<string, string> = {
  nikkei: '^N225',
  sp500: '^GSPC',
  gold: 'GC=F',
  bitcoin: 'BTC-USD',
};
const MARKET_CLOSE_HOURS_UTC: Record<string, number> = {
  nikkei: 6,
  sp500: 21,
  gold: 22,
  bitcoin: 21,
};

interface LatestPrediction {
  date: string;
  nikkeiPredictedChange: number | null;
  sp500PredictedChange: number | null;
  goldPredictedChange: number | null;
  bitcoinPredictedChange: number | null;
  nikkeiActualChange: number | null;
  sp500ActualChange: number | null;
  goldActualChange: number | null;
  bitcoinActualChange: number | null;
}

interface RankingUser {
  userId: string;
  userName: string;
  averageDeviation: number;
  totalPredictions: number;
  confirmedPredictions: number;
  directionAccuracy: number;
  latestPrediction: LatestPrediction | null;
}

interface RegisteredUser {
  id: string;
  name: string;
  createdAt: string;
}

async function fetchChangePercent(symbol: string): Promise<number | null> {
  try {
    const url = `${YAHOO_FINANCE_API}/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (data.chart.error || !data.chart.result?.[0]) return null;

    const meta = data.chart.result[0].meta;
    const indicators = data.chart.result[0].indicators;
    const currentPrice = meta.regularMarketPrice;
    let previousClose = meta.previousClose || meta.chartPreviousClose;

    if (!previousClose && indicators?.quote?.[0]?.close) {
      const closes = indicators.quote[0].close.filter((c: number | null) => c !== null);
      if (closes.length >= 2) previousClose = closes[closes.length - 2];
      else if (closes.length === 1) previousClose = closes[0];
    }
    if (!previousClose) return null;

    return ((currentPrice - previousClose) / previousClose) * 100;
  } catch {
    return null;
  }
}

function areAllPredictedMarketsClosed(predictionDate: string, predictedAssets: string[]): boolean {
  const now = new Date();
  const prediction = new Date(predictionDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  prediction.setHours(0, 0, 0, 0);

  if (prediction < today) return true;
  if (prediction > today) return false;

  const currentHourUTC = now.getUTCHours();
  return predictedAssets.every(asset => currentHourUTC >= (MARKET_CLOSE_HOURS_UTC[asset] || 21));
}

async function autoConfirmAllPending() {
  const { data: pending, error } = await supabase
    .from('predictions')
    .select('id, user_id, date, nikkei_predicted_change, sp500_predicted_change, gold_predicted_change, bitcoin_predicted_change')
    .is('confirmed_at', null);

  if (error || !pending || pending.length === 0) return;

  // 各予想で予想した銘柄を判定し、閉場チェック
  const eligible = pending.filter(p => {
    const predictedAssets = ASSET_KEYS.filter(k => p[`${k}_predicted_change`] != null);
    if (predictedAssets.length === 0) return false;
    return areAllPredictedMarketsClosed(p.date, predictedAssets);
  });

  if (eligible.length === 0) return;

  // 必要な銘柄の株価データのみ取得
  const neededSymbols = new Set<string>();
  for (const pred of eligible) {
    for (const key of ASSET_KEYS) {
      if (pred[`${key}_predicted_change`] != null) neededSymbols.add(key);
    }
  }

  const changePercents: Record<string, number | null> = {};
  await Promise.all(
    Array.from(neededSymbols).map(async (key) => {
      changePercents[key] = await fetchChangePercent(ASSET_SYMBOLS[key]);
    })
  );

  for (const pred of eligible) {
    const updates: Record<string, unknown> = { confirmed_at: new Date().toISOString() };

    for (const key of ASSET_KEYS) {
      if (pred[`${key}_predicted_change`] != null && changePercents[key] != null) {
        updates[`${key}_actual_change`] = changePercents[key];
        updates[`${key}_deviation`] = Math.abs(Number(pred[`${key}_predicted_change`]) - changePercents[key]!);
      }
    }

    const { error: updateError } = await supabase
      .from('predictions')
      .update(updates)
      .eq('id', pred.id);

    if (updateError) {
      console.error(`[autoConfirmAll] 確定エラー (${pred.id}):`, updateError);
    }
  }
}

export async function GET(request: Request) {
  try {
    await autoConfirmAllPending();

    // 期間パラメータ（all=累計, weekly=今週）
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    // 週次の場合、今週の月曜日（日本時間）を起点にフィルタ
    let weekStartStr: string | null = null;
    if (period === 'weekly') {
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstNow = new Date(now.getTime() + jstOffset);
      const day = jstNow.getUTCDay();
      const diff = day === 0 ? 6 : day - 1; // 月曜日を週の開始に
      const monday = new Date(jstNow);
      monday.setUTCDate(monday.getUTCDate() - diff);
      weekStartStr = monday.toISOString().split('T')[0];
    }

    // 確定済み予想を取得
    let predictionsQuery = supabase
      .from('predictions')
      .select(`
        user_id, date,
        nikkei_deviation, sp500_deviation, gold_deviation, bitcoin_deviation,
        nikkei_predicted_change, nikkei_actual_change,
        sp500_predicted_change, sp500_actual_change,
        gold_predicted_change, gold_actual_change,
        bitcoin_predicted_change, bitcoin_actual_change,
        confirmed_at
      `)
      .not('confirmed_at', 'is', null);

    if (weekStartStr) {
      predictionsQuery = predictionsQuery.gte('date', weekStartStr);
    }

    const { data: predictions, error: predictionsError } = await predictionsQuery;

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    const registeredUsers: RegisteredUser[] = (profiles || []).map(p => ({
      id: p.id,
      name: p.name || '匿名ユーザー',
      createdAt: p.created_at,
    }));

    // 今日の日付を取得（日本時間）
    const today = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(today.getTime() + jstOffset);
    const todayStr = jstDate.toISOString().split('T')[0];

    const { data: latestPredictions, error: latestError } = await supabase
      .from('predictions')
      .select('user_id, date, nikkei_predicted_change, sp500_predicted_change, gold_predicted_change, bitcoin_predicted_change, nikkei_actual_change, sp500_actual_change, gold_actual_change, bitcoin_actual_change')
      .eq('date', todayStr);

    if (latestError) {
      console.error('Error fetching latest predictions:', latestError);
    }

    const latestPredictionMap = new Map<string, LatestPrediction>();
    latestPredictions?.forEach(p => {
      latestPredictionMap.set(p.user_id, {
        date: p.date,
        nikkeiPredictedChange: p.nikkei_predicted_change != null ? Number(p.nikkei_predicted_change) : null,
        sp500PredictedChange: p.sp500_predicted_change != null ? Number(p.sp500_predicted_change) : null,
        goldPredictedChange: p.gold_predicted_change != null ? Number(p.gold_predicted_change) : null,
        bitcoinPredictedChange: p.bitcoin_predicted_change != null ? Number(p.bitcoin_predicted_change) : null,
        nikkeiActualChange: p.nikkei_actual_change != null ? Number(p.nikkei_actual_change) : null,
        sp500ActualChange: p.sp500_actual_change != null ? Number(p.sp500_actual_change) : null,
        goldActualChange: p.gold_actual_change != null ? Number(p.gold_actual_change) : null,
        bitcoinActualChange: p.bitcoin_actual_change != null ? Number(p.bitcoin_actual_change) : null,
      });
    });

    // ユーザーごとの統計を計算
    const userStatsMap = new Map<string, {
      deviations: number[];
      directionCorrect: number;
      directionTotal: number;
      totalPredictions: number;
    }>();

    predictions?.forEach(p => {
      const userId = p.user_id;
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          deviations: [],
          directionCorrect: 0,
          directionTotal: 0,
          totalPredictions: 0,
        });
      }

      const stats = userStatsMap.get(userId)!;

      for (const key of ASSET_KEYS) {
        const deviation = p[`${key}_deviation`];
        if (deviation != null) {
          stats.deviations.push(Number(deviation));
        }

        const predicted = p[`${key}_predicted_change`];
        const actual = p[`${key}_actual_change`];
        if (predicted != null && actual != null) {
          stats.directionTotal++;
          if ((Number(predicted) >= 0) === (Number(actual) >= 0)) {
            stats.directionCorrect++;
          }
        }
      }

      stats.totalPredictions++;
    });

    const rankings: RankingUser[] = [];

    // 確定済みデータがあるユーザーをランキングに追加
    userStatsMap.forEach((stats, userId) => {
      if (stats.deviations.length === 0) return;

      const averageDeviation = stats.deviations.reduce((a, b) => a + b, 0) / stats.deviations.length;
      const directionAccuracy = stats.directionTotal > 0
        ? (stats.directionCorrect / stats.directionTotal) * 100
        : 0;

      rankings.push({
        userId,
        userName: profileMap.get(userId) || '匿名ユーザー',
        averageDeviation: Math.round(averageDeviation * 100) / 100,
        totalPredictions: stats.totalPredictions,
        confirmedPredictions: stats.totalPredictions,
        directionAccuracy: Math.round(directionAccuracy * 10) / 10,
        latestPrediction: latestPredictionMap.get(userId) || null,
      });
    });

    // 本日の予想があるが確定済みデータがないユーザーもランキングに追加
    latestPredictionMap.forEach((latestPred, userId) => {
      if (userStatsMap.has(userId)) return; // 既にランキングに含まれている
      rankings.push({
        userId,
        userName: profileMap.get(userId) || '匿名ユーザー',
        averageDeviation: -1, // 未確定を示すフラグ
        totalPredictions: 0,
        confirmedPredictions: 0,
        directionAccuracy: -1,
        latestPrediction: latestPred,
      });
    });

    // 確定済みユーザーを乖離順でソート、未確定ユーザーは末尾に
    rankings.sort((a, b) => {
      if (a.averageDeviation === -1 && b.averageDeviation === -1) return 0;
      if (a.averageDeviation === -1) return 1;
      if (b.averageDeviation === -1) return -1;
      return a.averageDeviation - b.averageDeviation;
    });

    return NextResponse.json({
      rankings: rankings.slice(0, 50),
      totalUsers: rankings.length,
      registeredUsers,
    });
  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

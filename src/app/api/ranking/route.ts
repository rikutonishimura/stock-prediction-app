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

interface LatestPrediction {
  date: string;
  nikkeiPredictedChange: number | null;
  sp500PredictedChange: number | null;
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

/**
 * Yahoo Financeから株価の変化率を取得
 */
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

/**
 * 両方の市場が終了しているかチェック
 */
function areBothMarketsClosed(predictionDate: string): boolean {
  const now = new Date();
  const prediction = new Date(predictionDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  prediction.setHours(0, 0, 0, 0);

  if (prediction < today) return true;
  if (prediction > today) return false;

  const currentHourUTC = now.getUTCHours();
  // 日経: UTC 06:00以降、S&P500: UTC 21:00以降
  return currentHourUTC >= 6 && currentHourUTC >= 21;
}

/**
 * 全ユーザーの未確定予想をサーバー側で自動確定
 */
async function autoConfirmAllPending() {
  // 未確定の予想を取得
  const { data: pending, error } = await supabase
    .from('predictions')
    .select('id, user_id, date, nikkei_predicted_change, sp500_predicted_change')
    .is('confirmed_at', null);

  if (error || !pending || pending.length === 0) return;

  // 確定可能な予想をフィルタ
  const eligiblePredictions = pending.filter(p => areBothMarketsClosed(p.date));
  if (eligiblePredictions.length === 0) return;

  // 株価データを取得
  const [nikkeiChange, sp500Change] = await Promise.all([
    fetchChangePercent('^N225'),
    fetchChangePercent('^GSPC'),
  ]);

  if (nikkeiChange == null || sp500Change == null) {
    console.error('[autoConfirmAll] 株価データ取得失敗');
    return;
  }

  // 各予想を確定
  for (const pred of eligiblePredictions) {
    const nikkeiDeviation = Math.abs(Number(pred.nikkei_predicted_change) - nikkeiChange);
    const sp500Deviation = Math.abs(Number(pred.sp500_predicted_change) - sp500Change);

    const { error: updateError } = await supabase
      .from('predictions')
      .update({
        nikkei_actual_change: nikkeiChange,
        nikkei_deviation: nikkeiDeviation,
        sp500_actual_change: sp500Change,
        sp500_deviation: sp500Deviation,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', pred.id);

    if (updateError) {
      console.error(`[autoConfirmAll] 確定エラー (${pred.id}):`, updateError);
    } else {
      console.log(`[autoConfirmAll] ${pred.date} user=${pred.user_id} を自動確定`);
    }
  }
}

export async function GET() {
  try {
    // まず未確定の予想を自動確定
    await autoConfirmAllPending();

    // 全ユーザーの確定済み予想を取得
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select(`
        user_id,
        nikkei_deviation,
        sp500_deviation,
        nikkei_predicted_change,
        nikkei_actual_change,
        sp500_predicted_change,
        sp500_actual_change,
        confirmed_at
      `)
      .not('confirmed_at', 'is', null);

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }

    // プロフィール情報を取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // プロフィールマップを作成
    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    // 登録ユーザー一覧を作成
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

    // 各ユーザーの最新の予測を取得
    const { data: latestPredictions, error: latestError } = await supabase
      .from('predictions')
      .select('user_id, date, nikkei_predicted_change, sp500_predicted_change')
      .eq('date', todayStr);

    if (latestError) {
      console.error('Error fetching latest predictions:', latestError);
    }

    // 最新予測マップを作成
    const latestPredictionMap = new Map<string, LatestPrediction>();
    latestPredictions?.forEach(p => {
      latestPredictionMap.set(p.user_id, {
        date: p.date,
        nikkeiPredictedChange: p.nikkei_predicted_change != null ? Number(p.nikkei_predicted_change) : null,
        sp500PredictedChange: p.sp500_predicted_change != null ? Number(p.sp500_predicted_change) : null,
      });
    });

    // ユーザーごとの統計を計算
    const userStatsMap = new Map<string, {
      deviations: number[];
      nikkeiDirectionCorrect: number;
      sp500DirectionCorrect: number;
      totalPredictions: number;
    }>();

    predictions?.forEach(p => {
      const userId = p.user_id;
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          deviations: [],
          nikkeiDirectionCorrect: 0,
          sp500DirectionCorrect: 0,
          totalPredictions: 0,
        });
      }

      const stats = userStatsMap.get(userId)!;

      // 乖離を追加
      if (p.nikkei_deviation != null) {
        stats.deviations.push(Number(p.nikkei_deviation));
      }
      if (p.sp500_deviation != null) {
        stats.deviations.push(Number(p.sp500_deviation));
      }

      // 方向正答率を計算
      if (p.nikkei_predicted_change != null && p.nikkei_actual_change != null) {
        const predictedDirection = Number(p.nikkei_predicted_change) >= 0;
        const actualDirection = Number(p.nikkei_actual_change) >= 0;
        if (predictedDirection === actualDirection) {
          stats.nikkeiDirectionCorrect++;
        }
      }
      if (p.sp500_predicted_change != null && p.sp500_actual_change != null) {
        const predictedDirection = Number(p.sp500_predicted_change) >= 0;
        const actualDirection = Number(p.sp500_actual_change) >= 0;
        if (predictedDirection === actualDirection) {
          stats.sp500DirectionCorrect++;
        }
      }

      stats.totalPredictions++;
    });

    // ランキングデータを作成
    const rankings: RankingUser[] = [];

    userStatsMap.forEach((stats, userId) => {
      if (stats.deviations.length === 0) return;

      const averageDeviation = stats.deviations.reduce((a, b) => a + b, 0) / stats.deviations.length;
      const directionAccuracy = ((stats.nikkeiDirectionCorrect + stats.sp500DirectionCorrect) / (stats.totalPredictions * 2)) * 100;

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

    // 平均乖離が小さい順にソート
    rankings.sort((a, b) => a.averageDeviation - b.averageDeviation);

    return NextResponse.json({
      rankings: rankings.slice(0, 50), // 上位50人まで
      totalUsers: rankings.length,
      registeredUsers,
    });
  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

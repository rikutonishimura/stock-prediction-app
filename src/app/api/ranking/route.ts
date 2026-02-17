/**
 * ランキングAPI
 *
 * 全ユーザーの予測精度ランキングを取得します。
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// サーバーサイド用Supabaseクライアント（service_roleでRLSをバイパス）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET() {
  try {
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

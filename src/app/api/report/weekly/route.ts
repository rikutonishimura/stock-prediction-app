/**
 * 週次レポート生成API
 *
 * ユーザーの週間予測データをClaude Haikuで分析し、成長レポートを返します。
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import type { PredictionRecord, StockSymbol } from '@/types';
import { calculateStockStats } from '@/lib/stats';

const ASSET_KEYS: StockSymbol[] = ['nikkei', 'sp500', 'gold', 'bitcoin'];
const ASSET_LABELS: Record<StockSymbol, string> = {
  nikkei: '日経平均',
  sp500: 'S&P500',
  gold: 'ゴールド',
  bitcoin: 'ビットコイン',
};

function assetFromRow(row: Record<string, unknown>, prefix: string) {
  if (row[`${prefix}_predicted_change`] == null) return null;
  return {
    previousClose: Number(row[`${prefix}_previous_close`]) || 0,
    predictedChange: Number(row[`${prefix}_predicted_change`]) || 0,
    actualChange: row[`${prefix}_actual_change`] != null ? Number(row[`${prefix}_actual_change`]) : null,
    deviation: row[`${prefix}_deviation`] != null ? Number(row[`${prefix}_deviation`]) : null,
  };
}

function rowToRecord(row: Record<string, unknown>): PredictionRecord {
  return {
    id: row.id as string,
    date: row.date as string,
    nikkei: assetFromRow(row, 'nikkei'),
    sp500: assetFromRow(row, 'sp500'),
    gold: assetFromRow(row, 'gold'),
    bitcoin: assetFromRow(row, 'bitcoin'),
    reviewComment: (row.review_comment as string | null) ?? null,
    createdAt: row.created_at as string,
    confirmedAt: row.confirmed_at as string | null,
  };
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

function getPreviousWeekStart(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const weekStartDate = body.weekStartDate as string;

    if (!weekStartDate) {
      return NextResponse.json({ success: false, error: 'weekStartDate is required' }, { status: 400 });
    }

    const weekEnd = getWeekEnd(weekStartDate);
    const prevWeekStart = getPreviousWeekStart(weekStartDate);
    const prevWeekEnd = getWeekEnd(prevWeekStart);

    // 今週と前週のデータを並行取得
    const [thisWeekRes, prevWeekRes] = await Promise.all([
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStartDate)
        .lte('date', weekEnd)
        .order('date'),
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', prevWeekStart)
        .lte('date', prevWeekEnd)
        .order('date'),
    ]);

    const thisWeekRecords = (thisWeekRes.data || []).map(rowToRecord);
    const prevWeekRecords = (prevWeekRes.data || []).map(rowToRecord);

    // 確定済みの予測のみ対象
    const confirmedThisWeek = thisWeekRecords.filter(r => r.confirmedAt);
    if (confirmedThisWeek.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'この週の確定済み予測がありません',
      });
    }

    // 銘柄別統計を計算
    const thisWeekStats = Object.fromEntries(
      ASSET_KEYS.map(sym => [sym, calculateStockStats(confirmedThisWeek, sym)])
    ) as Record<StockSymbol, ReturnType<typeof calculateStockStats>>;

    const confirmedPrevWeek = prevWeekRecords.filter(r => r.confirmedAt);
    const prevWeekStats = confirmedPrevWeek.length > 0
      ? Object.fromEntries(
          ASSET_KEYS.map(sym => [sym, calculateStockStats(confirmedPrevWeek, sym)])
        ) as Record<StockSymbol, ReturnType<typeof calculateStockStats>>
      : null;

    // AI用のデータ構築
    const weekLabel = `${weekStartDate.slice(5).replace('-', '/')} - ${weekEnd.slice(5).replace('-', '/')}`;

    let assetSummary = '';
    for (const sym of ASSET_KEYS) {
      const s = thisWeekStats[sym];
      if (s.confirmedPredictions === 0) continue;
      assetSummary += `${ASSET_LABELS[sym]}: ${s.confirmedPredictions}回予測, 平均乖離 ${s.averageDeviation.toFixed(2)}, 方向正答率 ${s.directionAccuracy.toFixed(0)}%`;
      if (s.minDeviationDate) assetSummary += `, ベスト ${s.minDeviation.toFixed(2)} (${s.minDeviationDate})`;
      if (s.maxDeviationDate) assetSummary += `, ワースト ${s.maxDeviation.toFixed(2)} (${s.maxDeviationDate})`;
      assetSummary += '\n';
    }

    let prevWeekSummary = '';
    if (prevWeekStats) {
      prevWeekSummary = '先週のデータ:\n';
      for (const sym of ASSET_KEYS) {
        const s = prevWeekStats[sym];
        if (s.confirmedPredictions === 0) continue;
        prevWeekSummary += `${ASSET_LABELS[sym]}: 平均乖離 ${s.averageDeviation.toFixed(2)}, 方向正答率 ${s.directionAccuracy.toFixed(0)}%\n`;
      }
    } else {
      prevWeekSummary = '先週のデータ: なし（初週または前週データなし）';
    }

    // ユーザーの振り返りコメント
    const comments = confirmedThisWeek
      .filter(r => r.reviewComment)
      .map(r => `${r.date}: ${r.reviewComment}`);

    // Claude Haiku呼び出し
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `あなたは株価予測トレーニングアプリのコーチです。ユーザーの週間パフォーマンスを分析し、成長を励ましてください。ポジティブなトーンで、具体的な数値を引用しながらコメントしてください。

## 今週のデータ (${weekLabel})
予測日数: ${confirmedThisWeek.length}日

${assetSummary}

${prevWeekSummary}

ユーザーの振り返りコメント:
${comments.length > 0 ? comments.join('\n') : 'なし'}

以下のJSON形式のみ出力してください（日本語で）:
{"summary":"全体の2-3文の評価","strengths":["良かった点1","良かった点2"],"improvements":["改善点1"],"assetBreakdown":{"nikkei":"一言コメント","sp500":"一言コメント","gold":"一言コメント","bitcoin":"一言コメント"},"growthNote":"先週比の変化や成長についてのコメント","tip":"来週に向けた具体的なアドバイス1つ"}

注意: assetBreakdownには今週予測した銘柄のみ含めてください。予測していない銘柄は含めないでください。`,
        },
      ],
    });

    // レスポンスパース
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'AI応答のパースに失敗しました' }, { status: 500 });
    }

    const report = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      report: {
        weekLabel,
        ...report,
      },
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    return NextResponse.json(
      { success: false, error: 'レポート生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

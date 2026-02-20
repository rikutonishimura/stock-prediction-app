/**
 * ニュースAI分析キャッシュ読み取りAPI
 *
 * Supabaseに保存されたAI分析結果を返します。
 * Cronジョブが定期的にキャッシュを更新します。
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('news_analysis_cache')
      .select('analysis_data, checkpoint, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: true,
        items: [],
        checkpoint: null,
        timestamp: new Date().toISOString(),
        analysisTimestamp: null,
      });
    }

    return NextResponse.json({
      success: true,
      items: data.analysis_data,
      checkpoint: data.checkpoint,
      timestamp: new Date().toISOString(),
      analysisTimestamp: data.created_at,
    });
  } catch (error) {
    console.error('News analysis cache read error:', error);
    return NextResponse.json({
      success: true,
      items: [],
      checkpoint: null,
      timestamp: new Date().toISOString(),
      analysisTimestamp: null,
    });
  }
}

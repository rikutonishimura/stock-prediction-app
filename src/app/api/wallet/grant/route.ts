/**
 * ウォレット付与API
 * - 初回登録: 100,000pt（一度のみ）
 * - デイリーログインボーナス: 1,000pt/日
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INITIAL_POINTS = 100000;
const LOGIN_BONUS = 1000;

export async function POST() {
  try {
    // セッションからユーザーを取得
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 今日の日付（日本時間）
    const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = jstDate.toISOString().split('T')[0];

    // ウォレット取得
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const granted = { initial: 0, login: 0 };

    if (!wallet) {
      // 初回: ウォレット作成 + 初回ボーナス
      await supabaseAdmin.from('wallets').insert({
        user_id: user.id,
        balance: INITIAL_POINTS,
        initial_grant_done: true,
        last_login_bonus_date: todayStr,
      });
      await supabaseAdmin.from('point_transactions').insert({
        user_id: user.id,
        type: 'initial',
        amount: INITIAL_POINTS,
        description: '初回登録ボーナス',
      });
      granted.initial = INITIAL_POINTS;
      return NextResponse.json({ granted, balance: INITIAL_POINTS });
    }

    let newBalance = wallet.balance;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // 初回付与が未完了の場合
    if (!wallet.initial_grant_done) {
      newBalance += INITIAL_POINTS;
      updates.initial_grant_done = true;
      await supabaseAdmin.from('point_transactions').insert({
        user_id: user.id,
        type: 'initial',
        amount: INITIAL_POINTS,
        description: '初回登録ボーナス',
      });
      granted.initial = INITIAL_POINTS;
    }

    // デイリーログインボーナス（今日まだもらっていない場合）
    if (wallet.last_login_bonus_date !== todayStr) {
      newBalance += LOGIN_BONUS;
      updates.last_login_bonus_date = todayStr;
      await supabaseAdmin.from('point_transactions').insert({
        user_id: user.id,
        type: 'login_bonus',
        amount: LOGIN_BONUS,
        description: 'デイリーログインボーナス',
      });
      granted.login = LOGIN_BONUS;
    }

    if (granted.initial > 0 || granted.login > 0) {
      updates.balance = newBalance;
      await supabaseAdmin.from('wallets').update(updates).eq('user_id', user.id);
    }

    return NextResponse.json({ granted, balance: newBalance });
  } catch (error) {
    console.error('Wallet grant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

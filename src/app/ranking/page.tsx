/**
 * ランキングページ
 *
 * 全ユーザーの予測精度ランキングを表示します。
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RankingPanel, StockTicker, ThemeToggle, UserMenu } from '@/components';
import { useStock } from '@/hooks/useStock';
import { useAuth } from '@/hooks/useAuth';

export default function RankingPage() {
  const { data: stockData } = useStock();
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // 未ログイン時はログインページにリダイレクト
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // 認証確認中またはリダイレクト中はローディング表示
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100 main-bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100 main-bg-dark">
      {/* ヘッダー + ティッカー固定エリア */}
      <div className="sticky top-0 z-50">
        {/* ヘッダー */}
        <header className="bg-white dark:bg-slate-800 shadow-sm">
          <div className="w-full px-4 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">株価予測トレーニング</h1>
              <div className="flex items-center gap-6">
                <nav className="flex gap-4">
                  <Link
                    href="/"
                    className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white"
                  >
                    ホーム
                  </Link>
                  <Link
                    href="/history"
                    className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white"
                  >
                    履歴
                  </Link>
                  <Link
                    href="/ranking"
                    className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    ランキング
                  </Link>
                </nav>
                <ThemeToggle />
                {authLoading ? (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                ) : user ? (
                  <UserMenu
                    name={profile?.name || user.email?.split('@')[0] || 'User'}
                    email={user.email || ''}
                    onSignOut={handleSignOut}
                    onUpdateName={updateProfile}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* 株価ティッカー */}
        <StockTicker
          nikkeiPrice={stockData?.nikkei?.price}
          nikkeiChange={stockData?.nikkei?.changePercent}
          sp500Price={stockData?.sp500?.price}
          sp500Change={stockData?.sp500?.changePercent}
        />
      </div>

      <main className="w-full px-4 lg:px-8 py-8">
        <RankingPanel />
      </main>

      {/* フッター */}
      <footer className="bg-white dark:bg-slate-800 border-t dark:border-slate-700 mt-8">
        <div className="w-full px-4 lg:px-8 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          株価予測トレーニングアプリ - 学習目的専用
        </div>
      </footer>
    </div>
  );
}

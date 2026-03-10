'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PortfolioPanel } from '@/components/PortfolioPanel';
import { StockTicker, ThemeToggle, UserMenu } from '@/components';
import { useStock } from '@/hooks/useStock';
import { useAuth } from '@/hooks/useAuth';

export default function UserPortfolioPage() {
  const { data: stockData } = useStock();
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const targetUserId = params.userId as string;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // 自分のページなら自分のポートフォリオにリダイレクト
  useEffect(() => {
    if (user && targetUserId === user.id) router.replace('/portfolio');
  }, [user, targetUserId, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100 main-bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100 main-bg-dark">
      <div className="sticky top-0 z-50">
        <header className="bg-white dark:bg-slate-800 shadow-sm">
          <div className="w-full px-4 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">株価予測トレーニング</h1>
              <div className="flex items-center gap-6">
                <nav className="flex gap-4">
                  <Link href="/" className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white">ホーム</Link>
                  <Link href="/history" className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white">履歴</Link>
                  <Link href="/ranking" className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white">ランキング</Link>
                  <Link href="/portfolio" className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white">ポートフォリオ</Link>
                </nav>
                <ThemeToggle />
                {user && (
                  <UserMenu
                    name={profile?.name || user.email?.split('@')[0] || 'User'}
                    email={user.email || ''}
                    onSignOut={async () => { await signOut(); router.push('/login'); }}
                    onUpdateName={updateProfile}
                  />
                )}
              </div>
            </div>
          </div>
        </header>
        <StockTicker
          nikkeiPrice={stockData?.nikkei?.price}
          nikkeiChange={stockData?.nikkei?.changePercent}
          sp500Price={stockData?.sp500?.price}
          sp500Change={stockData?.sp500?.changePercent}
          goldPrice={stockData?.gold?.price}
          goldChange={stockData?.gold?.changePercent}
          bitcoinPrice={stockData?.bitcoin?.price}
          bitcoinChange={stockData?.bitcoin?.changePercent}
        />
      </div>

      <main className="w-full px-4 lg:px-8 py-8 max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/ranking" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← ランキングに戻る
          </Link>
        </div>
        <PortfolioPanel stockData={stockData} readOnly userId={targetUserId} />
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t dark:border-slate-700 mt-8">
        <div className="w-full px-4 lg:px-8 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          株価予測トレーニングアプリ - 学習目的専用
        </div>
      </footer>
    </div>
  );
}

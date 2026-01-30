/**
 * ランキングページ
 *
 * 全ユーザーの予測精度ランキングを表示します。
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RankingPanel, ThemeToggle, UserMenu } from '@/components';
import { useAuth } from '@/hooks/useAuth';

export default function RankingPage() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                />
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  ログイン
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <RankingPanel />
      </main>

      {/* フッター */}
      <footer className="bg-white dark:bg-slate-800 border-t dark:border-slate-700 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          株価予測トレーニングアプリ - 学習目的専用
        </div>
      </footer>
    </div>
  );
}

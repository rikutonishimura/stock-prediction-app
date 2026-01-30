/**
 * 履歴ページ
 *
 * 過去の予想一覧と詳細な統計を表示します。
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HistoryTable, StatsPanel, ThemeToggle, UserMenu } from '@/components';
import { usePredictions } from '@/hooks/usePredictions';
import { useAuth } from '@/hooks/useAuth';

export default function HistoryPage() {
  const { predictions, stats, remove, edit, refresh } = usePredictions();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    refresh();
  };

  const handleEdit = async (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => {
    await edit(id, updates);
    refresh();
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
                  className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300"
                >
                  履歴
                </Link>
                <Link
                  href="/ranking"
                  className="text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white"
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
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ログイン
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">予想履歴・統計</h2>

        <div className="space-y-8">
          {/* 統計パネル */}
          <StatsPanel stats={stats} />

          {/* 履歴テーブル */}
          <HistoryTable predictions={predictions} onDelete={handleDelete} onEdit={handleEdit} />
        </div>
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

/**
 * 履歴ページ
 *
 * 過去の予想一覧と詳細な統計を表示します。
 */

'use client';

import Link from 'next/link';
import { HistoryTable, StatsPanel } from '@/components';
import { usePredictions } from '@/hooks/usePredictions';

export default function HistoryPage() {
  const { predictions, stats, remove, edit, refresh } = usePredictions();

  const handleDelete = (id: string) => {
    remove(id);
    refresh();
  };

  const handleEdit = (
    id: string,
    updates: {
      nikkei?: { predictedChange?: number; actualChange?: number | null };
      sp500?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => {
    edit(id, updates);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">株価予測トレーニング</h1>
            <nav className="flex gap-4">
              <Link
                href="/"
                className="text-gray-600 font-medium hover:text-gray-800"
              >
                ホーム
              </Link>
              <Link
                href="/history"
                className="text-blue-600 font-medium hover:text-blue-800"
              >
                履歴
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">予想履歴・統計</h2>

        <div className="space-y-8">
          {/* 統計パネル */}
          <StatsPanel stats={stats} />

          {/* 履歴テーブル */}
          <HistoryTable predictions={predictions} onDelete={handleDelete} onEdit={handleEdit} />
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          株価予測トレーニングアプリ - 学習目的専用
        </div>
      </footer>
    </div>
  );
}

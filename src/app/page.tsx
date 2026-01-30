/**
 * メインページ
 *
 * 予想入力と本日の結果を表示するホーム画面です。
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PredictionForm, ResultCard, StatsPanel, NewsList, StockTicker, StockChart } from '@/components';
import { useStock } from '@/hooks/useStock';
import { usePredictions } from '@/hooks/usePredictions';
import { useNews } from '@/hooks/useNews';
import { useAuth } from '@/hooks/useAuth';
import type { PredictionInput } from '@/types';

export default function Home() {
  const { data: stockData, loading: stockLoading, error: stockError, refetch } = useStock();
  const { predictions, todayPrediction, stats, add, updateResult, edit, refresh } = usePredictions({ stockData });
  const [activeTab, setActiveTab] = useState<'predict' | 'stats'>('predict');
  const { items: japanNews, loading: japanNewsLoading, error: japanNewsError, refetch: refetchJapanNews } = useNews('japan');
  const { items: usNews, loading: usNewsLoading, error: usNewsError, refetch: refetchUsNews } = useNews('us');
  const { profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSubmit = async (input: PredictionInput) => {
    await add(input);
    refresh();
  };

  const handleUpdateResult = async (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
    }
  ) => {
    await updateResult(id, results);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="w-full px-4 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">株価予測トレーニング</h1>
            <div className="flex items-center gap-6">
              <nav className="flex gap-4">
                <Link
                  href="/"
                  className="text-blue-600 font-medium hover:text-blue-800"
                >
                  ホーム
                </Link>
                <Link
                  href="/history"
                  className="text-gray-600 font-medium hover:text-gray-800"
                >
                  履歴
                </Link>
              </nav>
              {!authLoading && profile && (
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <span className="text-sm text-gray-600">
                    {profile.name} さん
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ログアウト
                  </button>
                </div>
              )}
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

      <main className="w-full px-4 lg:px-8 py-8">
        {/* 3カラムグリッドレイアウト: 左1 : 中央1.5 : 右1 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] xl:grid-cols-[1fr_1.5fr_1fr] gap-6">
          {/* 左側：米国経済ニュース（xl以上で表示） */}
          <div className="hidden xl:block order-1">
            <div className="sticky top-4 h-[calc(100vh-8rem)]">
              <NewsList
                items={usNews}
                loading={usNewsLoading}
                error={usNewsError}
                category="us"
                onRefresh={refetchUsNews}
              />
            </div>
          </div>

          {/* 中央：メインコンテンツ */}
          <div className="order-2 lg:order-2">
            {/* 日付表示 */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">今日の日付</div>
                  <div className="text-lg font-semibold">
                    {new Date().toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </div>
                </div>
                <button
                  onClick={refetch}
                  disabled={stockLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                >
                  {stockLoading ? '更新中...' : '株価を更新'}
                </button>
              </div>
              {stockError && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  株価の取得に失敗しました: {stockError}
                </div>
              )}
            </div>

            {/* 株価チャート */}
            <div className="mb-6">
              <StockChart />
            </div>

            {/* タブ切り替え */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('predict')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'predict'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                予想入力
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                統計
              </button>
            </div>

            {/* コンテンツ */}
            {activeTab === 'predict' ? (
              <div className="space-y-6">
                {/* 予想入力フォーム */}
                <PredictionForm
                  stockData={stockData}
                  onSubmit={handleSubmit}
                  disabled={!!todayPrediction}
                />

                {/* 今日の予想結果 */}
                {todayPrediction && (
                  <ResultCard
                    prediction={todayPrediction}
                    stockData={stockData}
                    onUpdateResult={handleUpdateResult}
                    onEdit={handleEdit}
                  />
                )}

                {/* 最近の予想（未確定のもの） */}
                {predictions
                  .filter(p => p.confirmedAt === null && p.id !== todayPrediction?.id)
                  .slice(0, 3)
                  .map(prediction => (
                    <ResultCard
                      key={prediction.id}
                      prediction={prediction}
                      stockData={stockData}
                      onUpdateResult={handleUpdateResult}
                      onEdit={handleEdit}
                    />
                  ))}
              </div>
            ) : (
              <StatsPanel stats={stats} />
            )}

            {/* クイック情報 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">使い方</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>朝、予想変化率を入力して「予想を登録」をクリック</li>
                <li>市場終了後、「結果を確定」ボタンで実際の値を記録</li>
                <li>統計タブで乖離の推移を確認し、予測精度を改善</li>
              </ol>
            </div>
          </div>

          {/* 右側：日本経済ニュース（lg以上で表示） */}
          <div className="hidden lg:block order-3">
            <div className="sticky top-4 h-[calc(100vh-8rem)]">
              <NewsList
                items={japanNews}
                loading={japanNewsLoading}
                error={japanNewsError}
                category="japan"
                onRefresh={refetchJapanNews}
              />
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-8">
        <div className="w-full px-4 lg:px-8 py-4 text-center text-sm text-gray-500">
          株価予測トレーニングアプリ - 学習目的専用
        </div>
      </footer>
    </div>
  );
}

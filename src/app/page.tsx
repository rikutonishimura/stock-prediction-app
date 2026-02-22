/**
 * メインページ
 *
 * 予想入力と本日の結果を表示するホーム画面です。
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PredictionForm, ResultCard, StatsPanel, NewsList, StockTicker, StockChart, ThemeToggle, UserMenu, CheckpointPanel } from '@/components';
import { useStock } from '@/hooks/useStock';
import { usePredictions } from '@/hooks/usePredictions';
import { useNews } from '@/hooks/useNews';
import { useNewsAnalysis } from '@/hooks/useNewsAnalysis';
import { useAuth } from '@/hooks/useAuth';
import type { PredictionInput } from '@/types';

export default function Home() {
  const { data: stockData, loading: stockLoading, error: stockError, refetch } = useStock();
  const { predictions, todayPrediction, stats, add, updateResult, edit, saveComment, refresh } = usePredictions({ stockData });
  const [activeTab, setActiveTab] = useState<'predict' | 'stats'>('predict');
  const { items: japanNews, loading: japanNewsLoading, error: japanNewsError, refetch: refetchJapanNews } = useNews('japan');
  const { items: usNews, loading: usNewsLoading, error: usNewsError, refetch: refetchUsNews } = useNews('us');
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const { japanItems: analyzedJapanNews, usItems: analyzedUsNews, checkpoint, analysisTimestamp, loading: analysisLoading } = useNewsAnalysis(japanNews, usNews);
  const router = useRouter();

  // 未ログイン時はログインページにリダイレクト
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

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

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSubmit = async (input: PredictionInput) => {
    const result = await add(input);
    if (!result) {
      throw new Error('予想の登録に失敗しました。コンソールで詳細を確認してください。');
    }
  };

  const handleUpdateResult = async (
    id: string,
    results: {
      nikkei?: { actualChange: number };
      sp500?: { actualChange: number };
      gold?: { actualChange: number };
      bitcoin?: { actualChange: number };
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
      gold?: { predictedChange?: number; actualChange?: number | null };
      bitcoin?: { predictedChange?: number; actualChange?: number | null };
    }
  ) => {
    await edit(id, updates);
    refresh();
  };

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
                    className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300"
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
          goldPrice={stockData?.gold?.price}
          goldChange={stockData?.gold?.changePercent}
          bitcoinPrice={stockData?.bitcoin?.price}
          bitcoinChange={stockData?.bitcoin?.changePercent}
        />
      </div>

      <main className="w-full px-4 lg:px-8 py-8">
        {/* 3カラムグリッドレイアウト: 左1 : 中央1.5 : 右1 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] xl:grid-cols-[1fr_1.5fr_1fr] gap-6">
          {/* 左側：米国経済ニュース（xl以上で表示） */}
          <div className="hidden xl:block order-1">
            <div className="sticky top-[6.5rem] h-[calc(100vh-10rem)]">
              <NewsList
                items={analyzedUsNews}
                loading={usNewsLoading}
                error={usNewsError}
                category="us"
                onRefresh={refetchUsNews}
              />
            </div>
          </div>

          {/* 中央：メインコンテンツ */}
          <div className="order-2 lg:order-2">
            {/* 使い方 */}
            <div className="p-4 bg-blue-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg mb-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-blue-800 dark:text-green-400">使い方</h3>
                <button
                  onClick={refetch}
                  disabled={stockLoading}
                  className="px-4 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors text-sm border border-gray-200 dark:border-slate-600"
                >
                  {stockLoading ? '更新中...' : '株価を更新'}
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-gray-200">
                <li>市場調査：左右のニュースやチャートから、今日の米国・日本市場の終値を予想する</li>
                <li>予想登録：本日の予想終値を入力し、「予想を登録」ボタンをクリック</li>
                <li>精度向上：統計・履歴タブで、実績との乖離を確認して予測の癖を改善する</li>
                <li>他者比較：ランキングで他の参加者の予想を参考にし、自身の精度を比較する</li>
              </ol>
            </div>

            {stockError && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
                株価の取得に失敗しました: {stockError}
              </div>
            )}

            {/* 株価チャート */}
            <div className="mb-6">
              <StockChart />
            </div>

            {/* 今日のチェックポイント */}
            <CheckpointPanel
              checkpoint={checkpoint}
              analysisTimestamp={analysisTimestamp}
              loading={analysisLoading}
            />

            {/* タブ切り替え */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('predict')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'predict'
                    ? 'bg-blue-600 text-white active-tab-btn'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                予想入力
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white active-tab-btn'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
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
                    onSaveComment={saveComment}
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
                      onSaveComment={saveComment}
                    />
                  ))}
              </div>
            ) : (
              <StatsPanel stats={stats} />
            )}

          </div>

          {/* 右側：日本経済ニュース（lg以上で表示） */}
          <div className="hidden lg:block order-3">
            <div className="sticky top-[6.5rem] h-[calc(100vh-10rem)]">
              <NewsList
                items={analyzedJapanNews}
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
      <footer className="bg-white dark:bg-slate-800 border-t dark:border-slate-700 mt-8">
        <div className="w-full px-4 lg:px-8 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          株価予測トレーニングアプリ - 学習目的専用
        </div>
      </footer>
    </div>
  );
}

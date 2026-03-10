'use client';

import Link from 'next/link';
import { usePointRanking } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';

const SYMBOL_LABELS: Record<string, string> = {
  nikkei: '日経',
  sp500: 'S&P',
  gold: '金',
  bitcoin: 'BTC',
};

export function PointRankingPanel() {
  const { ranking, loading, error, refetch } = usePointRanking();
  const { user } = useAuth();

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
        <button onClick={refetch} className="mt-2 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">再読み込み</button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">ポイントランキング</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">総資産（現金＋保有時価）順</p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 text-sm"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3 mt-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-700 rounded" />)}
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">まだデータがありません</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-300 w-12">順位</th>
                <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">ユーザー</th>
                <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">総資産</th>
                <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">現金</th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">保有銘柄</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((u, i) => {
                const rank = i + 1;
                const medal = getMedal(rank);
                const isMe = user?.id === u.userId;
                return (
                  <tr
                    key={u.userId}
                    className={`border-b border-gray-100 dark:border-slate-700 ${isMe ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                  >
                    <td className="py-3 px-2 text-center">
                      {medal ? <span className="text-lg">{medal}</span> : <span className="text-gray-500 dark:text-gray-400 font-medium">{rank}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <Link
                        href={`/portfolio/${u.userId}`}
                        className={`font-medium hover:underline ${isMe ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'}`}
                      >
                        {u.userName}
                        {isMe && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">あなた</span>}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-gray-800 dark:text-white">
                      {u.totalAssets.toLocaleString()} pt
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-500 dark:text-gray-400 text-sm">
                      {u.balance.toLocaleString()} pt
                    </td>
                    <td className="py-3 px-3 text-center">
                      {u.holdings.length === 0 ? (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">なし</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {u.holdings.map(h => (
                            <span key={h.symbol} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {SYMBOL_LABELS[h.symbol]}: {h.currentValue.toLocaleString()}pt
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

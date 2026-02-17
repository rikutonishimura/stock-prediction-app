/**
 * ランキングパネルコンポーネント
 *
 * 予測精度ランキングを表示します。
 */

'use client';

import { useRanking, RankingUser, RegisteredUser } from '@/hooks/useRanking';
import { formatNumber } from '@/lib/stats';
import { useAuth } from '@/hooks/useAuth';

interface RankingRowProps {
  rank: number;
  user: RankingUser;
  isCurrentUser: boolean;
}

function RankingRow({ rank, user, isCurrentUser }: RankingRowProps) {
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const medal = getMedalEmoji(rank);

  return (
    <tr
      className={`border-b border-gray-100 dark:border-slate-700 ${
        isCurrentUser
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-slate-700'
      }`}
    >
      <td className="py-3 px-3 text-center">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 font-medium">{rank}</span>
        )}
      </td>
      <td className="py-3 px-3">
        <span className={`font-medium ${isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
          {user.userName}
          {isCurrentUser && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
              あなた
            </span>
          )}
        </span>
      </td>
      <td className="py-3 px-3 text-right font-mono">
        <span
          className={`font-semibold ${
            user.averageDeviation <= 0.5
              ? 'text-green-600 dark:text-green-400'
              : user.averageDeviation <= 1.0
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatNumber(user.averageDeviation)}
        </span>
      </td>
      <td className="py-3 px-3 text-right font-mono dark:text-gray-300">
        {formatNumber(user.directionAccuracy)}%
      </td>
      <td className="py-3 px-3 text-right text-gray-500 dark:text-gray-400">
        {user.confirmedPredictions}回
      </td>
      <td className="py-3 px-3 text-center">
        {user.latestPrediction ? (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className={`font-mono ${
              user.latestPrediction.nikkeiPredictedChange != null && user.latestPrediction.nikkeiPredictedChange >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              日経: {user.latestPrediction.nikkeiPredictedChange != null
                ? `${user.latestPrediction.nikkeiPredictedChange >= 0 ? '+' : ''}${user.latestPrediction.nikkeiPredictedChange.toFixed(2)}%`
                : '-'}
            </span>
            <span className={`font-mono ${
              user.latestPrediction.sp500PredictedChange != null && user.latestPrediction.sp500PredictedChange >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              S&P: {user.latestPrediction.sp500PredictedChange != null
                ? `${user.latestPrediction.sp500PredictedChange >= 0 ? '+' : ''}${user.latestPrediction.sp500PredictedChange.toFixed(2)}%`
                : '-'}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">未入力</span>
        )}
      </td>
    </tr>
  );
}

export function RankingPanel() {
  const { rankings, totalUsers, registeredUsers, loading, error, refetch } = useRanking();
  const { user } = useAuth();

  // 日付をフォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">予測精度ランキング</h3>
        <div className="text-red-600 dark:text-red-400 text-center py-4">{error}</div>
        <button
          onClick={refetch}
          className="mt-2 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">予測精度ランキング</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            平均乖離が小さいほど精度が高い
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors text-sm"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded"></div>
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          まだランキングデータがありません
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-600">
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300 w-16">
                    順位
                  </th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    ユーザー
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    平均乖離
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    方向正答率
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    予想回数
                  </th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    本日の予想
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((rankingUser, index) => (
                  <RankingRow
                    key={rankingUser.userId}
                    rank={index + 1}
                    user={rankingUser}
                    isCurrentUser={user?.id === rankingUser.userId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
            参加者: {totalUsers}人
          </div>

          {/* 凡例 */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h4 className="font-semibold text-gray-700 dark:text-gray-400 mb-2 text-sm">乖離の目安</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600 dark:text-gray-400">0.5以下: 優秀</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="text-gray-600 dark:text-gray-400">0.5-1.0: 普通</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-gray-600 dark:text-gray-400">1.0以上: 要改善</span>
              </div>
            </div>
          </div>

          {/* 登録ユーザー一覧 */}
          {registeredUsers.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                登録ユーザー一覧
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({registeredUsers.length}人)
                </span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {registeredUsers.map((regUser) => (
                  <div
                    key={regUser.id}
                    className={`p-3 rounded-lg border ${
                      user?.id === regUser.id
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        user?.id === regUser.id ? 'bg-blue-600' : 'bg-gray-500 dark:bg-slate-500'
                      }`}>
                        {regUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${
                          user?.id === regUser.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'
                        }`}>
                          {regUser.name}
                          {user?.id === regUser.id && (
                            <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              あなた
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          登録: {formatDate(regUser.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

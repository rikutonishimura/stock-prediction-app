/**
 * ランキングパネルコンポーネント
 *
 * 予測精度ランキングを表示します。
 */

'use client';

import { useRanking, RankingUser, RegisteredUser, RankingPeriod } from '@/hooks/useRanking';
import { formatNumber, getRankingDeviationColorClass, DEVIATION_THRESHOLDS } from '@/lib/stats';
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
          className={`font-semibold ${getRankingDeviationColorClass(user.averageDeviation)}`}
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
            {([
              ['nikkeiPredictedChange', '日経'] as const,
              ['sp500PredictedChange', 'S&P'] as const,
              ['goldPredictedChange', '金'] as const,
              ['bitcoinPredictedChange', 'BTC'] as const,
            ]).map(([key, label]) => {
              const val = user.latestPrediction![key as keyof typeof user.latestPrediction] as number | null;
              if (val == null) return null;
              return (
                <span key={key} className={`font-mono ${val >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {label}: {val >= 0 ? '+' : ''}{val.toFixed(2)}%
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">未入力</span>
        )}
      </td>
      <td className="py-3 px-3 text-center">
        {user.latestPrediction ? (
          <div className="flex flex-col gap-0.5 text-xs">
            {([
              ['nikkeiPredictedChange', 'nikkeiActualChange', '日経'] as const,
              ['sp500PredictedChange', 'sp500ActualChange', 'S&P'] as const,
              ['goldPredictedChange', 'goldActualChange', '金'] as const,
              ['bitcoinPredictedChange', 'bitcoinActualChange', 'BTC'] as const,
            ]).map(([predictedKey, actualKey, label]) => {
              const predicted = user.latestPrediction![predictedKey as keyof typeof user.latestPrediction] as number | null;
              if (predicted == null) return null;
              const actual = user.latestPrediction![actualKey as keyof typeof user.latestPrediction] as number | null;
              if (actual == null) {
                return (
                  <span key={actualKey} className="font-mono text-gray-400 dark:text-gray-500">
                    {label}: ---
                  </span>
                );
              }
              return (
                <span key={actualKey} className={`font-mono ${actual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {label}: {actual >= 0 ? '+' : ''}{actual.toFixed(2)}%
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
        )}
      </td>
    </tr>
  );
}

export function RankingPanel() {
  const { rankings, totalUsers, registeredUsers, loading, error, period, setPeriod, refetch } = useRanking();
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
      <div className="flex justify-between items-center mb-4">
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

      {/* 期間切り替えタブ */}
      <div className="flex items-center gap-2 mb-6">
        {([
          ['all', '累計'] as const,
          ['weekly', '週次'] as const,
        ]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === value
                ? 'bg-blue-600 text-white active-tab-btn'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
        {period === 'weekly' && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {(() => {
              const now = new Date();
              const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
              const day = jst.getUTCDay();
              const diff = day === 0 ? 6 : day - 1;
              const monday = new Date(jst);
              monday.setUTCDate(monday.getUTCDate() - diff);
              const sunday = new Date(monday);
              sunday.setUTCDate(sunday.getUTCDate() + 6);
              const fmt = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
              return `${fmt(monday)}（月）〜 ${fmt(sunday)}（日）`;
            })()}
          </span>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded"></div>
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {period === 'weekly' ? '今週の確定済みデータがまだありません' : 'まだランキングデータがありません'}
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
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    本日の結果
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
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h4 className="font-semibold text-gray-700 dark:text-gray-400 mb-2 text-sm">乖離の目安（銘柄別）</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th className="text-left py-1 pr-2"></th>
                  <th className="py-1 px-1"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>優秀</span></th>
                  <th className="py-1 px-1"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>普通</span></th>
                  <th className="py-1 px-1"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>要改善</span></th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-400">
                {([['日経', 'nikkei'], ['S&P', 'sp500'], ['金', 'gold'], ['BTC', 'bitcoin']] as const).map(([label, sym]) => {
                  const t = DEVIATION_THRESHOLDS[sym];
                  return (
                    <tr key={sym}>
                      <td className="py-0.5 pr-2 font-medium">{label}</td>
                      <td className="py-0.5 px-1 text-center text-green-600 dark:text-green-400">{t.good}以下</td>
                      <td className="py-0.5 px-1 text-center text-yellow-600 dark:text-yellow-400">{t.good}~{t.fair}</td>
                      <td className="py-0.5 px-1 text-center text-red-600 dark:text-red-400">{t.fair}超</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

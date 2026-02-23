/**
 * ニュース一覧コンポーネント
 *
 * 経済ニュースの一覧を表示します。
 */

'use client';

import type { NewsItem, NewsCategory, NewsTag } from '@/types';

const TAG_COLORS: Record<NewsTag, string> = {
  '金融政策': 'bg-purple-200 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200',
  '企業業績': 'bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-200',
  '経済指標': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  '地政学': 'bg-orange-200 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200',
};

interface NewsListProps {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  category: NewsCategory;
  onRefresh: () => void;
}

/**
 * 相対時間を表示用に変換
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  }
}

const CATEGORY_LABELS: Record<NewsCategory, { title: string; color: string; bgClass: string }> = {
  japan: { title: '日本経済ニュース', color: 'text-red-600 dark:text-red-400', bgClass: 'news-header-japan' },
  us: { title: '米国経済ニュース', color: 'text-blue-600 dark:text-blue-400', bgClass: 'news-header-us' },
};

export function NewsList({ items, loading, error, category, onRefresh }: NewsListProps) {
  const { title, color, bgClass } = CATEGORY_LABELS[category];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md h-full flex flex-col">
      {/* ヘッダー */}
      <div className={`p-4 border-b dark:border-[#444] flex justify-between items-center flex-shrink-0 ${bgClass}`}>
        <div>
          <h2 className={`font-bold ${color}`}>{title}</h2>
          <span className="text-xs text-gray-400">{items.length}件</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>

      {/* コンテンツ - スクロール可能 */}
      <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin">
        {error && (
          <div className="p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30">
            ニュースの取得に失敗しました
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            ニュースがありません
          </div>
        )}

        <ul className="divide-y divide-gray-100 dark:divide-[#444]">
          {items.map((item) => (
            <li key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3"
              >
                {/* AIタグ行 */}
                {item.tag && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TAG_COLORS[item.tag]}`}>
                      {item.tag}
                    </span>
                    {item.importance && (
                      <span className="text-yellow-500 text-[10px]">
                        {'★'.repeat(item.importance)}{'☆'.repeat(3 - item.importance)}
                      </span>
                    )}
                    {item.sentiment && (
                      <span className={`text-xs font-bold ${
                        item.sentiment === 'bullish'
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-blue-500 dark:text-blue-400'
                      }`}>
                        {item.sentiment === 'bullish' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                )}
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400">
                  {item.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate max-w-[120px]">{item.source}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(item.publishedAt)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

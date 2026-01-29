/**
 * ニュース一覧コンポーネント
 *
 * 経済ニュースの一覧を表示します。
 */

'use client';

import type { NewsItem, NewsCategory } from '@/types';

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

const CATEGORY_LABELS: Record<NewsCategory, { title: string; color: string }> = {
  japan: { title: '日本経済ニュース', color: 'text-red-600' },
  us: { title: '米国経済ニュース', color: 'text-blue-600' },
};

export function NewsList({ items, loading, error, category, onRefresh }: NewsListProps) {
  const { title, color } = CATEGORY_LABELS[category];

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className={`font-bold ${color}`}>{title}</h2>
          <span className="text-xs text-gray-400">{items.length}件</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>

      {/* コンテンツ - スクロール可能 */}
      <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50">
            ニュースの取得に失敗しました
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="p-4 text-center text-gray-500 text-sm">
            ニュースがありません
          </div>
        )}

        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="hover:bg-gray-50 transition-colors">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3"
              >
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600">
                  {item.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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

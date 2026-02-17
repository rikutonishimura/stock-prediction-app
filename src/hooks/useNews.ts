/**
 * ニュース取得用カスタムフック
 *
 * 指定されたカテゴリの経済ニュースを取得します。
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, NewsCategory } from '@/types';

interface UseNewsResult {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNews(category: NewsCategory): UseNewsResult {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/news?category=${category}`, { signal });
      if (signal?.aborted) return;
      const data = await response.json();
      if (signal?.aborted) return;

      if (data.success) {
        setItems(data.items);
      } else {
        setError(data.error || 'Failed to fetch news');
      }
      setLoading(false);
    } catch (err) {
      // AbortErrorは無視（コンポーネントのアンマウント時など）
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (signal?.aborted) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    fetchNews(controller.signal);
    return () => controller.abort('component unmounted');
  }, [fetchNews]);

  return {
    items,
    loading,
    error,
    refetch: () => fetchNews(),
  };
}

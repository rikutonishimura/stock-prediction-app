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
      const data = await response.json();

      if (data.success) {
        setItems(data.items);
      } else {
        setError(data.error || 'Failed to fetch news');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    fetchNews(controller.signal);
    return () => controller.abort();
  }, [fetchNews]);

  return {
    items,
    loading,
    error,
    refetch: fetchNews,
  };
}

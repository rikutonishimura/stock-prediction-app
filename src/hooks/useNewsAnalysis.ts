/**
 * ニュースAI分析フック
 *
 * Supabaseにキャッシュされた分析結果を取得し、ニュースアイテムにマージします。
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, NewsTag, NewsSentiment, NewsImportance } from '@/types';

interface AnalysisCacheItem {
  id: string;
  title: string;
  category: string;
  tag: NewsTag;
  sentiment: NewsSentiment;
  importance: NewsImportance;
}

interface UseNewsAnalysisResult {
  japanItems: NewsItem[];
  usItems: NewsItem[];
  checkpoint: string | null;
  analysisTimestamp: string | null;
  loading: boolean;
}

function mergeAnalysis(
  items: NewsItem[],
  analysisItems: AnalysisCacheItem[],
  category: string
): NewsItem[] {
  const categoryAnalysis = analysisItems.filter(a => a.category === category);
  if (categoryAnalysis.length === 0) return items;

  const enriched = items.map(item => {
    // タイトルの部分一致でマッチング（IDは毎回変わるため）
    const match = categoryAnalysis.find(a => a.title === item.title);
    if (match) {
      return { ...item, tag: match.tag, sentiment: match.sentiment, importance: match.importance };
    }
    return item;
  });

  // 重要度順にソート（高い順、タグなしは末尾）
  return enriched.sort((a, b) => {
    const aImp = a.importance ?? 0;
    const bImp = b.importance ?? 0;
    if (aImp !== bImp) return bImp - aImp;
    return 0;
  });
}

export function useNewsAnalysis(
  japanItems: NewsItem[],
  usItems: NewsItem[]
): UseNewsAnalysisResult {
  const [analysisItems, setAnalysisItems] = useState<AnalysisCacheItem[]>([]);
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysis = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/news/analysis', { signal });
      if (signal?.aborted) return;
      const data = await response.json();
      if (signal?.aborted) return;

      if (data.success && data.items.length > 0) {
        setAnalysisItems(data.items);
        setCheckpoint(data.checkpoint);
        setAnalysisTimestamp(data.analysisTimestamp);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalysis(controller.signal);
    return () => controller.abort();
  }, [fetchAnalysis]);

  return {
    japanItems: mergeAnalysis(japanItems, analysisItems, 'japan'),
    usItems: mergeAnalysis(usItems, analysisItems, 'us'),
    checkpoint,
    analysisTimestamp,
    loading,
  };
}

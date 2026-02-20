/**
 * ランキングデータ取得用カスタムフック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export type RankingPeriod = 'all' | 'weekly';

export interface LatestPrediction {
  date: string;
  nikkeiPredictedChange: number | null;
  sp500PredictedChange: number | null;
  goldPredictedChange: number | null;
  bitcoinPredictedChange: number | null;
  nikkeiActualChange: number | null;
  sp500ActualChange: number | null;
  goldActualChange: number | null;
  bitcoinActualChange: number | null;
}

export interface RankingUser {
  userId: string;
  userName: string;
  averageDeviation: number;
  totalPredictions: number;
  confirmedPredictions: number;
  directionAccuracy: number;
  latestPrediction: LatestPrediction | null;
}

export interface RegisteredUser {
  id: string;
  name: string;
  createdAt: string;
}

interface RankingData {
  rankings: RankingUser[];
  totalUsers: number;
  registeredUsers: RegisteredUser[];
}

interface UseRankingReturn {
  rankings: RankingUser[];
  totalUsers: number;
  registeredUsers: RegisteredUser[];
  loading: boolean;
  error: string | null;
  period: RankingPeriod;
  setPeriod: (period: RankingPeriod) => void;
  refetch: () => void;
}

export function useRanking(): UseRankingReturn {
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<RankingPeriod>('all');

  const fetchRankings = useCallback(async (p: RankingPeriod, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ranking?period=${p}`, { signal });
      if (signal?.aborted) return;
      if (!response.ok) {
        throw new Error('ランキングの取得に失敗しました');
      }

      const data: RankingData = await response.json();
      if (signal?.aborted) return;
      setRankings(data.rankings);
      setTotalUsers(data.totalUsers);
      setRegisteredUsers(data.registeredUsers || []);
      setLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (signal?.aborted) {
        return;
      }
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRankings(period, controller.signal);
    return () => controller.abort('component unmounted');
  }, [fetchRankings, period]);

  return {
    rankings,
    totalUsers,
    registeredUsers,
    loading,
    error,
    period,
    setPeriod,
    refetch: () => fetchRankings(period),
  };
}

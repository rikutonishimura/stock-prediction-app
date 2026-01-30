/**
 * ランキングデータ取得用カスタムフック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LatestPrediction {
  date: string;
  nikkeiPredictedChange: number | null;
  sp500PredictedChange: number | null;
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
  refetch: () => void;
}

export function useRanking(): UseRankingReturn {
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ranking');
      if (!response.ok) {
        throw new Error('ランキングの取得に失敗しました');
      }

      const data: RankingData = await response.json();
      setRankings(data.rankings);
      setTotalUsers(data.totalUsers);
      setRegisteredUsers(data.registeredUsers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  return {
    rankings,
    totalUsers,
    registeredUsers,
    loading,
    error,
    refetch: fetchRankings,
  };
}

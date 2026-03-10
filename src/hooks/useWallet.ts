'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HoldingWithValue {
  symbol: string;
  units: number;
  avgPurchasePrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface PointTransaction {
  id: string;
  type: 'initial' | 'login_bonus' | 'prediction_bonus' | 'buy' | 'sell';
  amount: number;
  symbol: string | null;
  description: string | null;
  created_at: string;
}

export interface WalletData {
  balance: number;
  holdings: HoldingWithValue[];
  totalAssets: number;
  recentTransactions: PointTransaction[] | null;
}

export function useWallet(userId?: string) {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = userId ? `/api/wallet?userId=${userId}` : '/api/wallet';
      const res = await window.fetch(url);
      if (!res.ok) throw new Error('Failed to fetch wallet');
      const json = await res.json();
      setData(json);
    } catch {
      setError('ウォレット情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const trade = async (action: 'buy' | 'sell', symbol: string, points: number) => {
    const res = await window.fetch('/api/wallet/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, symbol, points }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '取引に失敗しました');
    await fetch();
    return json;
  };

  return { data, loading, error, refetch: fetch, trade };
}

export interface PointRankingUser {
  userId: string;
  userName: string;
  balance: number;
  holdingValue: number;
  totalAssets: number;
  holdings: { symbol: string; units: number; currentValue: number }[];
}

export function usePointRanking() {
  const [ranking, setRanking] = useState<PointRankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.fetch('/api/wallet/ranking');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setRanking(json.ranking ?? []);
    } catch {
      setError('ランキングの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { ranking, loading, error, refetch: fetch };
}

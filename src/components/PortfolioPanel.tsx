'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import type { StockQuote } from '@/types';
import { STOCK_INFO, PREDICTABLE_SYMBOLS } from '@/types';

const SYMBOL_NAMES: Record<string, string> = {
  nikkei: '日経平均',
  sp500: 'S&P500',
  gold: 'ゴールド',
  bitcoin: 'ビットコイン',
};

const TX_TYPE_LABELS: Record<string, string> = {
  initial: '初回登録ボーナス',
  login_bonus: 'ログインボーナス',
  prediction_bonus: '予想精度ボーナス',
  buy: '購入',
  sell: '売却',
};

interface PortfolioPanelProps {
  stockData?: {
    nikkei: StockQuote | null;
    sp500: StockQuote | null;
    gold: StockQuote | null;
    bitcoin: StockQuote | null;
  } | null;
  readOnly?: boolean;
  userId?: string;
}

export function PortfolioPanel({ stockData, readOnly = false, userId }: PortfolioPanelProps) {
  const { data, loading, error, refetch, trade } = useWallet(userId);
  const [tradeSymbol, setTradeSymbol] = useState<string>('nikkei');
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradePoints, setTradePoints] = useState<string>('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'trade' | 'history'>('portfolio');

  const handleTrade = async () => {
    const pts = parseInt(tradePoints);
    if (isNaN(pts) || pts < 1000) {
      setTradeError('最低1,000pt以上で取引してください');
      return;
    }
    setTradeLoading(true);
    setTradeError(null);
    setTradeSuccess(null);
    try {
      const result = await trade(tradeAction, tradeSymbol, pts);
      const label = tradeAction === 'buy' ? '購入' : '売却';
      setTradeSuccess(`${SYMBOL_NAMES[tradeSymbol]}を${pts.toLocaleString()}pt ${label}しました。残高: ${result.balance.toLocaleString()}pt`);
      setTradePoints('');
    } catch (e: unknown) {
      setTradeError(e instanceof Error ? e.message : '取引に失敗しました');
    } finally {
      setTradeLoading(false);
    }
  };

  const currentHolding = data?.holdings.find(h => h.symbol === tradeSymbol);
  const currentHoldingValue = currentHolding?.currentValue ?? 0;
  const currentPrice = stockData?.[tradeSymbol as keyof typeof stockData]?.price
    ?? currentHolding?.currentPrice
    ?? 0;
  const estimatedUnits = tradePoints && currentPrice
    ? (parseInt(tradePoints) / currentPrice).toFixed(6)
    : '---';

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-slate-700 rounded" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={refetch} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">再読み込み</button>
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const totalAssets = data?.totalAssets ?? 0;
  const holdings = data?.holdings ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      {/* 資産サマリー */}
      <div className="p-6 border-b dark:border-slate-700">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {readOnly ? 'ポートフォリオ' : 'マイポートフォリオ'}
          </h2>
          <button onClick={refetch} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            更新
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">総資産</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {totalAssets.toLocaleString()} <span className="text-sm font-normal">pt</span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">現金</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
              {balance.toLocaleString()} <span className="text-sm font-normal">pt</span>
            </div>
          </div>
        </div>
      </div>

      {/* タブ（自分のポートフォリオのみ） */}
      {!readOnly && (
        <div className="flex border-b dark:border-slate-700">
          {([['portfolio', '保有銘柄'], ['trade', '売買'], ['history', '取引履歴']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="p-6">
        {/* 保有銘柄タブ */}
        {(activeTab === 'portfolio' || readOnly) && (
          <>
            {holdings.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                保有銘柄はありません
              </div>
            ) : (
              <div className="space-y-3">
                {holdings.map(h => (
                  <div key={h.symbol} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-800 dark:text-white">{SYMBOL_NAMES[h.symbol]}</span>
                      <span className={`text-sm font-semibold ${h.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {h.profitLoss >= 0 ? '+' : ''}{h.profitLoss.toLocaleString()}pt
                        ({h.profitLossPercent >= 0 ? '+' : ''}{h.profitLossPercent.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <div>保有口数</div>
                        <div className="font-mono text-gray-700 dark:text-gray-300">{h.units.toFixed(6)}</div>
                      </div>
                      <div>
                        <div>時価評価</div>
                        <div className="font-mono text-gray-700 dark:text-gray-300">{h.currentValue.toLocaleString()}pt</div>
                      </div>
                      <div>
                        <div>取得単価</div>
                        <div className="font-mono text-gray-700 dark:text-gray-300">{h.avgPurchasePrice.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 売買タブ */}
        {activeTab === 'trade' && !readOnly && (
          <div className="space-y-4">
            {/* 銘柄選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">銘柄</label>
              <div className="flex flex-wrap gap-2">
                {PREDICTABLE_SYMBOLS.map(sym => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setTradeSymbol(sym)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      tradeSymbol === sym
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-500'
                    }`}
                  >
                    {STOCK_INFO[sym].name}
                  </button>
                ))}
              </div>
            </div>

            {/* 買い/売り切替 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">アクション</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTradeAction('buy')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tradeAction === 'buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  買い
                </button>
                <button
                  onClick={() => setTradeAction('sell')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tradeAction === 'sell'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  売り
                </button>
              </div>
            </div>

            {/* 現在情報 */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>現在の残高</span>
                <span className="font-mono">{balance.toLocaleString()} pt</span>
              </div>
              {currentHolding && (
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>保有時価</span>
                  <span className="font-mono">{currentHoldingValue.toLocaleString()} pt</span>
                </div>
              )}
              {currentPrice > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>現在価格</span>
                  <span className="font-mono">{currentPrice.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* 金額入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                金額（pt）※最低1,000pt
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={tradePoints}
                  onChange={e => setTradePoints(e.target.value)}
                  placeholder="例: 5000"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {tradeAction === 'sell' && currentHoldingValue > 0 && (
                  <button
                    onClick={() => setTradePoints(String(currentHoldingValue))}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                    全て
                  </button>
                )}
              </div>
              {tradePoints && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  約 {estimatedUnits} 口
                </div>
              )}
            </div>

            {tradeError && <p className="text-sm text-red-600 dark:text-red-400">{tradeError}</p>}
            {tradeSuccess && <p className="text-sm text-green-600 dark:text-green-400">{tradeSuccess}</p>}

            <button
              onClick={handleTrade}
              disabled={tradeLoading || !tradePoints}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                tradeAction === 'buy'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {tradeLoading ? '処理中...' : tradeAction === 'buy' ? '購入する' : '売却する'}
            </button>
          </div>
        )}

        {/* 取引履歴タブ */}
        {activeTab === 'history' && !readOnly && (
          <div className="space-y-2">
            {!data?.recentTransactions || data.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">取引履歴はありません</div>
            ) : (
              data.recentTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b dark:border-slate-700 last:border-0">
                  <div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{tx.description ?? TX_TYPE_LABELS[tx.type]}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`font-mono font-semibold text-sm ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} pt
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

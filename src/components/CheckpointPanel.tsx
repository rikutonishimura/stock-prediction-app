/**
 * 今日のチェックポイントパネル
 *
 * AIが生成した今日の市場注目ポイントを表示します。
 */

'use client';

interface CheckpointPanelProps {
  checkpoint: string | null;
  analysisTimestamp: string | null;
  loading: boolean;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CheckpointPanel({ checkpoint, analysisTimestamp, loading }: CheckpointPanelProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 checkpoint-bg-dark rounded-lg p-4 border border-amber-200 dark:border-amber-800 mb-6">
        <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-2">
          今日のチェックポイント
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-amber-200/50 dark:bg-slate-700 rounded w-full" />
          <div className="h-3 bg-amber-200/50 dark:bg-slate-700 rounded w-4/5" />
          <div className="h-3 bg-amber-200/50 dark:bg-slate-700 rounded w-3/5" />
        </div>
      </div>
    );
  }

  if (!checkpoint) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 checkpoint-bg-dark rounded-lg p-4 border border-amber-200 dark:border-amber-800 mb-6">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-amber-800 dark:text-amber-400">
          今日のチェックポイント
        </h3>
        {analysisTimestamp && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatTimestamp(analysisTimestamp)} 更新
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
        {checkpoint}
      </p>
    </div>
  );
}

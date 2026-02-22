/**
 * 株価予測アプリの型定義
 *
 * このファイルはアプリ全体で使用する型を一元管理します。
 * 新しい型を追加する際はこのファイルに追加してください。
 */

/** 対象銘柄の識別子 */
export type StockSymbol = 'nikkei' | 'sp500' | 'gold' | 'bitcoin';

/** 予想可能な銘柄一覧 */
export const PREDICTABLE_SYMBOLS: StockSymbol[] = ['nikkei', 'sp500', 'gold', 'bitcoin'];

/** 銘柄の表示情報 */
export const STOCK_INFO: Record<StockSymbol, { name: string; symbol: string; currency: string }> = {
  nikkei: { name: '日経平均', symbol: '^N225', currency: '円' },
  sp500: { name: 'S&P500', symbol: '^GSPC', currency: 'USD' },
  gold: { name: 'ゴールド', symbol: 'GC=F', currency: 'USD' },
  bitcoin: { name: 'ビットコイン', symbol: 'BTC-USD', currency: 'USD' },
};

/** 単一銘柄の予想データ */
export interface StockPrediction {
  /** 前日終値 */
  previousClose: number;
  /** 予想変化率 (%) */
  predictedChange: number;
  /** 実際の変化率 (%) - 未確定時はnull */
  actualChange: number | null;
  /** 乖離 (絶対値) - 未確定時はnull */
  deviation: number | null;
}

/** 1日分の予想レコード */
export interface PredictionRecord {
  /** ユニークID */
  id: string;
  /** 予想日 (YYYY-MM-DD形式) */
  date: string;
  /** 日経平均の予想 (未予想時はnull) */
  nikkei: StockPrediction | null;
  /** S&P500の予想 (未予想時はnull) */
  sp500: StockPrediction | null;
  /** ゴールドの予想 (未予想時はnull) */
  gold: StockPrediction | null;
  /** ビットコインの予想 (未予想時はnull) */
  bitcoin: StockPrediction | null;
  /** 振り返りコメント */
  reviewComment: string | null;
  /** 作成日時 (ISO形式) */
  createdAt: string;
  /** 結果確定日時 (ISO形式) - 未確定時はnull */
  confirmedAt: string | null;
}

/** 予想入力フォームのデータ（選択した銘柄のみ） */
export interface PredictionInput {
  nikkei?: {
    previousClose: number;
    predictedChange: number;
  };
  sp500?: {
    previousClose: number;
    predictedChange: number;
  };
  gold?: {
    previousClose: number;
    predictedChange: number;
  };
  bitcoin?: {
    previousClose: number;
    predictedChange: number;
  };
}

/** 株価APIからのレスポンス */
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

/** 統計サマリー（単一銘柄） */
export interface StockStats {
  /** 平均乖離 */
  averageDeviation: number;
  /** 最小乖離 */
  minDeviation: number;
  /** 最小乖離の日付 */
  minDeviationDate: string | null;
  /** 最大乖離 */
  maxDeviation: number;
  /** 最大乖離の日付 */
  maxDeviationDate: string | null;
  /** 標準偏差 */
  standardDeviation: number;
  /** 方向正答率 (予想の符号が合っていた率) */
  directionAccuracy: number;
  /** 総予想回数 */
  totalPredictions: number;
  /** 確定済み予想回数 */
  confirmedPredictions: number;
}

/** 全体の統計サマリー */
export interface OverallStats {
  nikkei: StockStats;
  sp500: StockStats;
  gold: StockStats;
  bitcoin: StockStats;
}

/** 日別詳細データ（テーブル表示用） */
export interface DailyDetail {
  date: string;
  predicted: number;
  actual: number | null;
  deviation: number | null;
}

/** ニュースのカテゴリ */
export type NewsCategory = 'japan' | 'us';

/** ニュースのAIカテゴリタグ */
export type NewsTag = '金融政策' | '企業業績' | '経済指標' | '地政学';

/** 市場インパクトの方向 */
export type NewsSentiment = 'bullish' | 'bearish';

/** 重要度 (1=低, 2=中, 3=高) */
export type NewsImportance = 1 | 2 | 3;

/** ニュース記事 */
export interface NewsItem {
  /** ユニークID */
  id: string;
  /** 記事タイトル */
  title: string;
  /** 記事の説明/概要 */
  description: string;
  /** 記事URL */
  url: string;
  /** 配信元 */
  source: string;
  /** 公開日時 (ISO形式) */
  publishedAt: string;
  /** カテゴリ */
  category: NewsCategory;
  /** AIカテゴリタグ (AI未実行時はundefined) */
  tag?: NewsTag;
  /** 市場インパクトの方向 (AI未実行時はundefined) */
  sentiment?: NewsSentiment;
  /** 重要度 (AI未実行時はundefined) */
  importance?: NewsImportance;
}

/** ニュースAPIのレスポンス */
export interface NewsResponse {
  success: boolean;
  items: NewsItem[];
  timestamp: string;
}

/** AI分析APIのレスポンス */
export interface NewsAnalysisResponse {
  success: boolean;
  items: Array<{
    id: string;
    tag: NewsTag;
    sentiment: NewsSentiment;
    importance: NewsImportance;
  }>;
  checkpoint: string | null;
  timestamp: string;
}

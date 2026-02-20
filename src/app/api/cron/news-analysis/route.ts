/**
 * ニュースAI分析 Cronルート
 *
 * Vercel Cronで定期実行され、ニュースをAIで分類・分析してSupabaseにキャッシュします。
 * スケジュール: 毎日 7:00, 12:00, 19:00 JST
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { NewsItem, NewsCategory, NewsTag, NewsSentiment, NewsImportance } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// RSSフィードのURL（news/route.tsと同じ）
const RSS_FEEDS: Record<NewsCategory, string> = {
  japan: 'https://news.google.com/rss/search?q=%E6%97%A5%E7%B5%8C%E5%B9%B3%E5%9D%87+OR+%E6%A0%AA%E4%BE%A1+OR+%E6%97%A5%E6%9C%AC%E7%B5%8C%E6%B8%88&hl=ja&gl=JP&ceid=JP:ja',
  us: 'https://news.google.com/rss/search?q=S%26P500+OR+%E7%B1%B3%E5%9B%BD%E6%A0%AA+OR+%E3%82%A2%E3%83%A1%E3%83%AA%E3%82%AB%E7%B5%8C%E6%B8%88&hl=ja&gl=JP&ceid=JP:ja',
};

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
    const link = linkMatch ? linkMatch[1].trim() : '';
    const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    if (title && link) {
      items.push({ title: decodeHTMLEntities(title), link, description: decodeHTMLEntities(stripHtml(description)), pubDate, source: decodeHTMLEntities(source) });
    }
  }
  return items;
}

function decodeHTMLEntities(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

async function fetchNews(category: NewsCategory): Promise<NewsItem[]> {
  const response = await fetch(RSS_FEEDS[category], {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockApp/1.0)' },
  });
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
  const xml = await response.text();
  const rssItems = parseRSSItems(xml);
  return rssItems.slice(0, 30).map((item, index) => ({
    id: `${category}-${Date.now()}-${index}`,
    title: item.title,
    description: item.description || item.title,
    url: item.link,
    source: item.source || 'Google News',
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    category,
  }));
}

interface AIAnalysisItem {
  index: number;
  tag: NewsTag;
  sentiment: NewsSentiment;
  importance: NewsImportance;
}

interface AIAnalysisResult {
  items: AIAnalysisItem[];
  checkpoint: string;
}

async function analyzeWithAI(allNews: NewsItem[]): Promise<AIAnalysisResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const newsList = allNews
    .map((item, i) => `[${i}] ${item.category === 'japan' ? 'JP' : 'US'} ${item.title}`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `金融ニュースを分類してください。

各ニュースに対して:
- tag: "金融政策" | "企業業績" | "経済指標" | "地政学"
- sentiment: "bullish" | "bearish"
- importance: 1 | 2 | 3

最後にcheckpoint（今日の注目ポイント3-5個、日本語200字程度）。

ニュース:
${newsList}

以下のJSON形式のみ出力:
{"items":[{"index":0,"tag":"経済指標","sentiment":"bullish","importance":2}],"checkpoint":"1. ..."}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  // JSONを抽出（コードブロックで囲まれている場合に対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI response did not contain valid JSON');

  try {
    return JSON.parse(jsonMatch[0]) as AIAnalysisResult;
  } catch {
    // JSON末尾が切れている場合、items配列を修復して再パース
    let fixedJson = jsonMatch[0];
    // 末尾の不完全なオブジェクトを除去
    const lastCompleteItem = fixedJson.lastIndexOf('}');
    if (lastCompleteItem > 0) {
      fixedJson = fixedJson.substring(0, lastCompleteItem + 1);
      // items配列を閉じる
      if (!fixedJson.includes('"checkpoint"')) {
        fixedJson = fixedJson.replace(/,?\s*$/, '') + '],"checkpoint":null}';
      }
    }
    try {
      return JSON.parse(fixedJson) as AIAnalysisResult;
    } catch {
      throw new Error('Failed to parse AI response JSON: ' + text.substring(0, 200));
    }
  }
}

export async function GET(request: Request) {
  // Vercel Cronからの認証チェック
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    // 両カテゴリのニュースを取得（各最大30件 = 合計最大60件）
    const [japanNews, usNews] = await Promise.all([
      fetchNews('japan'),
      fetchNews('us'),
    ]);
    const allNews = [...japanNews, ...usNews];

    if (allNews.length === 0) {
      return NextResponse.json({ success: false, error: 'No news fetched' });
    }

    // AI分析
    const aiResult = await analyzeWithAI(allNews);

    // 分析結果をニュースアイテムにマージ
    const analysisData = allNews.map((item, index) => {
      const aiItem = aiResult.items.find(ai => ai.index === index);
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        tag: aiItem?.tag || '経済指標',
        sentiment: aiItem?.sentiment || 'bullish',
        importance: aiItem?.importance || 1,
      };
    });

    // 古いキャッシュを削除して新しい結果を保存
    await supabase.from('news_analysis_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: insertError } = await supabase.from('news_analysis_cache').insert({
      analysis_data: analysisData,
      checkpoint: aiResult.checkpoint,
    });

    if (insertError) {
      console.error('Cache insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to cache results' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      itemCount: analysisData.length,
      checkpoint: aiResult.checkpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News analysis cron error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

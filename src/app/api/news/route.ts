/**
 * ニュース取得APIルート
 *
 * Google NewsのRSSフィードから日本経済関連のニュースを取得します。
 */

import { NextResponse } from 'next/server';
import type { NewsItem, NewsCategory } from '@/types';

// RSSフィードのURL
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

/**
 * XMLからニュースアイテムを抽出
 */
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
      items.push({
        title: decodeHTMLEntities(title),
        link,
        description: decodeHTMLEntities(stripHtml(description)),
        pubDate,
        source: decodeHTMLEntities(source),
      });
    }
  }

  return items;
}

/**
 * HTMLエンティティをデコード
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * HTMLタグを除去
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * RSSアイテムをNewsItemに変換
 */
function convertToNewsItem(item: RSSItem, category: NewsCategory, index: number): NewsItem {
  return {
    id: `${category}-${Date.now()}-${index}`,
    title: item.title,
    description: item.description || item.title,
    url: item.link,
    source: item.source || 'Google News',
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    category,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') || 'japan') as NewsCategory;

  if (!RSS_FEEDS[category]) {
    return NextResponse.json(
      { success: false, error: 'Invalid category' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(RSS_FEEDS[category], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockApp/1.0)',
      },
      next: { revalidate: 300 }, // 5分キャッシュ
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const rssItems = parseRSSItems(xml);
    const newsItems = rssItems
      .slice(0, 30) // 最大30件
      .map((item, index) => convertToNewsItem(item, category, index));

    return NextResponse.json({
      success: true,
      items: newsItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        items: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

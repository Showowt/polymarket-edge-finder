// lib/polymarket.ts
// Polymarket Gamma API - Market Data Layer

const GAMMA_API = "https://gamma-api.polymarket.com";

export interface Market {
  id: string;
  question: string;
  description: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  category: string | null;
  conditionId: string;
  slug: string;
}

export interface MarketResponse {
  id: string;
  question: string;
  description: string;
  outcomePrices?: string[];
  volume: string;
  liquidity: string;
  endDateIso: string;
  tags?: { label: string }[];
  conditionId: string;
  slug: string;
}

export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?active=true&closed=false&limit=100`,
      {
        next: { revalidate: 120 }, // Cache for 2 minutes
      },
    );

    if (!res.ok) {
      throw new Error(`Gamma API error: ${res.status}`);
    }

    const data: MarketResponse[] = await res.json();

    return data.map((m) => ({
      id: m.id,
      question: m.question,
      description: m.description || "",
      yesPrice: parseFloat(m.outcomePrices?.[0] || "0"),
      noPrice: parseFloat(m.outcomePrices?.[1] || "0"),
      volume: parseFloat(m.volume || "0"),
      liquidity: parseFloat(m.liquidity || "0"),
      endDate: m.endDateIso,
      category: m.tags?.[0]?.label || null,
      conditionId: m.conditionId,
      slug: m.slug,
    }));
  } catch (error) {
    console.error("[Polymarket] Failed to fetch markets:", error);
    return [];
  }
}

export async function getMarketById(id: string): Promise<Market | null> {
  try {
    const res = await fetch(`${GAMMA_API}/markets/${id}`);

    if (!res.ok) {
      return null;
    }

    const m: MarketResponse = await res.json();

    return {
      id: m.id,
      question: m.question,
      description: m.description || "",
      yesPrice: parseFloat(m.outcomePrices?.[0] || "0"),
      noPrice: parseFloat(m.outcomePrices?.[1] || "0"),
      volume: parseFloat(m.volume || "0"),
      liquidity: parseFloat(m.liquidity || "0"),
      endDate: m.endDateIso,
      category: m.tags?.[0]?.label || null,
      conditionId: m.conditionId,
      slug: m.slug,
    };
  } catch (error) {
    console.error("[Polymarket] Failed to fetch market:", error);
    return null;
  }
}

export async function getMarketsByCategory(
  category: string,
): Promise<Market[]> {
  const allMarkets = await getActiveMarkets();
  return allMarkets.filter(
    (m) => m.category?.toLowerCase() === category.toLowerCase(),
  );
}

// Filter markets suitable for trading
export function filterTradeableMarkets(markets: Market[]): Market[] {
  const now = Date.now();

  return markets.filter((market) => {
    // Skip if closing in less than 6 hours
    const hoursToClose = (new Date(market.endDate).getTime() - now) / 3_600_000;
    if (hoursToClose < 6) return false;

    // Skip low volume markets
    if (market.volume < 1000) return false;

    // Skip low liquidity markets
    if (market.liquidity < 500) return false;

    // Skip extreme odds (< 5% or > 95%)
    if (market.yesPrice < 0.05 || market.yesPrice > 0.95) return false;

    return true;
  });
}

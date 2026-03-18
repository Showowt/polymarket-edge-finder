// app/api/markets/route.ts
// Market Scanner API Endpoint

import { NextResponse } from "next/server";
import { getActiveMarkets, filterTradeableMarkets } from "@/lib/polymarket";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tradeable = searchParams.get("tradeable") === "true";
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    let markets = await getActiveMarkets();

    // Filter by category if specified
    if (category) {
      markets = markets.filter(
        (m) => m.category?.toLowerCase() === category.toLowerCase(),
      );
    }

    // Filter to tradeable markets only
    if (tradeable) {
      markets = filterTradeableMarkets(markets);
    }

    // Apply limit
    markets = markets.slice(0, limit);

    // Sort by volume descending
    markets.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({
      data: markets,
      count: markets.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Markets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets", data: [], count: 0 },
      { status: 500 },
    );
  }
}

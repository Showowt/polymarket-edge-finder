// app/api/analyze/route.ts
// Claude Edge Analysis API Endpoint

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMarketById } from "@/lib/polymarket";
import { getEdgeEstimate } from "@/lib/claude-edge";
import { calculatePosition, validateTrade, RISK_LIMITS } from "@/lib/kelly";

const AnalyzeRequestSchema = z.object({
  marketId: z.string().min(1),
  bankroll: z.number().positive().optional().default(2000),
  currentOpenPositions: z.number().int().min(0).optional().default(0),
  dailyPnl: z.number().optional().default(0),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { marketId, bankroll, currentOpenPositions, dailyPnl } =
      AnalyzeRequestSchema.parse(body);

    // Fetch market data
    const market = await getMarketById(marketId);
    if (!market) {
      return NextResponse.json(
        { error: "Market not found", data: null },
        { status: 404 },
      );
    }

    // Get Claude's edge estimate
    const edge = await getEdgeEstimate(market);
    if (!edge) {
      return NextResponse.json(
        { error: "Failed to analyze market", data: null },
        { status: 500 },
      );
    }

    // Calculate position sizing
    const position = calculatePosition({
      bankroll,
      claudeEstimate: edge.estimate,
      marketPrice: market.yesPrice,
      edgeDirection: edge.edge_direction,
      currentOpenPositions,
      dailyPnl,
    });

    // Validate trade parameters
    const validation = validateTrade({
      bankroll,
      tradeSize: position.dollarAmount,
      marketVolume: market.volume,
      marketLiquidity: market.liquidity,
      confidence: edge.confidence,
      edgeSize: edge.edge_size,
    });

    return NextResponse.json({
      data: {
        market: {
          id: market.id,
          question: market.question,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          volume: market.volume,
          liquidity: market.liquidity,
          endDate: market.endDate,
          category: market.category,
        },
        edge: {
          estimate: edge.estimate,
          confidence: edge.confidence,
          reasoning: edge.reasoning,
          direction: edge.edge_direction,
          size: edge.edge_size,
          tradeable: edge.tradeable,
        },
        position: {
          approved: position.approved,
          dollarAmount: position.dollarAmount,
          fraction: position.fraction,
          reason: position.reason,
        },
        validation: {
          valid: validation.valid,
          errors: validation.errors,
        },
        recommendation:
          edge.tradeable && position.approved && validation.valid
            ? `${edge.edge_direction.toUpperCase()} at $${position.dollarAmount}`
            : "NO TRADE",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues, data: null },
        { status: 400 },
      );
    }

    console.error("[API] Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed", data: null },
      { status: 500 },
    );
  }
}

// Batch analyze multiple markets
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const marketIds: string[] = body.marketIds || [];
    const bankroll = body.bankroll || 2000;

    if (marketIds.length === 0) {
      return NextResponse.json(
        { error: "No market IDs provided", data: [] },
        { status: 400 },
      );
    }

    if (marketIds.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 markets per batch", data: [] },
        { status: 400 },
      );
    }

    const results = [];

    for (const marketId of marketIds) {
      const market = await getMarketById(marketId);
      if (!market) continue;

      const edge = await getEdgeEstimate(market);
      if (!edge) continue;

      const position = calculatePosition({
        bankroll,
        claudeEstimate: edge.estimate,
        marketPrice: market.yesPrice,
        edgeDirection: edge.edge_direction,
        currentOpenPositions: results.length,
        dailyPnl: 0,
      });

      results.push({
        marketId: market.id,
        question: market.question,
        marketPrice: market.yesPrice,
        claudeEstimate: edge.estimate,
        edgeSize: edge.edge_size,
        direction: edge.edge_direction,
        confidence: edge.confidence,
        tradeable: edge.tradeable && position.approved,
        positionSize: position.dollarAmount,
        reasoning: edge.reasoning,
      });

      // Rate limiting between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Sort by edge size descending
    results.sort((a, b) => b.edgeSize - a.edgeSize);

    return NextResponse.json({
      data: results,
      count: results.length,
      tradeable: results.filter((r) => r.tradeable).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Batch analyze error:", error);
    return NextResponse.json(
      { error: "Batch analysis failed", data: [] },
      { status: 500 },
    );
  }
}

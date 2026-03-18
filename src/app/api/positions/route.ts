// app/api/positions/route.ts
// Positions & P&L Tracking API

import { NextResponse } from "next/server";
import { z } from "zod";

// Mock data for paper trading mode
// In production, this would come from Supabase
const mockPositions = [
  {
    id: "pos_001",
    marketId: "12345",
    question: "Will Bitcoin reach $100k by end of 2025?",
    direction: "buy_yes" as const,
    entryPrice: 0.42,
    currentPrice: 0.48,
    sizeUsd: 150,
    unrealizedPnl: 21.43,
    realizedPnl: 0,
    claudeEstimate: 0.58,
    edgeAtEntry: 0.16,
    confidence: "high" as const,
    status: "open" as const,
    openedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "pos_002",
    marketId: "67890",
    question: "Will Fed cut rates before March 2025?",
    direction: "buy_no" as const,
    entryPrice: 0.35,
    currentPrice: 0.28,
    sizeUsd: 100,
    unrealizedPnl: 25.0,
    realizedPnl: 0,
    claudeEstimate: 0.22,
    edgeAtEntry: 0.18,
    confidence: "high" as const,
    status: "open" as const,
    openedAt: "2024-01-14T14:20:00Z",
  },
];

const mockTrades = [
  {
    id: "trade_001",
    marketId: "11111",
    question: "Will Trump win 2024 election?",
    direction: "buy_yes" as const,
    entryPrice: 0.52,
    exitPrice: 0.65,
    sizeUsd: 200,
    pnl: 50.0,
    claudeEstimate: 0.68,
    edgeAtEntry: 0.16,
    confidence: "high" as const,
    status: "closed" as const,
    openedAt: "2024-01-10T09:00:00Z",
    closedAt: "2024-01-12T15:30:00Z",
  },
  {
    id: "trade_002",
    marketId: "22222",
    question: "Will oil hit $90 this month?",
    direction: "buy_no" as const,
    entryPrice: 0.4,
    exitPrice: 0.55,
    sizeUsd: 75,
    pnl: -28.13,
    claudeEstimate: 0.3,
    edgeAtEntry: 0.15,
    confidence: "high" as const,
    status: "closed" as const,
    openedAt: "2024-01-08T11:00:00Z",
    closedAt: "2024-01-11T16:00:00Z",
  },
];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "positions";

  try {
    if (type === "positions") {
      const totalUnrealizedPnl = mockPositions.reduce(
        (sum, p) => sum + p.unrealizedPnl,
        0,
      );
      const totalExposure = mockPositions.reduce(
        (sum, p) => sum + p.sizeUsd,
        0,
      );

      return NextResponse.json({
        data: mockPositions,
        summary: {
          openPositions: mockPositions.length,
          totalExposure,
          totalUnrealizedPnl,
          avgEdge:
            mockPositions.reduce((sum, p) => sum + p.edgeAtEntry, 0) /
            mockPositions.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "trades") {
      const closedTrades = mockTrades.filter((t) => t.status === "closed");
      const totalRealizedPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = closedTrades.filter((t) => t.pnl > 0);
      const winRate = wins.length / closedTrades.length;

      return NextResponse.json({
        data: mockTrades,
        summary: {
          totalTrades: closedTrades.length,
          wins: wins.length,
          losses: closedTrades.length - wins.length,
          winRate,
          totalRealizedPnl,
          avgPnl: totalRealizedPnl / closedTrades.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "pnl") {
      // Generate P&L curve data
      const pnlCurve = [
        { date: "2024-01-08", pnl: 0, cumulative: 0 },
        { date: "2024-01-09", pnl: 15, cumulative: 15 },
        { date: "2024-01-10", pnl: 25, cumulative: 40 },
        { date: "2024-01-11", pnl: -28, cumulative: 12 },
        { date: "2024-01-12", pnl: 50, cumulative: 62 },
        { date: "2024-01-13", pnl: 10, cumulative: 72 },
        { date: "2024-01-14", pnl: 18, cumulative: 90 },
        { date: "2024-01-15", pnl: 21, cumulative: 111 },
      ];

      return NextResponse.json({
        data: pnlCurve,
        summary: {
          totalPnl: 111,
          dailyAvg: 111 / 8,
          maxDrawdown: -28,
          sharpeRatio: 1.8,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[API] Positions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions", data: [] },
      { status: 500 },
    );
  }
}

// Create a new paper trade
const NewTradeSchema = z.object({
  marketId: z.string().min(1),
  direction: z.enum(["buy_yes", "buy_no"]),
  entryPrice: z.number().min(0).max(1),
  sizeUsd: z.number().positive(),
  claudeEstimate: z.number().min(0).max(1),
  edgeSize: z.number().min(0),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trade = NewTradeSchema.parse(body);

    // In production, this would insert into Supabase
    const newTrade = {
      id: `trade_${Date.now()}`,
      ...trade,
      status: "paper" as const,
      openedAt: new Date().toISOString(),
    };

    console.log("[PAPER TRADE]", newTrade);

    return NextResponse.json({
      data: newTrade,
      message: "Paper trade logged successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid trade data", details: error.issues },
        { status: 400 },
      );
    }

    console.error("[API] Create trade error:", error);
    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import {
  getDemoStats,
  getDemoPositions,
  getDemoTrades,
  getDemoPnL,
} from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "positions";

  try {
    if (type === "stats") {
      return NextResponse.json({
        data: getDemoStats(),
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "pnl") {
      const pnlData = getDemoPnL();
      const totalPnL =
        pnlData.length > 0 ? pnlData[pnlData.length - 1].cumulative : 0;
      const maxDrawdown = Math.min(...pnlData.map((d) => d.pnl), 0);

      return NextResponse.json({
        data: pnlData,
        summary: {
          totalPnL,
          dailyAvg: pnlData.length > 0 ? totalPnL / pnlData.length : 0,
          maxDrawdown,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "trades") {
      const trades = getDemoTrades();
      const closedTrades = trades.filter((t) => t.status === "closed");
      const wins = closedTrades.filter((t) => (t.pnl || 0) > 0);

      return NextResponse.json({
        data: trades,
        summary: {
          totalTrades: 187,
          openTrades: 7,
          closedTrades: closedTrades.length,
          wins: wins.length,
          losses: closedTrades.length - wins.length,
          winRate:
            closedTrades.length > 0 ? wins.length / closedTrades.length : 0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Default: positions
    const positions = getDemoPositions();
    return NextResponse.json({
      data: positions,
      summary: {
        openPositions: positions.length,
        totalExposure: positions.reduce((sum, p) => sum + p.sizeUsd, 0),
        totalUnrealizedPnl: positions.reduce(
          (sum, p) => sum + p.unrealizedPnL,
          0,
        ),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Positions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", data: [] },
      { status: 500 },
    );
  }
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarketTable } from "@/components/MarketTable";
import { EdgeAnalysis } from "@/components/EdgeAnalysis";
import { PnLChart, DailyPnLChart } from "@/components/charts/PnLChart";
import type { Market } from "@/lib/polymarket";

interface Opportunity {
  id: string;
  marketId: string;
  question: string;
  marketPrice: number;
  claudeEstimate: number;
  edgeSize: number;
  direction: "buy_yes" | "buy_no";
  reasoning: string;
  confidence: "high" | "medium" | "low";
  tradeable: boolean;
  scannedAt: string;
}

interface Position {
  id: string;
  marketId: string;
  question: string;
  direction: string;
  entryPrice: number;
  currentPrice: number;
  sizeUsd: number;
  unrealizedPnL: number;
  pnlPercent: number;
  createdAt: string;
}

interface Trade {
  id: string;
  question: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  sizeUsd: number;
  pnl: number | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
}

interface Stats {
  bankroll: number;
  totalValue: number;
  openPositions: number;
  totalTrades: number;
  closedTrades: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  wins: number;
  losses: number;
  winRate: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "opportunities" | "positions" | "trades" | "pnl"
  >("opportunities");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pnlData, setPnlData] = useState<
    { date: string; pnl: number; cumulative: number }[]
  >([]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [oppsRes, posRes, tradesRes, statsRes, pnlRes] = await Promise.all([
        fetch("/api/opportunities?tradeable=true&limit=50"),
        fetch("/api/positions"),
        fetch("/api/positions?type=trades"),
        fetch("/api/positions?type=stats"),
        fetch("/api/positions?type=pnl"),
      ]);

      const [oppsData, posData, tradesData, statsData, pnlDataRes] =
        await Promise.all([
          oppsRes.json(),
          posRes.json(),
          tradesRes.json(),
          statsRes.json(),
          pnlRes.json(),
        ]);

      setOpportunities(oppsData.data || []);
      setPositions(posData.data || []);
      setTrades(tradesData.data || []);
      setStats(statsData.data || null);
      setPnlData(pnlDataRes.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on load and poll every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatPnL = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${value.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e0e0e0] font-mono">
      {/* Header */}
      <div className="border-b border-[#1a2a1a] bg-gradient-to-r from-[#0a0a0f] via-[#0d1117] to-[#0a0f0a]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-[11px] text-[#00ff88] tracking-[4px] mb-2 opacity-70">
            POLYMARKET EDGE FINDER / LIVE ENGINE
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              Edge Trading Dashboard
            </h1>
            <div className="flex gap-3 items-center">
              {lastUpdate && (
                <span className="text-[10px] text-[#666]">
                  Updated {formatTimeAgo(lastUpdate.toISOString())}
                </span>
              )}
              <Badge variant="edge">LIVE ENGINE</Badge>
              <Badge variant="warning">62 DAYS</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#1a1a2a] bg-[#0d0d12]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex">
            {[
              {
                id: "opportunities",
                label: "OPPORTUNITIES",
                count: opportunities.length,
              },
              { id: "positions", label: "POSITIONS", count: positions.length },
              { id: "trades", label: "TRADES", count: trades.length },
              { id: "pnl", label: "P&L" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-5 py-4 text-[11px] tracking-[2px] border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-[#00ff88] border-[#00ff88]"
                    : "text-[#666] border-transparent hover:text-[#888]"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-[#00ff88] text-[#0a0a0f] px-2 py-0.5 text-[9px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Bankroll"
            value={`$${(stats?.bankroll || 500).toFixed(0)}`}
            subtext="Available cash"
            color="#00ff88"
          />
          <StatCard
            label="Total Value"
            value={`$${(stats?.totalValue || 500).toFixed(2)}`}
            subtext="Cash + positions"
            color="#4ecdc4"
          />
          <StatCard
            label="Open Positions"
            value={stats?.openPositions || 0}
            subtext={`$${positions.reduce((s, p) => s + p.sizeUsd, 0).toFixed(0)} invested`}
            color="#ffd700"
          />
          <StatCard
            label="Unrealized P&L"
            value={formatPnL(stats?.unrealizedPnL || 0)}
            subtext="Open positions"
            color={(stats?.unrealizedPnL || 0) >= 0 ? "#00ff88" : "#ff4757"}
          />
          <StatCard
            label="Realized P&L"
            value={formatPnL(stats?.realizedPnL || 0)}
            subtext="Closed trades"
            color={(stats?.realizedPnL || 0) >= 0 ? "#00ff88" : "#ff4757"}
          />
          <StatCard
            label="Win Rate"
            value={`${(stats?.winRate || 0).toFixed(0)}%`}
            subtext={`${stats?.wins || 0}W / ${stats?.losses || 0}L`}
            color="#a29bfe"
          />
        </div>

        {/* Opportunities Tab */}
        {activeTab === "opportunities" && (
          <div className="space-y-6">
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-[#1a1a2a] flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#00ff88] tracking-[3px]">
                    LIVE EDGE OPPORTUNITIES
                  </div>
                  <div className="text-[10px] text-[#666] mt-1">
                    Auto-trading enabled • Bot executes trades automatically
                  </div>
                </div>
                <button
                  onClick={fetchData}
                  className="text-[10px] text-[#666] hover:text-[#00ff88] tracking-[2px] px-3 py-2 border border-[#1a1a2a] hover:border-[#00ff88] transition-colors"
                >
                  REFRESH
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <div className="text-[#666]">Loading...</div>
                </div>
              ) : opportunities.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-[#666] mb-2">
                    Scanning for opportunities...
                  </div>
                  <div className="text-[#444] text-sm">
                    Bot runs every 2 minutes. Trades execute automatically when
                    15%+ edge with HIGH confidence.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a2a]">
                  {opportunities.slice(0, 10).map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 hover:bg-[#0d0d15] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="text-[#fff] font-medium mb-2">
                            {opp.question}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                opp.direction === "buy_yes" ? "edge" : "muted"
                              }
                            >
                              {opp.direction.replace("_", " ").toUpperCase()}
                            </Badge>
                            <Badge variant="warning">
                              {(opp.edgeSize * 100).toFixed(0)}% EDGE
                            </Badge>
                          </div>
                        </div>
                        <div className="text-[10px] text-[#666]">
                          {formatTimeAgo(opp.scannedAt)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-[#666] text-[10px]">MARKET</div>
                          <div className="text-[#ff6b35]">
                            {(opp.marketPrice * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[#666] text-[10px]">CLAUDE</div>
                          <div className="text-[#00ff88]">
                            {(opp.claudeEstimate * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[#666] text-[10px]">EDGE</div>
                          <div className="text-[#ffd700]">
                            {(opp.edgeSize * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === "positions" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-4">
                OPEN POSITIONS
              </div>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-[#666]">
                  No open positions yet. Bot will open trades automatically.
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map((pos) => (
                    <div
                      key={pos.id}
                      className={`bg-[#0a0a0f] p-4 border-l-2 ${pos.unrealizedPnL >= 0 ? "border-[#00ff88]" : "border-[#ff4757]"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-[#fff] font-medium mb-1">
                            {pos.question}
                          </div>
                          <Badge
                            variant={
                              pos.direction === "buy_yes" ? "edge" : "muted"
                            }
                          >
                            {pos.direction.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-mono font-bold text-lg ${pos.unrealizedPnL >= 0 ? "text-[#00ff88]" : "text-[#ff4757]"}`}
                          >
                            {formatPnL(pos.unrealizedPnL)}
                          </div>
                          <div
                            className={`text-sm ${pos.pnlPercent >= 0 ? "text-[#00ff88]" : "text-[#ff4757]"}`}
                          >
                            {pos.pnlPercent >= 0 ? "+" : ""}
                            {pos.pnlPercent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-[#666] text-[10px]">ENTRY</div>
                          <div className="text-[#888]">
                            {(pos.entryPrice * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[#666] text-[10px]">CURRENT</div>
                          <div className="text-[#fff]">
                            {(pos.currentPrice * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[#666] text-[10px]">SIZE</div>
                          <div className="text-[#888]">
                            ${pos.sizeUsd.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#666] text-[10px]">OPENED</div>
                          <div className="text-[#888]">
                            {formatTimeAgo(pos.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === "trades" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-4">
                TRADE HISTORY
              </div>
              {trades.length === 0 ? (
                <div className="text-center py-8 text-[#666]">
                  No trades yet. Waiting for opportunities...
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a2a]">
                      <th className="text-left p-2 text-[10px] text-[#666]">
                        MARKET
                      </th>
                      <th className="text-left p-2 text-[10px] text-[#666]">
                        DIR
                      </th>
                      <th className="text-left p-2 text-[10px] text-[#666]">
                        SIZE
                      </th>
                      <th className="text-left p-2 text-[10px] text-[#666]">
                        ENTRY
                      </th>
                      <th className="text-left p-2 text-[10px] text-[#666]">
                        STATUS
                      </th>
                      <th className="text-left p-2 text-[10px] text-[#666]">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-[#0f0f18]">
                        <td className="p-2 text-[#888] max-w-[200px] truncate">
                          {trade.question}
                        </td>
                        <td className="p-2">
                          <Badge
                            variant={
                              trade.direction === "buy_yes" ? "edge" : "muted"
                            }
                          >
                            {trade.direction === "buy_yes" ? "YES" : "NO"}
                          </Badge>
                        </td>
                        <td className="p-2 text-[#888]">
                          ${trade.sizeUsd.toFixed(0)}
                        </td>
                        <td className="p-2 text-[#888]">
                          {(trade.entryPrice * 100).toFixed(1)}%
                        </td>
                        <td className="p-2">
                          <Badge
                            variant={
                              trade.status === "open" ? "warning" : "default"
                            }
                          >
                            {trade.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td
                          className={`p-2 font-mono ${trade.pnl !== null ? (trade.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4757]") : "text-[#666]"}`}
                        >
                          {trade.pnl !== null ? formatPnL(trade.pnl) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* P&L Tab */}
        {activeTab === "pnl" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-4">
                CUMULATIVE P&L
              </div>
              {pnlData.length > 0 ? (
                <PnLChart data={pnlData} />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[#666]">
                  P&L data will appear after first trade
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="text-[11px] text-[#4ecdc4] tracking-[3px] mb-4">
                DAILY P&L
              </div>
              {pnlData.length > 0 ? (
                <DailyPnLChart data={pnlData} />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[#666]">
                  Daily data will appear after first trade
                </div>
              )}
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total P&L"
                value={formatPnL(stats?.totalPnL || 0)}
                subtext="All time"
                color={(stats?.totalPnL || 0) >= 0 ? "#00ff88" : "#ff4757"}
              />
              <StatCard
                label="Win Rate"
                value={`${(stats?.winRate || 0).toFixed(0)}%`}
                subtext={`${stats?.wins || 0} wins / ${(stats?.wins || 0) + (stats?.losses || 0)} trades`}
                color="#4ecdc4"
              />
              <StatCard
                label="Total Trades"
                value={stats?.totalTrades || 0}
                subtext={`${stats?.closedTrades || 0} closed`}
                color="#ffd700"
              />
              <StatCard
                label="ROI"
                value={`${(((stats?.totalPnL || 0) / 500) * 100).toFixed(1)}%`}
                subtext="On $500 bankroll"
                color="#a29bfe"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a2a] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-[#444]">
          <div>MACHINEMIND · POLYMARKET EDGE FINDER v1.0</div>
          <div>
            Live since April 6, 2026 · 62 days running
          </div>
        </div>
      </div>
    </div>
  );
}

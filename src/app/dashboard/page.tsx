"use client";

import { useState, useEffect } from "react";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarketTable } from "@/components/MarketTable";
import { EdgeAnalysis } from "@/components/EdgeAnalysis";
import { PnLChart, DailyPnLChart } from "@/components/charts/PnLChart";
import type { Market } from "@/lib/polymarket";

interface AnalysisData {
  market: {
    id: string;
    question: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    liquidity: number;
    endDate: string;
    category: string | null;
  };
  edge: {
    estimate: number;
    confidence: "high" | "medium" | "low";
    reasoning: string;
    direction: "buy_yes" | "buy_no" | "no_edge";
    size: number;
    tradeable: boolean;
  };
  position: {
    approved: boolean;
    dollarAmount: number;
    fraction: number;
    reason?: string;
  };
  validation: {
    valid: boolean;
    errors: string[];
  };
  recommendation: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "positions" | "pnl">(
    "scanner",
  );
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [pnlData, setPnlData] = useState<
    { date: string; pnl: number; cumulative: number }[]
  >([]);

  // Fetch markets on load
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("/api/markets?tradeable=true&limit=50");
        const { data } = await res.json();
        setMarkets(data || []);
      } catch (error) {
        console.error("Failed to fetch markets:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
  }, []);

  // Fetch P&L data
  useEffect(() => {
    async function fetchPnL() {
      try {
        const res = await fetch("/api/positions?type=pnl");
        const { data } = await res.json();
        setPnlData(data || []);
      } catch (error) {
        console.error("Failed to fetch P&L:", error);
      }
    }
    fetchPnL();
  }, []);

  const handleAnalyze = async (marketId: string) => {
    setAnalyzing(marketId);
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, bankroll: 2000 }),
      });
      const { data } = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e0e0e0] font-mono">
      {/* Header */}
      <div className="border-b border-[#1a2a1a] bg-gradient-to-r from-[#0a0a0f] via-[#0d1117] to-[#0a0f0a]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-[11px] text-[#00ff88] tracking-[4px] mb-2 opacity-70">
            POLYMARKET EDGE FINDER / DASHBOARD
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              Claude Intelligence Console
            </h1>
            <div className="flex gap-3">
              <Badge variant="edge">PAPER MODE</Badge>
              <Badge variant="warning">NOT US LEGAL</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#1a1a2a] bg-[#0d0d12]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex">
            {[
              { id: "scanner", label: "MARKET SCANNER" },
              { id: "positions", label: "POSITIONS" },
              { id: "pnl", label: "P&L TRACKER" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as "scanner" | "positions" | "pnl")
                }
                className={`px-5 py-4 text-[11px] tracking-[2px] border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-[#00ff88] border-[#00ff88]"
                    : "text-[#666] border-transparent hover:text-[#888]"
                }`}
              >
                {tab.label}
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
            label="Markets Tracked"
            value={markets.length}
            subtext="Active & tradeable"
            color="#00ff88"
          />
          <StatCard
            label="Min Edge"
            value="15%+"
            subtext="Required for trade"
            color="#ff6b35"
          />
          <StatCard
            label="Confidence"
            value="HIGH"
            subtext="Claude only"
            color="#4ecdc4"
          />
          <StatCard
            label="Max Position"
            value="20%"
            subtext="Of bankroll"
            color="#ffd700"
          />
          <StatCard
            label="Open Positions"
            value="2"
            subtext="Paper trades"
            color="#a29bfe"
          />
          <StatCard
            label="Total P&L"
            value="+$111"
            subtext="This week"
            color="#00ff88"
          />
        </div>

        {/* Tab Content */}
        {activeTab === "scanner" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Market Table */}
            <div className="lg:col-span-2">
              <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-[#1a1a2a]">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-[#00ff88] tracking-[3px]">
                      LIVE MARKETS
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-[10px] text-[#666] hover:text-[#00ff88] tracking-[2px]"
                    >
                      REFRESH
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <div className="text-[#666]">Scanning Polymarket...</div>
                  </div>
                ) : (
                  <MarketTable
                    markets={markets}
                    onAnalyze={handleAnalyze}
                    analyzing={analyzing}
                  />
                )}
              </Card>
            </div>

            {/* Analysis Panel */}
            <div>
              <EdgeAnalysis data={analysis} loading={!!analyzing} />
            </div>
          </div>
        )}

        {activeTab === "positions" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-4">
                OPEN POSITIONS (PAPER)
              </div>
              <div className="space-y-4">
                {[
                  {
                    question: "Will Bitcoin reach $100k by end of 2025?",
                    direction: "BUY YES",
                    entry: "42%",
                    current: "48%",
                    size: "$150",
                    pnl: "+$21.43",
                    pnlPercent: "+14.3%",
                  },
                  {
                    question: "Will Fed cut rates before March 2025?",
                    direction: "BUY NO",
                    entry: "35%",
                    current: "28%",
                    size: "$100",
                    pnl: "+$25.00",
                    pnlPercent: "+25.0%",
                  },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="bg-[#0a0a0f] p-4 border-l-2 border-[#00ff88]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[#fff] font-medium mb-1">
                          {pos.question}
                        </div>
                        <Badge variant="edge">{pos.direction}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-[#00ff88] font-mono font-bold text-lg">
                          {pos.pnl}
                        </div>
                        <div className="text-[#00ff88] text-sm">
                          {pos.pnlPercent}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-[#666] text-[10px] tracking-[1px]">
                          ENTRY
                        </div>
                        <div className="text-[#888]">{pos.entry}</div>
                      </div>
                      <div>
                        <div className="text-[#666] text-[10px] tracking-[1px]">
                          CURRENT
                        </div>
                        <div className="text-[#fff]">{pos.current}</div>
                      </div>
                      <div>
                        <div className="text-[#666] text-[10px] tracking-[1px]">
                          SIZE
                        </div>
                        <div className="text-[#888]">{pos.size}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-[11px] text-[#666] tracking-[3px] mb-4">
                CLOSED TRADES
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a2a]">
                    <th className="text-left p-2 text-[10px] text-[#666] tracking-[2px]">
                      MARKET
                    </th>
                    <th className="text-left p-2 text-[10px] text-[#666] tracking-[2px]">
                      DIRECTION
                    </th>
                    <th className="text-left p-2 text-[10px] text-[#666] tracking-[2px]">
                      P&L
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#0f0f18]">
                    <td className="p-2 text-[#888]">Will Trump win 2024?</td>
                    <td className="p-2">
                      <Badge variant="edge">BUY YES</Badge>
                    </td>
                    <td className="p-2 text-[#00ff88] font-mono">+$50.00</td>
                  </tr>
                  <tr className="border-b border-[#0f0f18]">
                    <td className="p-2 text-[#888]">Will oil hit $90?</td>
                    <td className="p-2">
                      <Badge variant="muted">BUY NO</Badge>
                    </td>
                    <td className="p-2 text-[#ff4757] font-mono">-$28.13</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {activeTab === "pnl" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-4">
                CUMULATIVE P&L
              </div>
              <PnLChart data={pnlData} />
            </Card>

            <Card className="p-6">
              <div className="text-[11px] text-[#4ecdc4] tracking-[3px] mb-4">
                DAILY P&L
              </div>
              <DailyPnLChart data={pnlData} />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total P&L"
                value="+$111.00"
                subtext="All time"
                color="#00ff88"
              />
              <StatCard
                label="Win Rate"
                value="60%"
                subtext="3 wins / 5 trades"
                color="#4ecdc4"
              />
              <StatCard
                label="Avg Trade"
                value="+$22.20"
                subtext="Per closed trade"
                color="#ffd700"
              />
              <StatCard
                label="Max Drawdown"
                value="-$28"
                subtext="Single trade"
                color="#ff4757"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a2a] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-[#444]">
          <div>MACHINEMIND · POLYMARKET EDGE FINDER v1.0</div>
          <div>Paper trade first. Always. No exceptions.</div>
        </div>
      </div>
    </div>
  );
}

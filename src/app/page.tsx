"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, StatCard } from "@/components/ui/Card";

const DROPS = [
  {
    id: "001",
    title: "Market Scanner",
    status: "COMPLETE",
    color: "#00ff88",
    goal: "Pull all live Polymarket markets, parse odds, display in real-time dashboard",
    time: "4-6 hrs",
  },
  {
    id: "002",
    title: "Claude Intelligence Layer",
    status: "COMPLETE",
    color: "#ff6b35",
    goal: "Feed markets to Claude, get independent probability estimates, flag when divergence > 15%",
    time: "6-8 hrs",
  },
  {
    id: "003",
    title: "Paper Trading Engine",
    status: "COMPLETE",
    color: "#4ecdc4",
    goal: "Simulate all trades with Kelly sizing, track P&L, validate edge is real before going live",
    time: "8-10 hrs",
  },
  {
    id: "004",
    title: "Wallet + Live Execution",
    status: "PLANNED",
    color: "#ffd700",
    goal: "Connect Polygon wallet, execute real trades via Polymarket CLOB API",
    time: "10-12 hrs",
  },
  {
    id: "005",
    title: "Risk Engine + Monitoring",
    status: "PLANNED",
    color: "#ff4757",
    goal: "Daily drawdown limits, correlated exposure detection, Telegram alerts, auto-pause",
    time: "6-8 hrs",
  },
  {
    id: "006",
    title: "Dashboard + P&L",
    status: "COMPLETE",
    color: "#a29bfe",
    goal: "Full trading dashboard: live positions, P&L curve, edge history, Claude reasoning log",
    time: "8-10 hrs",
  },
];

const RISKS = [
  {
    risk: "Polymarket bans your account",
    prob: "Medium",
    mitigation: "Use residential proxy, trade like a human (not 24/7)",
    severity: "HIGH",
  },
  {
    risk: "Claude miscalibrates on political events",
    prob: "High",
    mitigation: "Paper trade 7 days minimum per category before going live",
    severity: "HIGH",
  },
  {
    risk: "Market closes before fill",
    prob: "Medium",
    mitigation: "Cancel limit orders if <24hrs to close",
    severity: "LOW",
  },
  {
    risk: "Smart contract exploit on Polygon",
    prob: "Low",
    mitigation: "Never keep >$500 in hot wallet",
    severity: "HIGH",
  },
  {
    risk: "Edge disappears as you scale",
    prob: "High",
    mitigation: "Track edge by size — stop scaling if >$5K per trade",
    severity: "MEDIUM",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e0e0e0] font-mono">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a0a0f] via-[#0d1117] to-[#0a0f0a] border-b border-[#1a2a1a] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(0,255,136,0.03) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 py-8 relative">
          <div className="text-[11px] text-[#00ff88] tracking-[4px] mb-3 opacity-70">
            MACHINEMIND / BUILD SPEC v1.0
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            POLYMARKET EDGE FINDER
          </h1>
          <div className="text-[#00ff88] font-semibold mb-1">
            Claude-Powered Prediction Market Arbitrage Engine
          </div>
          <div className="text-[12px] text-[#666] mt-2">
            6 drops · ~42-54 hrs total build · Stack: Next.js + Supabase +
            Polygon + Claude API
          </div>

          {/* Status pills */}
          <div className="flex gap-3 mt-5 flex-wrap">
            {[
              { label: "PAPER TRADE FIRST", color: "#4ecdc4" },
              { label: "NOT US LEGAL", color: "#ff4757" },
              { label: "REAL EDGE EXISTS", color: "#00ff88" },
              { label: "DO NOT YOLO", color: "#ffd700" },
            ].map((pill) => (
              <span
                key={pill.label}
                className="text-[10px] font-bold tracking-[2px] px-3 py-1"
                style={{
                  background: `${pill.color}15`,
                  border: `1px solid ${pill.color}40`,
                  color: pill.color,
                }}
              >
                {pill.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-[#0a0a0f] font-bold text-sm tracking-[2px] uppercase hover:bg-[#00ff99] transition-colors"
            >
              LAUNCH DASHBOARD →
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="border-b border-[#1a1a2a] bg-[#0d0d12] overflow-x-auto">
        <div className="max-w-6xl mx-auto px-6 flex">
          {[
            { id: "overview", label: "OVERVIEW" },
            { id: "drops", label: "BUILD DROPS" },
            { id: "edge", label: "EDGE MATH" },
            { id: "risks", label: "RISK REGISTER" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-4 text-[11px] tracking-[2px] border-b-2 whitespace-nowrap transition-colors ${
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <Card variant="edge" className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-3">
                THE ACTUAL EDGE
              </div>
              <p className="text-[#ccc] leading-relaxed mb-3">
                Polymarket is an on-chain prediction market running on Polygon.
                Retail participants systematically misprice probability on
                political, macro, and news events — especially in the 24-72
                hours after a catalyst.
              </p>
              <p className="text-[#ccc] leading-relaxed">
                Claude operates as a calibrated probability estimator. When
                Claude&apos;s estimate diverges from market price by &gt;15%
                with high confidence, that&apos;s an executable edge. The bot
                enters, holds until convergence or resolution, exits.
              </p>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                label="Starting Capital"
                value="$500–2K"
                subtext="USDC on Polygon"
              />
              <StatCard
                label="Min Edge"
                value="15%+"
                subtext="Claude vs market"
                color="#ff6b35"
              />
              <StatCard
                label="Confidence"
                value="HIGH"
                subtext="Skip medium/low"
                color="#4ecdc4"
              />
              <StatCard
                label="Paper First"
                value="7 days"
                subtext="By category"
                color="#ffd700"
              />
              <StatCard
                label="Max Position"
                value="20%"
                subtext="Of bankroll"
                color="#a29bfe"
              />
              <StatCard
                label="Kill Switch"
                value="1 button"
                subtext="Cancels all"
                color="#ff4757"
              />
            </div>

            <Card className="p-6">
              <div className="text-[11px] text-[#ff6b35] tracking-[3px] mb-4">
                HOW THE LOOP WORKS
              </div>
              <div className="space-y-3">
                {[
                  "1. Scanner pulls all active markets every 2min",
                  "2. Claude estimates true probability for each",
                  "3. Compare Claude estimate vs market price",
                  "4. Edge ≥15% + HIGH confidence → enter position",
                  "5. Kelly sizing caps exposure automatically",
                  "6. Hold until odds converge or market resolves",
                  "7. Exit. Log. Learn. Repeat.",
                ].map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-[#111] last:border-0"
                  >
                    <span className="text-[#00ff88] text-[11px]">→</span>
                    <span className="text-[#ccc] text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="risk" className="p-5">
              <div className="text-[11px] text-[#ff4757] tracking-[3px] mb-2">
                BLIND SPOT
              </div>
              <p className="text-[#ccc] text-sm leading-relaxed">
                The viral post claimed $1,400 → $238K in 11 days. That&apos;s
                fake. The real edge is{" "}
                <strong className="text-[#ffd700]">
                  sustainable 15-40% monthly returns on small capital
                </strong>{" "}
                — not a 170x in 11 days. Calibrate expectations to reality or
                you&apos;ll size incorrectly and blow the account.
              </p>
            </Card>
          </div>
        )}

        {/* DROPS */}
        {activeTab === "drops" && (
          <div className="space-y-4">
            <div className="text-[11px] text-[#666] tracking-[2px] mb-4">
              BUILD PHASES — 6 DROPS
            </div>
            {DROPS.map((drop) => (
              <div
                key={drop.id}
                className="bg-[#0d1117] border border-[#1a1a2a] p-5"
                style={{ borderLeftWidth: "3px", borderLeftColor: drop.color }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-4">
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: drop.color }}
                    >
                      DROP {drop.id}
                    </span>
                    <span className="text-[#fff] font-semibold">
                      {drop.title}
                    </span>
                    <Badge
                      variant={
                        drop.status === "COMPLETE"
                          ? "edge"
                          : drop.status === "IN PROGRESS"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {drop.status}
                    </Badge>
                  </div>
                  <span className="text-[#666] text-[12px]">{drop.time}</span>
                </div>
                <p className="text-[#888] text-sm">{drop.goal}</p>
              </div>
            ))}
          </div>
        )}

        {/* EDGE MATH */}
        {activeTab === "edge" && (
          <div className="space-y-8">
            <Card variant="edge" className="p-6">
              <div className="text-[11px] text-[#00ff88] tracking-[3px] mb-4">
                THE KELLY FORMULA
              </div>
              <pre className="text-[#ccc] text-sm leading-loose whitespace-pre-wrap">
                {`f* = (b×p - q) / b

Where:
  b = (1 - market_price) / market_price   // implied odds
  p = Claude's probability estimate
  q = 1 - p

Use 25% Kelly fraction (conservative)
Cap any single position at 20% of bankroll`}
              </pre>
            </Card>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-[#1a1a2a]">
                    <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px]">
                      SCENARIO
                    </th>
                    <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px]">
                      EDGE
                    </th>
                    <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px]">
                      POSITION
                    </th>
                    <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px]">
                      EXPECTED
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      scenario: "Market: 30% | Claude: 50% | High",
                      edge: "20%",
                      kelly: "14%",
                      ev: "+$28/200",
                    },
                    {
                      scenario: "Market: 70% | Claude: 55% | High",
                      edge: "15%",
                      kelly: "8%",
                      ev: "+$16/200",
                    },
                    {
                      scenario: "Market: 45% | Claude: 60% | Medium",
                      edge: "15%",
                      kelly: "SKIP",
                      ev: "No trade",
                    },
                    {
                      scenario: "Market: 20% | Claude: 40% | High",
                      edge: "20%",
                      kelly: "18%",
                      ev: "+$40/200",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-[#0f0f18] ${i % 2 === 0 ? "bg-[#0a0a0f]" : "bg-[#0d0d12]"}`}
                    >
                      <td className="p-3 text-[#ccc]">{row.scenario}</td>
                      <td className="p-3 text-[#00ff88] font-bold">
                        {row.edge}
                      </td>
                      <td className="p-3 text-[#ffd700]">{row.kelly}</td>
                      <td className="p-3 text-[#4ecdc4]">{row.ev}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card className="p-6">
              <div className="text-[11px] text-[#ff6b35] tracking-[3px] mb-4">
                REALISTIC MONTHLY — $2,000 START
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Conservative (5 trades/week, 55% win)",
                    value: "$200-400/mo",
                    color: "#888",
                  },
                  {
                    label: "Base case (10 trades/week, 60% win)",
                    value: "$600-1,200/mo",
                    color: "#4ecdc4",
                  },
                  {
                    label: "Optimistic (15 trades/week, 65% win)",
                    value: "$1,500-2,500/mo",
                    color: "#00ff88",
                  },
                  {
                    label: "The viral post (lol no)",
                    value: "$238K in 11d",
                    color: "#ff4757",
                  },
                ].map((proj, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-[#111] last:border-0"
                  >
                    <span className="text-[#888] text-sm">{proj.label}</span>
                    <span
                      className="font-bold font-mono"
                      style={{ color: proj.color }}
                    >
                      {proj.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* RISKS */}
        {activeTab === "risks" && (
          <div className="space-y-4">
            {RISKS.map((risk, i) => (
              <Card
                key={i}
                variant={risk.severity === "HIGH" ? "risk" : "default"}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="text-[#fff] font-semibold">{risk.risk}</span>
                  <div className="flex gap-2">
                    <Badge variant="muted">PROB: {risk.prob}</Badge>
                    <Badge
                      variant={
                        risk.severity === "HIGH"
                          ? "risk"
                          : risk.severity === "MEDIUM"
                            ? "warning"
                            : "edge"
                      }
                    >
                      {risk.severity}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-[#888]">
                  <span className="text-[#4ecdc4]">MITIGATION: </span>
                  {risk.mitigation}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a2a] mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-[#444]">
          <div>MACHINEMIND CONSULTING · POLYMARKET EDGE FINDER v1.0</div>
          <div>Paper trade first. Always. No exceptions.</div>
        </div>
      </div>
    </div>
  );
}

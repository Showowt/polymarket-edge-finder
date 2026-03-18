"use client";

import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

interface EdgeAnalysisProps {
  data: {
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
  } | null;
  loading?: boolean;
}

export function EdgeAnalysis({ data, loading }: EdgeAnalysisProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#888]">Analyzing with Claude...</span>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-[#666] text-center">
          Select a market to analyze
        </div>
      </Card>
    );
  }

  const { market, edge, position, validation, recommendation } = data;
  const isTradeable = edge.tradeable && position.approved && validation.valid;

  return (
    <Card variant={isTradeable ? "edge" : "default"} className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[11px] text-[#666] tracking-[2px] uppercase mb-2">
            ANALYSIS
          </div>
          <h3 className="text-[#fff] font-medium text-lg leading-tight">
            {market.question}
          </h3>
        </div>
        <Badge
          variant={
            edge.confidence === "high"
              ? "edge"
              : edge.confidence === "medium"
                ? "warning"
                : "muted"
          }
        >
          {edge.confidence} confidence
        </Badge>
      </div>

      {/* Edge Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0a0a0f] p-4">
          <div className="text-[10px] text-[#666] tracking-[2px] uppercase mb-1">
            MARKET PRICE
          </div>
          <div className="text-[#888] font-mono text-lg">
            {(market.yesPrice * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[#0a0a0f] p-4">
          <div className="text-[10px] text-[#00ff88] tracking-[2px] uppercase mb-1">
            CLAUDE ESTIMATE
          </div>
          <div className="text-[#00ff88] font-mono text-lg font-bold">
            {(edge.estimate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[#0a0a0f] p-4">
          <div className="text-[10px] text-[#ff6b35] tracking-[2px] uppercase mb-1">
            EDGE SIZE
          </div>
          <div className="text-[#ff6b35] font-mono text-lg font-bold">
            {(edge.size * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[#0a0a0f] p-4">
          <div className="text-[10px] text-[#4ecdc4] tracking-[2px] uppercase mb-1">
            DIRECTION
          </div>
          <div className="text-[#4ecdc4] font-mono text-lg">
            {edge.direction.replace("_", " ").toUpperCase()}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-[#0a0a0f] p-4 mb-6">
        <div className="text-[10px] text-[#666] tracking-[2px] uppercase mb-2">
          CLAUDE&apos;S REASONING
        </div>
        <p className="text-[#ccc] text-sm leading-relaxed">{edge.reasoning}</p>
      </div>

      {/* Position Sizing */}
      {position.approved ? (
        <div className="bg-[#00ff8810] border border-[#00ff8830] p-4 mb-6">
          <div className="text-[10px] text-[#00ff88] tracking-[2px] uppercase mb-2">
            RECOMMENDED POSITION
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[#00ff88] font-mono text-2xl font-bold">
              ${position.dollarAmount}
            </span>
            <span className="text-[#666] text-sm">
              ({(position.fraction * 100).toFixed(1)}% of bankroll)
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-[#ff475710] border border-[#ff475730] p-4 mb-6">
          <div className="text-[10px] text-[#ff4757] tracking-[2px] uppercase mb-2">
            POSITION BLOCKED
          </div>
          <p className="text-[#ff4757] text-sm">{position.reason}</p>
        </div>
      )}

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <div className="bg-[#ff475710] border border-[#ff475730] p-4 mb-6">
          <div className="text-[10px] text-[#ff4757] tracking-[2px] uppercase mb-2">
            VALIDATION WARNINGS
          </div>
          <ul className="space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i} className="text-[#ff4757] text-sm">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      <div
        className={`p-4 text-center ${isTradeable ? "bg-[#00ff8820]" : "bg-[#1a1a2a]"}`}
      >
        <div className="text-[10px] text-[#666] tracking-[2px] uppercase mb-2">
          RECOMMENDATION
        </div>
        <div
          className={`font-mono text-xl font-bold ${isTradeable ? "text-[#00ff88]" : "text-[#666]"}`}
        >
          {recommendation}
        </div>
      </div>
    </Card>
  );
}

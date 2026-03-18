"use client";

import { useState } from "react";
import { Badge } from "./ui/Badge";
import type { Market } from "@/lib/polymarket";

interface MarketTableProps {
  markets: Market[];
  onAnalyze?: (marketId: string) => void;
  analyzing?: string | null;
}

export function MarketTable({
  markets,
  onAnalyze,
  analyzing,
}: MarketTableProps) {
  const [sortField, setSortField] = useState<keyof Market>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...markets].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (field: keyof Market) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const formatPrice = (price: number) => `${(price * 100).toFixed(1)}%`;
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `$${(vol / 1000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const getTimeRemaining = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    return `${hours}h`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#1a1a2a]">
            <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px] uppercase">
              Market
            </th>
            <th
              className="text-left p-3 text-[10px] text-[#666] tracking-[2px] uppercase cursor-pointer hover:text-[#00ff88]"
              onClick={() => handleSort("yesPrice")}
            >
              Yes {sortField === "yesPrice" && (sortDir === "asc" ? "↑" : "↓")}
            </th>
            <th
              className="text-left p-3 text-[10px] text-[#666] tracking-[2px] uppercase cursor-pointer hover:text-[#00ff88]"
              onClick={() => handleSort("volume")}
            >
              Volume {sortField === "volume" && (sortDir === "asc" ? "↑" : "↓")}
            </th>
            <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px] uppercase">
              Closes
            </th>
            <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px] uppercase">
              Category
            </th>
            <th className="text-left p-3 text-[10px] text-[#666] tracking-[2px] uppercase">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((market, i) => (
            <tr
              key={market.id}
              className={`border-b border-[#0f0f18] ${i % 2 === 0 ? "bg-[#0a0a0f]" : "bg-[#0d0d12]"} hover:bg-[#111118] transition-colors`}
            >
              <td className="p-3 max-w-[400px]">
                <div className="text-[#fff] font-medium truncate">
                  {market.question}
                </div>
              </td>
              <td className="p-3">
                <span className="text-[#00ff88] font-mono font-bold">
                  {formatPrice(market.yesPrice)}
                </span>
              </td>
              <td className="p-3">
                <span className="text-[#888] font-mono">
                  {formatVolume(market.volume)}
                </span>
              </td>
              <td className="p-3">
                <span className="text-[#666] font-mono">
                  {getTimeRemaining(market.endDate)}
                </span>
              </td>
              <td className="p-3">
                {market.category && (
                  <Badge variant="muted">{market.category}</Badge>
                )}
              </td>
              <td className="p-3">
                <button
                  onClick={() => onAnalyze?.(market.id)}
                  disabled={analyzing === market.id}
                  className="px-3 py-1.5 text-[10px] font-bold tracking-[2px] uppercase bg-[#00ff8815] border border-[#00ff8840] text-[#00ff88] hover:bg-[#00ff8830] disabled:opacity-50 disabled:cursor-wait transition-colors"
                >
                  {analyzing === market.id ? "..." : "Analyze"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {markets.length === 0 && (
        <div className="text-center py-12 text-[#666]">No markets found</div>
      )}
    </div>
  );
}

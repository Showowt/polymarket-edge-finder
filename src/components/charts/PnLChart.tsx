"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface PnLDataPoint {
  date: string;
  pnl: number;
  cumulative: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
}

export function PnLChart({ data }: PnLChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2a" />
          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fill: "#666", fontSize: 11 }}
            tickFormatter={(value) => String(value).slice(5)}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: "#666", fontSize: 11 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0d1117",
              border: "1px solid #1a1a2a",
              borderRadius: 0,
            }}
            labelStyle={{ color: "#888" }}
            formatter={(value) => [
              `$${typeof value === "number" ? value.toFixed(2) : value}`,
              "P&L",
            ]}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#00ff88"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPnl)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyPnLChart({ data }: PnLChartProps) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2a" />
          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fill: "#666", fontSize: 10 }}
            tickFormatter={(value) => String(value).slice(5)}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: "#666", fontSize: 10 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0d1117",
              border: "1px solid #1a1a2a",
              borderRadius: 0,
            }}
            labelStyle={{ color: "#888" }}
            formatter={(value) => [
              `$${typeof value === "number" ? value.toFixed(2) : value}`,
              "Daily P&L",
            ]}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#4ecdc4"
            strokeWidth={2}
            dot={{ fill: "#4ecdc4", strokeWidth: 0, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

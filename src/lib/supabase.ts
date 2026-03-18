// lib/supabase.ts
// Supabase Client Configuration

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create client only if we have valid credentials
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder")) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Admin client for server-side operations
export function createServerClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

// Types for database tables
export interface DbMarket {
  id: string;
  question: string;
  description: string | null;
  yes_price: number;
  no_price: number;
  volume: number;
  liquidity: number;
  end_date: string;
  category: string | null;
  condition_id: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface DbOpportunity {
  id: string;
  market_id: string;
  question: string;
  market_price: number;
  claude_estimate: number;
  edge_size: number;
  direction: "buy_yes" | "buy_no";
  reasoning: string;
  confidence: "high" | "medium" | "low";
  tradeable: boolean;
  scanned_at: string;
  created_at: string;
}

export interface DbTrade {
  id: string;
  market_id: string;
  direction: "buy_yes" | "buy_no";
  entry_price: number;
  size_usd: number;
  claude_estimate: number;
  edge_at_entry: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  status: "paper" | "pending" | "open" | "closed" | "cancelled";
  exit_price: number | null;
  pnl: number | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPosition {
  id: string;
  market_id: string;
  question: string;
  direction: "buy_yes" | "buy_no";
  entry_price: number;
  current_price: number;
  size_usd: number;
  unrealized_pnl: number;
  realized_pnl: number;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

// Helper functions
export async function logOpportunity(
  opportunity: Omit<DbOpportunity, "id" | "created_at">,
) {
  if (!supabase) {
    console.warn("[Supabase] Client not initialized, skipping log");
    return null;
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert(opportunity)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to log opportunity:", error);
    return null;
  }

  return data;
}

export async function logTrade(
  trade: Omit<DbTrade, "id" | "created_at" | "updated_at">,
) {
  if (!supabase) {
    console.warn("[Supabase] Client not initialized, skipping log");
    return null;
  }

  const { data, error } = await supabase
    .from("trades")
    .insert(trade)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to log trade:", error);
    return null;
  }

  return data;
}

export async function getOpenPositions() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] Failed to get positions:", error);
    return [];
  }

  return data as DbPosition[];
}

export async function getDailyPnL() {
  if (!supabase) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("trades")
    .select("pnl")
    .eq("status", "closed")
    .gte("closed_at", today.toISOString());

  if (error) {
    console.error("[Supabase] Failed to get daily PnL:", error);
    return 0;
  }

  return data.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
}

export async function getRecentOpportunities(limit = 20) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("scanned_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase] Failed to get opportunities:", error);
    return [];
  }

  return data as DbOpportunity[];
}

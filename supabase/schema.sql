-- Polymarket Edge Finder Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Markets table (cached from Polymarket)
CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT,
  yes_price DECIMAL(5,4) NOT NULL,
  no_price DECIMAL(5,4) NOT NULL,
  volume DECIMAL(20,2) NOT NULL DEFAULT 0,
  liquidity DECIMAL(20,2) NOT NULL DEFAULT 0,
  end_date TIMESTAMPTZ NOT NULL,
  category TEXT,
  condition_id TEXT,
  slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Opportunities table (Claude edge analysis results)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT NOT NULL REFERENCES markets(id),
  question TEXT NOT NULL,
  market_price DECIMAL(5,4) NOT NULL,
  claude_estimate DECIMAL(5,4) NOT NULL,
  edge_size DECIMAL(5,4) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy_yes', 'buy_no')),
  reasoning TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  tradeable BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trades table (paper and live trades)
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT NOT NULL,
  question TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy_yes', 'buy_no')),
  entry_price DECIMAL(5,4) NOT NULL,
  size_usd DECIMAL(20,2) NOT NULL,
  claude_estimate DECIMAL(5,4) NOT NULL,
  edge_at_entry DECIMAL(5,4) NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'paper' CHECK (status IN ('paper', 'pending', 'open', 'closed', 'cancelled')),
  exit_price DECIMAL(5,4),
  pnl DECIMAL(20,2),
  tx_hash TEXT, -- For live trades
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Positions table (current holdings)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id TEXT NOT NULL,
  question TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy_yes', 'buy_no')),
  entry_price DECIMAL(5,4) NOT NULL,
  current_price DECIMAL(5,4) NOT NULL,
  size_usd DECIMAL(20,2) NOT NULL,
  unrealized_pnl DECIMAL(20,2) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(20,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily P&L snapshots
CREATE TABLE IF NOT EXISTS daily_pnl (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  starting_bankroll DECIMAL(20,2) NOT NULL,
  ending_bankroll DECIMAL(20,2) NOT NULL,
  daily_pnl DECIMAL(20,2) NOT NULL,
  cumulative_pnl DECIMAL(20,2) NOT NULL,
  trades_opened INT NOT NULL DEFAULT 0,
  trades_closed INT NOT NULL DEFAULT 0,
  win_count INT NOT NULL DEFAULT 0,
  loss_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Risk alerts log
CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('bankroll', '2000'::jsonb),
  ('risk_limits', '{
    "max_daily_drawdown": 0.15,
    "max_single_position": 0.20,
    "max_open_positions": 8,
    "min_edge": 0.15,
    "min_confidence": "high",
    "min_liquidity": 1000
  }'::jsonb),
  ('trading_mode', '"paper"'::jsonb),
  ('kill_switch', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_market_id ON opportunities(market_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_scanned_at ON opportunities(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_tradeable ON opportunities(tradeable) WHERE tradeable = true;
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_daily_pnl_date ON daily_pnl(date DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_markets_updated_at ON markets;
CREATE TRIGGER update_markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (enable for production)
-- ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_pnl ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users full access
-- CREATE POLICY "Allow authenticated access" ON markets FOR ALL USING (auth.role() = 'authenticated');
-- Repeat for other tables...

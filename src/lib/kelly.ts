// lib/kelly.ts
// Kelly Criterion Position Sizing + Risk Management

export interface PositionSize {
  fraction: number;
  dollarAmount: number;
  approved: boolean;
  reason?: string;
}

export interface RiskParams {
  bankroll: number;
  claudeEstimate: number;
  marketPrice: number;
  edgeDirection: "buy_yes" | "buy_no" | "no_edge";
  currentOpenPositions: number;
  dailyPnl: number;
  totalExposure?: number;
}

// Risk limits - hardcoded for safety
const RISK_LIMITS = {
  maxDailyDrawdown: 0.15, // Pause if down >15% today
  maxSinglePosition: 0.2, // Never >20% bankroll one market
  maxCorrelatedExposure: 0.4, // Max 40% in related markets
  maxOpenPositions: 8, // Cap concurrent bets
  minLiquidity: 1000, // Skip thin markets
  minConfidence: "high", // Only Claude high-confidence
  minEdge: 0.15, // Minimum 15% edge required
  kellyFraction: 0.25, // Use 25% Kelly (conservative)
  minTradeSize: 10, // Minimum $10 per trade
  maxTradeSize: 500, // Maximum $500 per trade (safety cap)
};

export function calculatePosition(params: RiskParams): PositionSize {
  const {
    bankroll,
    claudeEstimate,
    marketPrice,
    edgeDirection,
    dailyPnl,
    currentOpenPositions,
    totalExposure = 0,
  } = params;

  // KILL CONDITIONS — return 0 immediately

  // 1. Daily drawdown limit
  if (dailyPnl / bankroll < -RISK_LIMITS.maxDailyDrawdown) {
    return {
      fraction: 0,
      dollarAmount: 0,
      approved: false,
      reason: `Daily drawdown limit hit (${((dailyPnl / bankroll) * 100).toFixed(1)}%)`,
    };
  }

  // 2. Max open positions
  if (currentOpenPositions >= RISK_LIMITS.maxOpenPositions) {
    return {
      fraction: 0,
      dollarAmount: 0,
      approved: false,
      reason: `Max open positions reached (${currentOpenPositions}/${RISK_LIMITS.maxOpenPositions})`,
    };
  }

  // 3. Total exposure limit
  if (totalExposure / bankroll > RISK_LIMITS.maxCorrelatedExposure) {
    return {
      fraction: 0,
      dollarAmount: 0,
      approved: false,
      reason: `Total exposure limit reached (${((totalExposure / bankroll) * 100).toFixed(1)}%)`,
    };
  }

  // 4. No edge direction
  if (edgeDirection === "no_edge") {
    return {
      fraction: 0,
      dollarAmount: 0,
      approved: false,
      reason: "No edge detected",
    };
  }

  // Calculate entry price based on direction
  const entryPrice =
    edgeDirection === "buy_yes" ? marketPrice : 1 - marketPrice;
  const p = edgeDirection === "buy_yes" ? claudeEstimate : 1 - claudeEstimate;
  const q = 1 - p;

  // Decimal odds: how much you win per dollar risked
  const b = (1 - entryPrice) / entryPrice;

  // Kelly formula: f* = (bp - q) / b
  const kelly = (b * p - q) / b;

  // Negative Kelly = no edge
  if (kelly <= 0) {
    return {
      fraction: 0,
      dollarAmount: 0,
      approved: false,
      reason: `Negative Kelly (${(kelly * 100).toFixed(2)}%) — skip`,
    };
  }

  // Apply conservative fraction and cap
  let fraction = kelly * RISK_LIMITS.kellyFraction;
  fraction = Math.min(fraction, RISK_LIMITS.maxSinglePosition);

  // Calculate dollar amount
  let dollarAmount = Math.floor(bankroll * fraction);

  // Apply min/max trade size limits
  dollarAmount = Math.max(dollarAmount, RISK_LIMITS.minTradeSize);
  dollarAmount = Math.min(dollarAmount, RISK_LIMITS.maxTradeSize);

  // Don't exceed bankroll
  dollarAmount = Math.min(dollarAmount, bankroll);

  return {
    fraction,
    dollarAmount,
    approved: true,
  };
}

// Calculate expected value of a trade
export function calculateExpectedValue(params: {
  stake: number;
  probability: number;
  entryPrice: number;
}): { ev: number; evPercent: number } {
  const { stake, probability, entryPrice } = params;

  // Potential profit if win
  const potentialProfit = stake * ((1 - entryPrice) / entryPrice);

  // Expected value = (prob_win * profit) - (prob_loss * stake)
  const ev = probability * potentialProfit - (1 - probability) * stake;
  const evPercent = ev / stake;

  return { ev, evPercent };
}

// Validate all risk parameters before trade
export function validateTrade(params: {
  bankroll: number;
  tradeSize: number;
  marketVolume: number;
  marketLiquidity: number;
  confidence: "high" | "medium" | "low";
  edgeSize: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.tradeSize / params.bankroll > RISK_LIMITS.maxSinglePosition) {
    errors.push(
      `Trade size exceeds ${RISK_LIMITS.maxSinglePosition * 100}% of bankroll`,
    );
  }

  if (params.marketVolume < RISK_LIMITS.minLiquidity) {
    errors.push(`Market volume too low ($${params.marketVolume})`);
  }

  if (params.confidence !== RISK_LIMITS.minConfidence) {
    errors.push(
      `Confidence level "${params.confidence}" does not meet minimum "${RISK_LIMITS.minConfidence}"`,
    );
  }

  if (params.edgeSize < RISK_LIMITS.minEdge) {
    errors.push(
      `Edge size ${(params.edgeSize * 100).toFixed(1)}% below minimum ${RISK_LIMITS.minEdge * 100}%`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export { RISK_LIMITS };

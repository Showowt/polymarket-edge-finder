// src/lib/demo-data.ts
// Demo data: 2-month trading history, $500 → $6,500

// ============ HELPERS ============

function calcPnl(size: number, entry: number, exit: number): number {
  return Math.round((size / entry) * (exit - entry) * 100) / 100;
}

function trade(
  id: number,
  question: string,
  direction: "buy_yes" | "buy_no",
  entry: number,
  exit: number | null,
  size: number,
  status: "open" | "closed",
  openedAt: string,
  closedAt: string | null,
) {
  return {
    id: `trd-${String(id).padStart(3, "0")}`,
    marketId: `mkt-${String(id).padStart(3, "0")}`,
    question,
    direction,
    entryPrice: entry,
    exitPrice: exit,
    sizeUsd: size,
    pnl:
      exit !== null && status === "closed" ? calcPnl(size, entry, exit) : null,
    claudeEstimate:
      direction === "buy_yes"
        ? Math.min(entry + 0.17, 0.95)
        : Math.max(1 - entry - 0.17, 0.05),
    edgeAtEntry: 0.17,
    confidence: "high" as const,
    reasoning: "Calibrated probability divergence detected via multi-factor analysis",
    status,
    openedAt,
    closedAt,
  };
}

function position(
  id: number,
  question: string,
  direction: "buy_yes" | "buy_no",
  entry: number,
  current: number,
  size: number,
  createdAt: string,
) {
  const unrealizedPnL = calcPnl(size, entry, current);
  return {
    id: `pos-${String(id).padStart(3, "0")}`,
    marketId: `mkt-p${id}`,
    question,
    direction,
    entryPrice: entry,
    currentPrice: current,
    sizeUsd: size,
    unrealizedPnL,
    pnlPercent: Math.round((unrealizedPnL / size) * 10000) / 100,
    createdAt,
  };
}

// ============ DAILY P&L (62 days: Apr 6 - Jun 6, 2026) ============

const DAILY_PNL_VALUES = [
  // Week 1 (Apr 6-12): Small positions, learning
  12, 28, -5, 18, 15, -8, 20,
  // Week 2 (Apr 13-19): Gaining confidence
  22, 38, -12, 35, 28, -5, 34,
  // Week 3 (Apr 20-26): First big wins
  52, -18, 65, 42, 28, -15, 76,
  // Week 4 (Apr 27 - May 3): Drawdown then recovery
  -42, 55, 38, -25, 82, 52, 40,
  // Week 5 (May 4-10): Scaling up
  85, -35, 125, 78, 65, -28, 160,
  // Week 6 (May 11-17): Hot streak
  145, -55, 185, 120, 85, -40, 260,
  // Week 7 (May 18-24): Consolidation
  -120, 85, 165, -45, 180, 95, 140,
  // Week 8 (May 25-31): Acceleration
  280, -85, 350, 195, 250, -60, 470,
  // Week 9 (Jun 1-6): Strong close
  380, -120, 650, 540, 580, 270,
];

export function getDemoPnL() {
  const start = new Date("2026-04-06T00:00:00Z");
  let cumulative = 0;

  return DAILY_PNL_VALUES.map((daily, i) => {
    cumulative += daily;
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return {
      date: date.toISOString().split("T")[0],
      pnl: daily,
      cumulative,
    };
  });
}

// ============ STATS ============

export function getDemoStats() {
  return {
    bankroll: 3470,
    totalValue: 6500,
    openPositions: 7,
    totalTrades: 187,
    closedTrades: 180,
    unrealizedPnL: 660,
    realizedPnL: 5340,
    totalPnL: 6000,
    wins: 117,
    losses: 63,
    winRate: 65,
  };
}

// ============ OPEN POSITIONS (7) ============

export function getDemoPositions() {
  return [
    position(1, "Will the Fed cut rates at July 2026 FOMC?", "buy_yes", 0.38, 0.55, 400, "2026-05-29T08:12:00Z"),
    position(2, "Will Bitcoin exceed $200K by September 2026?", "buy_no", 0.55, 0.68, 450, "2026-06-01T15:30:00Z"),
    position(3, "Will Apple announce AI hardware at WWDC 2026?", "buy_yes", 0.32, 0.46, 300, "2026-05-28T10:45:00Z"),
    position(4, "Will US GDP growth exceed 3% in Q2 2026?", "buy_yes", 0.48, 0.62, 420, "2026-06-02T12:18:00Z"),
    position(5, "Will Ethereum surpass $10K by August 2026?", "buy_yes", 0.15, 0.28, 200, "2026-05-25T09:22:00Z"),
    position(6, "Will Congress pass stablecoin bill by August 2026?", "buy_yes", 0.52, 0.48, 280, "2026-06-03T14:55:00Z"),
    position(7, "Will SpaceX Starship complete orbital flight by July?", "buy_yes", 0.72, 0.65, 320, "2026-06-01T11:08:00Z"),
  ];
}

// ============ TRADES (50 most recent) ============

export function getDemoTrades() {
  return [
    // === June 1-6: Large positions ($250-500) ===
    trade(1, "Will Nvidia stock exceed $250 by July?", "buy_yes", 0.48, 0.62, 480, "closed", "2026-06-05T14:22:00Z", "2026-06-06T09:15:00Z"),
    trade(2, "Will Bitcoin exceed $150K by June 30?", "buy_yes", 0.55, 0.72, 420, "closed", "2026-06-04T11:30:00Z", "2026-06-06T02:45:00Z"),
    trade(3, "Will Trump's approval exceed 50% by July?", "buy_no", 0.55, 0.65, 380, "closed", "2026-06-05T08:10:00Z", "2026-06-06T06:30:00Z"),
    trade(4, "Will oil exceed $100/barrel by July?", "buy_yes", 0.35, 0.28, 320, "closed", "2026-06-04T16:45:00Z", "2026-06-05T22:10:00Z"),
    trade(5, "Will OpenAI IPO by end of 2026?", "buy_yes", 0.22, 0.35, 280, "closed", "2026-06-03T09:20:00Z", "2026-06-05T18:45:00Z"),
    trade(6, "Will EU impose new AI regulations by July?", "buy_no", 0.48, 0.56, 350, "closed", "2026-06-04T13:15:00Z", "2026-06-05T14:30:00Z"),
    trade(7, "Will a major bank fail in US in 2026?", "buy_no", 0.82, 0.88, 450, "closed", "2026-06-02T10:40:00Z", "2026-06-05T11:20:00Z"),
    trade(8, "Will US unemployment exceed 5% by July?", "buy_yes", 0.18, 0.25, 250, "closed", "2026-06-03T15:30:00Z", "2026-06-05T08:15:00Z"),
    trade(9, "Will gold exceed $3,500/oz by July?", "buy_yes", 0.42, 0.55, 400, "closed", "2026-06-02T08:55:00Z", "2026-06-04T16:40:00Z"),
    trade(10, "Will Democrats win special election in TX-18?", "buy_no", 0.55, 0.48, 320, "closed", "2026-06-03T12:10:00Z", "2026-06-04T21:30:00Z"),
    trade(11, "Will Solana flip Ethereum in DEX volume?", "buy_yes", 0.15, 0.22, 200, "closed", "2026-06-01T09:45:00Z", "2026-06-03T15:20:00Z"),
    trade(12, "Will Mexico GDP growth exceed 2% in Q2?", "buy_yes", 0.62, 0.58, 350, "closed", "2026-06-01T14:30:00Z", "2026-06-03T10:15:00Z"),

    // === May 25-31: Growing positions ($150-450) ===
    trade(13, "Will Fed cut rates in June FOMC?", "buy_yes", 0.35, 0.48, 350, "closed", "2026-05-28T11:20:00Z", "2026-05-31T16:45:00Z"),
    trade(14, "Will Tesla deliver Robotaxi by Q3 2026?", "buy_yes", 0.28, 0.22, 250, "closed", "2026-05-29T09:15:00Z", "2026-05-31T14:30:00Z"),
    trade(15, "Will Japan Nikkei reach 50,000?", "buy_yes", 0.45, 0.58, 280, "closed", "2026-05-27T08:40:00Z", "2026-05-30T12:20:00Z"),
    trade(16, "Will Category 5 hurricane hit US in 2026?", "buy_no", 0.72, 0.82, 320, "closed", "2026-05-26T15:30:00Z", "2026-05-30T09:45:00Z"),
    trade(17, "Will TikTok ban be enforced by July?", "buy_yes", 0.32, 0.45, 280, "closed", "2026-05-25T10:10:00Z", "2026-05-29T18:30:00Z"),
    trade(18, "Will Anthropic valuation exceed $100B?", "buy_yes", 0.55, 0.68, 380, "closed", "2026-05-26T13:25:00Z", "2026-05-29T15:40:00Z"),
    trade(19, "Will Bitcoin exceed $150K by June 30?", "buy_yes", 0.48, 0.55, 320, "closed", "2026-05-25T08:50:00Z", "2026-05-28T22:15:00Z"),
    trade(20, "Will Congress pass crypto regulation bill?", "buy_yes", 0.42, 0.35, 250, "closed", "2026-05-27T14:20:00Z", "2026-05-28T16:45:00Z"),
    trade(21, "Will SpaceX Starship reach orbit by June?", "buy_yes", 0.65, 0.78, 300, "closed", "2026-05-25T12:30:00Z", "2026-05-27T09:20:00Z"),
    trade(22, "Will UK rejoin EU single market by 2027?", "buy_no", 0.85, 0.92, 280, "closed", "2026-05-26T09:15:00Z", "2026-05-27T14:50:00Z"),

    // === May 18-24: Mid-range ($120-280) ===
    trade(23, "Will Trump announce 2028 run by July?", "buy_no", 0.62, 0.72, 220, "closed", "2026-05-20T10:30:00Z", "2026-05-24T15:20:00Z"),
    trade(24, "Will inflation drop below 2% by Q3?", "buy_yes", 0.38, 0.52, 200, "closed", "2026-05-19T08:45:00Z", "2026-05-23T12:30:00Z"),
    trade(25, "Will Apple announce AR glasses at WWDC?", "buy_yes", 0.25, 0.38, 180, "closed", "2026-05-18T11:15:00Z", "2026-05-22T16:45:00Z"),
    trade(26, "Will US GDP exceed 3% Q2?", "buy_yes", 0.52, 0.45, 200, "closed", "2026-05-21T14:20:00Z", "2026-05-23T09:10:00Z"),
    trade(27, "Will Amazon acquire major AI company?", "buy_yes", 0.18, 0.28, 150, "closed", "2026-05-18T09:30:00Z", "2026-05-22T11:40:00Z"),
    trade(28, "Will Boeing 737 MAX be grounded again?", "buy_no", 0.75, 0.82, 200, "closed", "2026-05-19T15:10:00Z", "2026-05-21T18:30:00Z"),
    trade(29, "Will Lakers make 2026 NBA playoffs?", "buy_yes", 0.42, 0.55, 180, "closed", "2026-05-18T12:45:00Z", "2026-05-20T22:15:00Z"),
    trade(30, "Will drought worsen in California by July?", "buy_yes", 0.58, 0.52, 160, "closed", "2026-05-20T08:20:00Z", "2026-05-21T14:50:00Z"),

    // === May 11-17: Scaling ($80-200) ===
    trade(31, "Will Nvidia exceed $200 by June?", "buy_yes", 0.48, 0.62, 160, "closed", "2026-05-12T09:30:00Z", "2026-05-16T15:45:00Z"),
    trade(32, "Will Ethereum hit $10K by July?", "buy_yes", 0.15, 0.22, 120, "closed", "2026-05-11T11:20:00Z", "2026-05-15T18:30:00Z"),
    trade(33, "Will ceasefire in Ukraine by July?", "buy_no", 0.72, 0.78, 150, "closed", "2026-05-13T08:45:00Z", "2026-05-16T12:15:00Z"),
    trade(34, "Will OpenAI IPO in 2026?", "buy_yes", 0.18, 0.15, 100, "closed", "2026-05-14T14:30:00Z", "2026-05-16T09:20:00Z"),
    trade(35, "Will gold exceed $3,000/oz?", "buy_yes", 0.72, 0.85, 140, "closed", "2026-05-11T10:15:00Z", "2026-05-14T16:40:00Z"),
    trade(36, "Will NYC Mayor resign by 2026?", "buy_no", 0.65, 0.72, 120, "closed", "2026-05-12T15:50:00Z", "2026-05-14T11:30:00Z"),

    // === May 4-10: Finding rhythm ($40-120) ===
    trade(37, "Will Bitcoin exceed $125K by May 31?", "buy_yes", 0.55, 0.72, 100, "closed", "2026-05-04T09:15:00Z", "2026-05-09T14:45:00Z"),
    trade(38, "Will Fed hint at rate cut in May speech?", "buy_yes", 0.32, 0.48, 80, "closed", "2026-05-05T11:30:00Z", "2026-05-08T16:20:00Z"),
    trade(39, "Will oil exceed $90/barrel by June?", "buy_yes", 0.45, 0.38, 80, "closed", "2026-05-06T08:40:00Z", "2026-05-08T12:10:00Z"),
    trade(40, "Will Solana exceed $300 by June?", "buy_yes", 0.22, 0.35, 60, "closed", "2026-05-04T14:20:00Z", "2026-05-07T18:30:00Z"),
    trade(41, "Will Supreme Court rule on crypto case?", "buy_yes", 0.58, 0.65, 70, "closed", "2026-05-05T10:45:00Z", "2026-05-07T09:15:00Z"),

    // === April 20 - May 3: Early scaling ($25-60) ===
    trade(42, "Will Trump rally attendance exceed 50K?", "buy_yes", 0.35, 0.48, 50, "closed", "2026-04-28T09:30:00Z", "2026-05-02T15:20:00Z"),
    trade(43, "Will China GDP exceed 5% Q1?", "buy_yes", 0.62, 0.55, 40, "closed", "2026-04-25T11:15:00Z", "2026-04-30T16:45:00Z"),
    trade(44, "Will new AI model beat GPT-5 benchmarks?", "buy_yes", 0.28, 0.42, 35, "closed", "2026-04-22T08:50:00Z", "2026-04-28T14:30:00Z"),
    trade(45, "Will hydrogen fuel cells exceed 100K sales?", "buy_no", 0.82, 0.88, 45, "closed", "2026-04-24T14:20:00Z", "2026-04-28T10:15:00Z"),
    trade(46, "Will FIFA 2026 exceed 5M attendance?", "buy_yes", 0.72, 0.78, 40, "closed", "2026-04-20T10:30:00Z", "2026-04-25T18:40:00Z"),

    // === April 6-19: First trades ($10-30) ===
    trade(47, "Will Bitcoin exceed $100K by April 30?", "buy_yes", 0.75, 0.88, 25, "closed", "2026-04-08T09:20:00Z", "2026-04-15T14:30:00Z"),
    trade(48, "Will Fed keep rates at May FOMC?", "buy_yes", 0.82, 0.92, 20, "closed", "2026-04-06T11:45:00Z", "2026-04-12T16:15:00Z"),
    trade(49, "Will Ethereum exceed $5K by May?", "buy_yes", 0.35, 0.28, 15, "closed", "2026-04-10T08:30:00Z", "2026-04-14T12:50:00Z"),
    trade(50, "Will Tesla stock exceed $250 by May?", "buy_yes", 0.42, 0.55, 20, "closed", "2026-04-07T13:15:00Z", "2026-04-11T09:40:00Z"),
  ];
}

// ============ OPPORTUNITIES (8 live) ============

export function getDemoOpportunities() {
  const now = Date.now();
  return [
    {
      id: "opp-001",
      marketId: "mkt-opp-1",
      question: "Will the Fed cut rates at September 2026 FOMC?",
      marketPrice: 0.35,
      claudeEstimate: 0.52,
      edgeSize: 0.17,
      direction: "buy_yes" as const,
      reasoning: "Historical FOMC patterns and current inflation trajectory suggest rate action is significantly more likely than market implies. Labor market cooling provides additional catalyst.",
      confidence: "high" as const,
      tradeable: true,
      scannedAt: new Date(now - 2 * 60000).toISOString(),
    },
    {
      id: "opp-002",
      marketId: "mkt-opp-2",
      question: "Will Nvidia announce next-gen AI chip at GTC 2026?",
      marketPrice: 0.42,
      claudeEstimate: 0.65,
      edgeSize: 0.23,
      direction: "buy_yes" as const,
      reasoning: "Nvidia's product cycle cadence and leaked supply chain data strongly suggest announcement. Competitor timelines create strategic pressure for early reveal.",
      confidence: "high" as const,
      tradeable: true,
      scannedAt: new Date(now - 3 * 60000).toISOString(),
    },
    {
      id: "opp-003",
      marketId: "mkt-opp-3",
      question: "Will Bitcoin exceed $250K by end of 2026?",
      marketPrice: 0.22,
      claudeEstimate: 0.08,
      edgeSize: 0.14,
      direction: "buy_no" as const,
      reasoning: "Current cycle dynamics and historical post-halving patterns suggest this target is overpriced. Institutional inflows have plateaued and macro headwinds persist.",
      confidence: "high" as const,
      tradeable: true,
      scannedAt: new Date(now - 4 * 60000).toISOString(),
    },
    {
      id: "opp-004",
      marketId: "mkt-opp-4",
      question: "Will a Democrat win GA special election?",
      marketPrice: 0.38,
      claudeEstimate: 0.56,
      edgeSize: 0.18,
      direction: "buy_yes" as const,
      reasoning: "District demographics shifted significantly since redistricting. Early voting data and registration trends favor Democratic turnout model.",
      confidence: "high" as const,
      tradeable: true,
      scannedAt: new Date(now - 5 * 60000).toISOString(),
    },
    {
      id: "opp-005",
      marketId: "mkt-opp-5",
      question: "Will US CPI drop below 2% in June report?",
      marketPrice: 0.28,
      claudeEstimate: 0.45,
      edgeSize: 0.17,
      direction: "buy_yes" as const,
      reasoning: "Shelter component lag effect is now flowing through. Used car prices declining and energy costs stabilized. Leading indicators suggest sub-2% print.",
      confidence: "medium" as const,
      tradeable: true,
      scannedAt: new Date(now - 1 * 60000).toISOString(),
    },
    {
      id: "opp-006",
      marketId: "mkt-opp-6",
      question: "Will Apple stock hit $300 by July?",
      marketPrice: 0.32,
      claudeEstimate: 0.48,
      edgeSize: 0.16,
      direction: "buy_yes" as const,
      reasoning: "WWDC catalyst combined with services revenue acceleration and AI features monetization. Buyback program provides floor support.",
      confidence: "high" as const,
      tradeable: true,
      scannedAt: new Date(now - 6 * 60000).toISOString(),
    },
    {
      id: "opp-007",
      marketId: "mkt-opp-7",
      question: "Will oil prices drop below $70 by August?",
      marketPrice: 0.52,
      claudeEstimate: 0.38,
      edgeSize: 0.14,
      direction: "buy_no" as const,
      reasoning: "OPEC+ production cuts holding firm. Summer driving season demand increase offsets recession concerns. Geopolitical supply risks remain elevated.",
      confidence: "medium" as const,
      tradeable: true,
      scannedAt: new Date(now - 7 * 60000).toISOString(),
    },
    {
      id: "opp-008",
      marketId: "mkt-opp-8",
      question: "Will Anthropic release Claude 5 by August?",
      marketPrice: 0.25,
      claudeEstimate: 0.42,
      edgeSize: 0.17,
      direction: "buy_yes" as const,
      reasoning: "Competitive pressure from OpenAI and Google accelerates release cycles. Hiring patterns and compute allocation suggest imminent capability jump.",
      confidence: "medium" as const,
      tradeable: true,
      scannedAt: new Date(now - 8 * 60000).toISOString(),
    },
  ];
}

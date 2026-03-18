# Polymarket Edge Finder

Claude-powered prediction market arbitrage engine. Scans Polymarket for mispricings, uses Claude to estimate true probabilities, and identifies high-edge opportunities with Kelly-optimal position sizing.

## Features

- **Market Scanner** - Real-time feed from Polymarket Gamma API
- **Claude Intelligence** - Independent probability estimates, not anchored to market prices
- **Kelly Sizing** - Conservative 25% Kelly with 20% position caps
- **Paper Trading** - Validate edge before risking capital
- **Risk Engine** - Drawdown limits, position caps, kill switch
- **Dashboard** - P&L tracking, trade history, Claude reasoning logs

## Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude Sonnet via Anthropic API
- **Blockchain**: Polygon (for live trading)
- **Hosting**: Vercel (dashboard) + Railway (bot)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Risk Limits

| Parameter | Value |
|-----------|-------|
| Max Daily Drawdown | 15% |
| Max Single Position | 20% |
| Max Open Positions | 8 |
| Min Edge Required | 15% |
| Confidence Required | HIGH |

## Important

- PAPER TRADE FIRST - 7 days minimum
- NOT US LEGAL - Polymarket geo-blocked
- HOT WALLET < $500 - Smart contract risk

## License

Proprietary - MachineMind Consulting

// bot/scanner.js
// Polymarket Edge Finder - Auto Trading Bot
// Supports both PAPER and LIVE trading modes

const GAMMA_API = 'https://gamma-api.polymarket.com';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// Import live trading module (only if in live mode)
let trader = null;

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// Trading Mode: 'paper' or 'live'
const TRADING_MODE = process.env.TRADING_MODE || 'paper';
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;

// Trading Configuration - 10X AGGRESSIVE MODE
const CONFIG = {
  scanInterval: 60_000, // 1 minute
  priceUpdateInterval: 180_000, // 3 minutes
  cacheTtl: 300_000, // 5 minutes

  // Risk Limits - AGGRESSIVE
  initialBankroll: parseFloat(process.env.BANKROLL || '500'),
  minEdge: 0.08, // 8% minimum edge
  maxSinglePosition: 0.15, // 15% max per position
  maxOpenPositions: 25, // 25 concurrent positions
  kellyFraction: 0.40, // 40% Kelly
  minTradeSize: 5, // $5 minimum
  maxDailyDrawdown: 0.25, // 25% max daily loss

  // Accept MEDIUM and HIGH confidence
  minConfidence: 'medium',

  // Analyze more markets per scan
  maxAnalysisPerScan: 20,

  claudeModel: 'claude-sonnet-4-20250514',
};

// In-memory state
const cache = new Map();
let currentBankroll = CONFIG.initialBankroll;
let dailyStartBankroll = CONFIG.initialBankroll;
let openPositions = [];
let tradesToday = 0;

// System prompt for Claude
const SYSTEM_PROMPT = `You are a calibrated prediction market analyst.
Your job: estimate the TRUE probability of binary outcomes.
You are precise, data-driven, and NOT influenced by market prices.
Always return valid JSON only. No markdown. No explanation outside JSON.`;

// ==================== LIVE TRADING ====================

async function initializeLiveTrading() {
  if (TRADING_MODE !== 'live' || !PRIVATE_KEY) {
    return false;
  }

  try {
    const { createTrader } = require('./trading.js');
    trader = createTrader(PRIVATE_KEY);
    await trader.initialize();
    console.log('[LIVE] Trading client initialized');
    return true;
  } catch (error) {
    console.error('[LIVE] Failed to initialize:', error.message);
    return false;
  }
}

async function executeLiveTrade(market, edge, sizing) {
  if (!trader) {
    console.error('[LIVE] Trader not initialized');
    return null;
  }

  try {
    const result = await trader.executeTrade({
      marketId: market.id,
      direction: edge.edge_direction,
      dollarAmount: sizing.dollarAmount,
      currentPrice: market.yesPrice,
    });

    if (result.success) {
      console.log(`[LIVE] Order placed: ${result.orderId}`);
      return result;
    } else {
      console.error(`[LIVE] Order failed: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error('[LIVE] Trade execution error:', error.message);
    return null;
  }
}

// ==================== SUPABASE HELPERS ====================

async function supabaseQuery(table, method, data = null, filters = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filters) {
    url += `?${filters}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
  };

  const options = { method, headers };
  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Supabase] Error ${res.status}:`, text.slice(0, 200));
      return null;
    }
    if (method === 'GET' || method === 'POST') {
      return await res.json();
    }
    return true;
  } catch (error) {
    console.error('[Supabase] Request failed:', error.message);
    return null;
  }
}

async function supabaseUpsert(table, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': `resolution=merge-duplicates,return=representation`,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Supabase] Upsert error:`, text.slice(0, 200));
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error('[Supabase] Upsert failed:', error.message);
    return null;
  }
}

// ==================== MARKET DATA ====================

async function getActiveMarkets() {
  try {
    const res = await fetch(`${GAMMA_API}/markets?active=true&closed=false&limit=100`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    return data.map(m => {
      let yesPrice = 0;
      let noPrice = 0;

      if (m.outcomePrices) {
        if (Array.isArray(m.outcomePrices)) {
          yesPrice = parseFloat(m.outcomePrices[0]) || 0;
          noPrice = parseFloat(m.outcomePrices[1]) || 0;
        } else if (typeof m.outcomePrices === 'string') {
          try {
            const prices = JSON.parse(m.outcomePrices);
            yesPrice = parseFloat(prices[0]) || 0;
            noPrice = parseFloat(prices[1]) || 0;
          } catch (e) {}
        }
      }

      if ((yesPrice === 0 || noPrice === 0) && m.tokens) {
        const yesToken = m.tokens.find(t => t.outcome === 'Yes');
        const noToken = m.tokens.find(t => t.outcome === 'No');
        if (yesToken) yesPrice = parseFloat(yesToken.price) || yesPrice;
        if (noToken) noPrice = parseFloat(noToken.price) || noPrice;
      }

      return {
        id: m.id,
        conditionId: m.conditionId,
        question: m.question,
        description: m.description || '',
        yesPrice,
        noPrice,
        volume: parseFloat(m.volume || 0),
        liquidity: parseFloat(m.liquidity || 0),
        endDate: m.endDateIso,
        category: m.tags?.[0]?.label || null,
        tokens: m.tokens, // Include for live trading
      };
    });
  } catch (error) {
    console.error('[Scanner] Failed to fetch markets:', error.message);
    return [];
  }
}

// ==================== CLAUDE ANALYSIS ====================

async function getEdgeEstimate(market) {
  const userPrompt = `Analyze this prediction market:

QUESTION: ${market.question}
DETAILS: ${market.description}
CURRENT MARKET PRICE (YES): ${(market.yesPrice * 100).toFixed(1)}%
CLOSES: ${market.endDate}
VOLUME: $${market.volume.toLocaleString()}

Provide your independent probability estimate.
Return ONLY this JSON:
{
  "estimate": 0.XX,
  "confidence": "high|medium|low",
  "reasoning": "2-3 sentences max",
  "edge_direction": "buy_yes|buy_no|no_edge",
  "edge_size": 0.XX
}`;

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CONFIG.claudeModel,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error('[Claude] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    const edgeSize = parsed.edge_size ?? Math.abs(parsed.estimate - market.yesPrice);

    // Check confidence threshold
    const confidenceLevels = { 'high': 3, 'medium': 2, 'low': 1 };
    const minConfLevel = confidenceLevels[CONFIG.minConfidence] || 2;
    const actualConfLevel = confidenceLevels[parsed.confidence] || 0;
    const meetsConfidence = actualConfLevel >= minConfLevel;

    return {
      ...parsed,
      edge_size: edgeSize,
      tradeable: meetsConfidence && edgeSize >= CONFIG.minEdge,
    };
  } catch (error) {
    console.error('[Claude] Analysis failed:', error.message);
    return null;
  }
}

// ==================== KELLY SIZING ====================

function calculateKellyPosition(edge, probability, bankroll) {
  const fullKelly = edge / (1 - probability);
  const fractionalKelly = fullKelly * CONFIG.kellyFraction;
  const cappedFraction = Math.min(fractionalKelly, CONFIG.maxSinglePosition);

  let dollarAmount = bankroll * cappedFraction;

  if (dollarAmount < CONFIG.minTradeSize) {
    return { approved: false, reason: 'Position too small' };
  }

  dollarAmount = Math.round(dollarAmount * 100) / 100;

  return {
    approved: true,
    dollarAmount,
    fraction: cappedFraction,
    kellyFull: fullKelly,
    kellyFractional: fractionalKelly,
  };
}

// ==================== TRADING ENGINE ====================

async function loadState() {
  const settings = await supabaseQuery('settings', 'GET', null, 'key=eq.bankroll');
  if (settings && settings[0]) {
    currentBankroll = parseFloat(settings[0].value) || CONFIG.initialBankroll;
  }

  const positions = await supabaseQuery('positions', 'GET', null, 'status=eq.open');
  if (positions) {
    openPositions = positions;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayPnl = await supabaseQuery('daily_pnl', 'GET', null, `date=eq.${today}`);
  if (todayPnl && todayPnl[0]) {
    dailyStartBankroll = parseFloat(todayPnl[0].starting_bankroll);
  } else {
    dailyStartBankroll = currentBankroll;
    await supabaseQuery('daily_pnl', 'POST', {
      date: today,
      starting_bankroll: currentBankroll,
      ending_bankroll: currentBankroll,
      daily_pnl: 0,
      cumulative_pnl: currentBankroll - CONFIG.initialBankroll,
    });
  }

  console.log(`[State] Bankroll: $${currentBankroll.toFixed(2)}, Open positions: ${openPositions.length}`);
}

async function saveBankroll() {
  await supabaseUpsert('settings', { key: 'bankroll', value: currentBankroll });
}

async function executeTrade(market, edge) {
  // Check risk limits
  if (openPositions.length >= CONFIG.maxOpenPositions) {
    console.log(`[Trade] SKIP: Max positions (${CONFIG.maxOpenPositions})`);
    return null;
  }

  // Check daily drawdown based on TOTAL VALUE
  const totalPositionValue = openPositions.reduce((sum, p) => {
    return sum + parseFloat(p.size_usd || 0) + parseFloat(p.unrealized_pnl || 0);
  }, 0);
  const totalValue = currentBankroll + totalPositionValue;
  const dailyPnL = totalValue - dailyStartBankroll;
  const drawdownPct = -dailyPnL / dailyStartBankroll;
  if (drawdownPct >= CONFIG.maxDailyDrawdown) {
    console.log(`[Trade] SKIP: Drawdown limit (${(drawdownPct * 100).toFixed(1)}%)`);
    return null;
  }

  // Check if already in market
  if (openPositions.some(p => p.market_id === market.id)) {
    console.log(`[Trade] SKIP: Already in this market`);
    return null;
  }

  // Calculate position size
  const sizing = calculateKellyPosition(edge.edge_size, edge.estimate, currentBankroll);
  if (!sizing.approved) {
    console.log(`[Trade] SKIP: ${sizing.reason}`);
    return null;
  }

  const entryPrice = edge.edge_direction === 'buy_yes' ? market.yesPrice : market.noPrice;

  // ====== EXECUTE TRADE ======
  let liveOrderId = null;

  if (TRADING_MODE === 'live') {
    const liveResult = await executeLiveTrade(market, edge, sizing);
    if (!liveResult) {
      console.error('[Trade] Live execution failed, skipping');
      return null;
    }
    liveOrderId = liveResult.orderId;
  }

  // Create trade record
  const trade = {
    market_id: market.id,
    question: market.question,
    direction: edge.edge_direction,
    entry_price: entryPrice,
    size_usd: sizing.dollarAmount,
    claude_estimate: edge.estimate,
    edge_at_entry: edge.edge_size,
    confidence: edge.confidence,
    reasoning: edge.reasoning,
    status: 'open',
    tx_hash: liveOrderId, // Store order ID for live trades
  };

  const savedTrade = await supabaseQuery('trades', 'POST', trade);
  if (!savedTrade || !savedTrade[0]) {
    console.error('[Trade] Failed to save trade');
    return null;
  }

  // Create position
  const position = {
    market_id: market.id,
    question: market.question,
    direction: edge.edge_direction,
    entry_price: entryPrice,
    current_price: entryPrice,
    size_usd: sizing.dollarAmount,
    unrealized_pnl: 0,
    realized_pnl: 0,
    status: 'open',
  };

  const savedPosition = await supabaseQuery('positions', 'POST', position);
  if (savedPosition && savedPosition[0]) {
    openPositions.push(savedPosition[0]);
  }

  // Update bankroll
  currentBankroll -= sizing.dollarAmount;
  await saveBankroll();
  tradesToday++;

  const modeTag = TRADING_MODE === 'live' ? '💰 LIVE' : '📝 PAPER';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${modeTag}] TRADE EXECUTED: ${edge.edge_direction.toUpperCase()}`);
  console.log(`  Market: ${market.question.slice(0, 50)}...`);
  console.log(`  Entry: ${(entryPrice * 100).toFixed(1)}% | Claude: ${(edge.estimate * 100).toFixed(1)}%`);
  console.log(`  Size: $${sizing.dollarAmount.toFixed(2)} (${(sizing.fraction * 100).toFixed(1)}%)`);
  console.log(`  Edge: ${(edge.edge_size * 100).toFixed(0)}% | Kelly: ${(sizing.kellyFractional * 100).toFixed(1)}%`);
  if (liveOrderId) console.log(`  Order ID: ${liveOrderId}`);
  console.log(`  Bankroll: $${currentBankroll.toFixed(2)}`);
  console.log(`${'='.repeat(60)}\n`);

  return savedTrade[0];
}

async function updatePositions(markets) {
  if (openPositions.length === 0) return;

  const marketMap = new Map(markets.map(m => [m.id, m]));
  let totalUnrealizedPnL = 0;

  for (const position of openPositions) {
    const market = marketMap.get(position.market_id);
    if (!market) continue;

    const currentPrice = position.direction === 'buy_yes' ? market.yesPrice : market.noPrice;
    if (isNaN(currentPrice) || currentPrice === 0) continue;

    const priceDiff = currentPrice - parseFloat(position.entry_price);
    const shares = parseFloat(position.size_usd) / parseFloat(position.entry_price);
    const unrealizedPnL = shares * priceDiff;

    totalUnrealizedPnL += unrealizedPnL;

    await supabaseQuery('positions', 'PATCH', {
      current_price: currentPrice,
      unrealized_pnl: Math.round(unrealizedPnL * 100) / 100,
    }, `id=eq.${position.id}`);

    position.current_price = currentPrice;
    position.unrealized_pnl = unrealizedPnL;

    // Check if resolved
    if (currentPrice <= 0.02 || currentPrice >= 0.98) {
      await closePosition(position, currentPrice, 'resolved');
    }
  }

  openPositions = openPositions.filter(p => p.status === 'open');

  // Update daily P&L
  const today = new Date().toISOString().split('T')[0];
  const totalValue = currentBankroll + openPositions.reduce((sum, p) =>
    sum + parseFloat(p.size_usd) + parseFloat(p.unrealized_pnl || 0), 0);
  const dailyPnL = totalValue - dailyStartBankroll;
  const cumulativePnL = totalValue - CONFIG.initialBankroll;

  await supabaseQuery('daily_pnl', 'PATCH', {
    ending_bankroll: totalValue,
    daily_pnl: Math.round(dailyPnL * 100) / 100,
    cumulative_pnl: Math.round(cumulativePnL * 100) / 100,
    trades_opened: tradesToday,
  }, `date=eq.${today}`);

  if (openPositions.length > 0) {
    console.log(`[Positions] Updated ${openPositions.length}. P&L: $${totalUnrealizedPnL.toFixed(2)}`);
  }
}

async function closePosition(position, exitPrice, reason = 'manual') {
  const priceDiff = exitPrice - parseFloat(position.entry_price);
  const shares = parseFloat(position.size_usd) / parseFloat(position.entry_price);
  const realizedPnL = shares * priceDiff;

  await supabaseQuery('positions', 'PATCH', {
    current_price: exitPrice,
    unrealized_pnl: 0,
    realized_pnl: Math.round(realizedPnL * 100) / 100,
    status: 'closed',
  }, `id=eq.${position.id}`);

  await supabaseQuery('trades', 'PATCH', {
    exit_price: exitPrice,
    pnl: Math.round(realizedPnL * 100) / 100,
    status: 'closed',
    closed_at: new Date().toISOString(),
  }, `market_id=eq.${position.market_id}&status=eq.open`);

  currentBankroll += parseFloat(position.size_usd) + realizedPnL;
  await saveBankroll();

  position.status = 'closed';

  const pnlSign = realizedPnL >= 0 ? '+' : '';
  console.log(`[CLOSED] ${position.question.slice(0, 40)}... | P&L: ${pnlSign}$${realizedPnL.toFixed(2)} (${reason})`);
}

// ==================== MAIN SCANNER ====================

async function scanMarkets() {
  const startTime = Date.now();
  console.log(`\n[SCAN] ${new Date().toISOString()}`);

  const markets = await getActiveMarkets();
  console.log(`[SCAN] Fetched ${markets.length} markets`);

  await updatePositions(markets);

  const opportunities = [];
  let analyzed = 0;
  let traded = 0;

  for (const market of markets) {
    if (isNaN(market.yesPrice) || market.yesPrice === 0) continue;

    const hoursToClose = (new Date(market.endDate).getTime() - Date.now()) / 3_600_000;
    if (hoursToClose < 6) continue;
    if (market.volume < 1000) continue;

    const cached = cache.get(market.id);
    if (cached && Date.now() - cached.timestamp < CONFIG.cacheTtl) {
      continue;
    }

    if (analyzed >= (CONFIG.maxAnalysisPerScan || 20)) {
      console.log('[SCAN] Analysis limit reached');
      break;
    }

    const edge = await getEdgeEstimate(market);
    analyzed++;

    if (edge) {
      cache.set(market.id, { data: edge, timestamp: Date.now() });

      // Save to database (skip no_edge)
      if (!isNaN(market.yesPrice) && !isNaN(edge.estimate) && edge.edge_direction !== 'no_edge') {
        await supabaseQuery('opportunities', 'POST', {
          market_id: market.id,
          question: market.question,
          market_price: market.yesPrice,
          claude_estimate: edge.estimate,
          edge_size: edge.edge_size,
          direction: edge.edge_direction,
          reasoning: edge.reasoning || 'No reasoning',
          confidence: edge.confidence,
          tradeable: edge.tradeable,
        });
      }

      if (edge.tradeable) {
        opportunities.push({ market, edge });
        console.log(`[EDGE] ${market.question.slice(0, 50)}...`);
        console.log(`       Market: ${(market.yesPrice * 100).toFixed(1)}% | Claude: ${(edge.estimate * 100).toFixed(1)}% | Edge: ${(edge.edge_size * 100).toFixed(0)}%`);

        const trade = await executeTrade(market, edge);
        if (trade) traded++;
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SCAN] Done ${elapsed}s | Analyzed: ${analyzed} | Opps: ${opportunities.length} | Trades: ${traded}`);

  const totalValue = currentBankroll + openPositions.reduce((sum, p) =>
    sum + parseFloat(p.size_usd) + parseFloat(p.unrealized_pnl || 0), 0);
  console.log(`[STATUS] Cash: $${currentBankroll.toFixed(2)} | Positions: ${openPositions.length} | Value: $${totalValue.toFixed(2)}`);

  return opportunities;
}

// ==================== MAIN ====================

async function main() {
  const modeEmoji = TRADING_MODE === 'live' ? '💰' : '📝';

  console.log('='.repeat(60));
  console.log(`${modeEmoji} POLYMARKET EDGE FINDER - ${TRADING_MODE.toUpperCase()} MODE`);
  console.log('='.repeat(60));
  console.log(`Bankroll: $${CONFIG.initialBankroll}`);
  console.log(`Min Edge: ${CONFIG.minEdge * 100}%`);
  console.log(`Max Position: ${CONFIG.maxSinglePosition * 100}%`);
  console.log(`Kelly: ${CONFIG.kellyFraction * 100}%`);
  console.log(`Max Positions: ${CONFIG.maxOpenPositions}`);
  console.log(`Scan: ${CONFIG.scanInterval / 1000}s`);
  console.log(`Supabase: ${SUPABASE_URL ? 'Connected' : 'Not configured'}`);

  if (TRADING_MODE === 'live') {
    console.log('='.repeat(60));
    console.log('⚠️  LIVE TRADING ENABLED - REAL MONEY AT RISK');
    console.log('='.repeat(60));
    const liveReady = await initializeLiveTrading();
    if (!liveReady) {
      console.error('Failed to initialize live trading. Exiting.');
      process.exit(1);
    }
  } else {
    console.log('='.repeat(60));
    console.log('📝 PAPER TRADING - No real money');
    console.log('='.repeat(60));
  }

  await loadState();
  await scanMarkets();
  setInterval(scanMarkets, CONFIG.scanInterval);
}

if (require.main === module) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }
  main().catch(console.error);
}

module.exports = { scanMarkets, getActiveMarkets, getEdgeEstimate };

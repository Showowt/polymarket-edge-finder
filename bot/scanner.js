// bot/scanner.js
// Market Scanner Bot - Run on Railway (not Vercel)
// This polls Polymarket every 2 minutes and logs edge opportunities

const GAMMA_API = 'https://gamma-api.polymarket.com';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// Configuration
const CONFIG = {
  scanInterval: 120_000, // 2 minutes
  cacheTtl: 300_000, // 5 minutes
  minEdge: 0.15,
  minVolume: 1000,
  minHoursToClose: 6,
  claudeModel: 'claude-sonnet-4-20250514',
};

// Simple in-memory cache
const cache = new Map();

// System prompt for Claude
const SYSTEM_PROMPT = `You are a calibrated prediction market analyst.
Your job: estimate the TRUE probability of binary outcomes.
You are precise, data-driven, and NOT influenced by market prices.
Always return valid JSON only. No markdown. No explanation outside JSON.`;

async function getActiveMarkets() {
  try {
    const res = await fetch(`${GAMMA_API}/markets?active=true&closed=false&limit=100`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    return data.map(m => ({
      id: m.id,
      question: m.question,
      description: m.description || '',
      yesPrice: parseFloat(m.outcomePrices?.[0] || 0),
      noPrice: parseFloat(m.outcomePrices?.[1] || 0),
      volume: parseFloat(m.volume || 0),
      liquidity: parseFloat(m.liquidity || 0),
      endDate: m.endDateIso,
      category: m.tags?.[0]?.label || null,
    }));
  } catch (error) {
    console.error('[Scanner] Failed to fetch markets:', error.message);
    return [];
  }
}

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

    return {
      ...parsed,
      edge_size: edgeSize,
      tradeable: parsed.confidence === 'high' && edgeSize >= CONFIG.minEdge,
    };
  } catch (error) {
    console.error('[Claude] Analysis failed:', error.message);
    return null;
  }
}

async function scanMarkets() {
  const startTime = Date.now();
  console.log(`\n[SCAN] ${new Date().toISOString()} - Starting market scan...`);

  const markets = await getActiveMarkets();
  console.log(`[SCAN] Fetched ${markets.length} markets`);

  const opportunities = [];
  let analyzed = 0;
  let skipped = 0;

  for (const market of markets) {
    // Filter criteria
    const hoursToClose = (new Date(market.endDate).getTime() - Date.now()) / 3_600_000;

    if (hoursToClose < CONFIG.minHoursToClose) {
      skipped++;
      continue;
    }

    if (market.volume < CONFIG.minVolume) {
      skipped++;
      continue;
    }

    // Check cache
    const cached = cache.get(market.id);
    if (cached && Date.now() - cached.timestamp < CONFIG.cacheTtl) {
      if (cached.data?.tradeable) {
        opportunities.push({ market, edge: cached.data });
      }
      continue;
    }

    // Rate limit: don't overwhelm Claude API
    if (analyzed >= 10) {
      console.log('[SCAN] Reached analysis limit for this scan');
      break;
    }

    // Get Claude estimate
    const edge = await getEdgeEstimate(market);
    analyzed++;

    if (edge) {
      cache.set(market.id, { data: edge, timestamp: Date.now() });

      if (edge.tradeable) {
        opportunities.push({ market, edge });
        console.log(`[EDGE] ${market.question.slice(0, 50)}...`);
        console.log(`       Market: ${(market.yesPrice * 100).toFixed(1)}% | Claude: ${(edge.estimate * 100).toFixed(1)}% | Edge: ${(edge.edge_size * 100).toFixed(0)}%`);
        console.log(`       Direction: ${edge.edge_direction} | Confidence: ${edge.confidence}`);
      }
    }

    // Small delay between API calls
    await new Promise(r => setTimeout(r, 500));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SCAN] Complete in ${elapsed}s. Analyzed: ${analyzed}, Skipped: ${skipped}, Opportunities: ${opportunities.length}`);

  // Log summary
  if (opportunities.length > 0) {
    console.log('\n[OPPORTUNITIES]');
    opportunities.forEach((o, i) => {
      console.log(`  ${i + 1}. ${o.edge.edge_direction.toUpperCase()} | Edge: ${(o.edge.edge_size * 100).toFixed(0)}% | ${o.market.question.slice(0, 60)}...`);
    });
  }

  return opportunities;
}

// Main loop
async function main() {
  console.log('='.repeat(60));
  console.log('POLYMARKET EDGE FINDER - SCANNER BOT');
  console.log('='.repeat(60));
  console.log(`Scan interval: ${CONFIG.scanInterval / 1000}s`);
  console.log(`Min edge: ${CONFIG.minEdge * 100}%`);
  console.log(`Min volume: $${CONFIG.minVolume}`);
  console.log('='.repeat(60));

  // Initial scan
  await scanMarkets();

  // Continuous loop
  setInterval(scanMarkets, CONFIG.scanInterval);
}

// Run if executed directly
if (require.main === module) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }
  main().catch(console.error);
}

module.exports = { scanMarkets, getActiveMarkets, getEdgeEstimate };

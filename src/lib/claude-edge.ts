// lib/claude-edge.ts
// Claude Intelligence Layer - Core Edge Detection Engine

import type { Market } from "./polymarket";

export interface EdgeEstimate {
  estimate: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  edge_direction: "buy_yes" | "buy_no" | "no_edge";
  edge_size: number;
  tradeable: boolean;
}

const SYSTEM_PROMPT = `You are a calibrated prediction market analyst.
Your job: estimate the TRUE probability of binary outcomes.
You are precise, data-driven, and NOT influenced by market prices.
Always return valid JSON only. No markdown. No explanation outside JSON.

Key principles:
1. Consider base rates for this type of event
2. Use your knowledge of current world events
3. Apply historical precedent
4. Account for uncertainty appropriately
5. Do NOT anchor to the market price provided`;

export async function getEdgeEstimate(
  market: Market,
): Promise<EdgeEstimate | null> {
  const userPrompt = `Analyze this prediction market:

QUESTION: ${market.question}
DETAILS: ${market.description}
CURRENT MARKET PRICE (YES): ${(market.yesPrice * 100).toFixed(1)}%
CLOSES: ${market.endDate}
VOLUME: $${market.volume.toLocaleString()}
LIQUIDITY: $${market.liquidity.toLocaleString()}

Provide your independent probability estimate.
Consider: base rates, current world state, historical precedent.
DO NOT anchor to the market price.

Return ONLY this JSON:
{
  "estimate": 0.XX,
  "confidence": "high|medium|low",
  "reasoning": "2-3 sentences max",
  "edge_direction": "buy_yes|buy_no|no_edge",
  "edge_size": 0.XX
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error(
        "[Claude] API error:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();

    if (!text) {
      console.error("[Claude] No response content");
      return null;
    }

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    // Calculate edge size if not provided
    const edgeSize =
      parsed.edge_size ?? Math.abs(parsed.estimate - market.yesPrice);

    // Determine tradeable status
    const tradeable =
      parsed.confidence === "high" &&
      edgeSize >= 0.15 &&
      market.volume > 1000 &&
      parsed.edge_direction !== "no_edge";

    return {
      estimate: parsed.estimate,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      edge_direction: parsed.edge_direction,
      edge_size: edgeSize,
      tradeable,
    };
  } catch (error) {
    console.error("[Claude] Failed to get edge estimate:", error);
    return null;
  }
}

// Batch analyze multiple markets with rate limiting
export async function analyzeMarkets(
  markets: Market[],
  delayMs = 500,
): Promise<Map<string, EdgeEstimate>> {
  const results = new Map<string, EdgeEstimate>();

  for (const market of markets) {
    const estimate = await getEdgeEstimate(market);
    if (estimate) {
      results.set(market.id, estimate);
    }

    // Rate limiting between calls
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// Find high-edge opportunities
export function findOpportunities(
  markets: Market[],
  estimates: Map<string, EdgeEstimate>,
  minEdge = 0.15,
): Array<{ market: Market; edge: EdgeEstimate }> {
  const opportunities: Array<{ market: Market; edge: EdgeEstimate }> = [];

  for (const market of markets) {
    const edge = estimates.get(market.id);
    if (edge && edge.tradeable && edge.edge_size >= minEdge) {
      opportunities.push({ market, edge });
    }
  }

  // Sort by edge size descending
  return opportunities.sort((a, b) => b.edge.edge_size - a.edge.edge_size);
}

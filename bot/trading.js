// bot/trading.js
// Polymarket Live Trading Module
// Handles real order execution via CLOB API

const { ClobClient } = require('@polymarket/clob-client');
const { Wallet } = require('ethers');

// Configuration
const CLOB_HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon

// Signature types
const SignatureType = {
  EOA: 0,           // Standalone wallet (most common)
  POLY_PROXY: 1,    // Magic Link
  GNOSIS_SAFE: 2,   // MetaMask/Rabby/Privy
};

class PolymarketTrader {
  constructor(privateKey, signatureType = SignatureType.EOA) {
    if (!privateKey) {
      throw new Error('Private key required for live trading');
    }

    this.wallet = new Wallet(privateKey);
    this.address = this.wallet.address;
    this.signatureType = signatureType;
    this.client = null;
    this.apiCreds = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log(`[Trading] Initializing with wallet: ${this.address.slice(0, 10)}...`);

    try {
      // Create temporary client to derive API credentials
      const tempClient = new ClobClient(CLOB_HOST, CHAIN_ID, this.wallet);

      // Derive or create API credentials (EIP-712 signed)
      this.apiCreds = await tempClient.createOrDeriveApiKey();
      console.log('[Trading] API credentials derived successfully');

      // Create full trading client
      this.client = new ClobClient(
        CLOB_HOST,
        CHAIN_ID,
        this.wallet,
        this.apiCreds,
        this.signatureType
      );

      this.initialized = true;
      console.log('[Trading] Live trading client ready');
    } catch (error) {
      console.error('[Trading] Initialization failed:', error.message);
      throw error;
    }
  }

  // Get market details including token IDs
  async getMarket(conditionId) {
    try {
      const response = await fetch(`https://gamma-api.polymarket.com/markets/${conditionId}`);
      if (!response.ok) throw new Error(`Market not found: ${conditionId}`);
      return await response.json();
    } catch (error) {
      console.error('[Trading] Failed to fetch market:', error.message);
      return null;
    }
  }

  // Get token ID for a market outcome
  async getTokenId(conditionId, outcome = 'YES') {
    const market = await this.getMarket(conditionId);
    if (!market || !market.tokens) return null;

    const token = market.tokens.find(t =>
      t.outcome.toUpperCase() === outcome.toUpperCase()
    );
    return token?.token_id || null;
  }

  // Place a limit order
  async placeOrder(params) {
    const {
      tokenId,       // Token ID for the outcome
      side,          // 'BUY' or 'SELL'
      price,         // Price as decimal (0.50 = 50 cents)
      size,          // Number of shares (not dollars)
      tickSize = '0.01',
      negRisk = false,
    } = params;

    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`[Trading] Placing ${side} order: ${size} shares @ ${price}`);

      const order = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price: price,
        side: side.toUpperCase(),
        size: size,
      }, {
        tickSize,
        negRisk,
      });

      if (order.error) {
        console.error('[Trading] Order failed:', order.error);
        return { success: false, error: order.error };
      }

      console.log('[Trading] Order placed successfully:', order.orderID || order.id);
      return {
        success: true,
        orderId: order.orderID || order.id,
        order
      };
    } catch (error) {
      console.error('[Trading] Order execution failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Calculate shares from dollar amount and price
  calculateShares(dollarAmount, price) {
    // Shares = dollars / price
    // e.g., $50 at 0.25 price = 200 shares
    return Math.floor(dollarAmount / price);
  }

  // Execute a trade (convenience method)
  async executeTrade(params) {
    const {
      marketId,      // Polymarket market/condition ID
      direction,     // 'buy_yes' or 'buy_no'
      dollarAmount,  // Amount in USD
      currentPrice,  // Current market price (we'll use limit slightly better)
    } = params;

    // Determine outcome and side
    const outcome = direction === 'buy_yes' ? 'YES' : 'NO';
    const price = direction === 'buy_yes' ? currentPrice : (1 - currentPrice);

    // Get token ID
    const tokenId = await this.getTokenId(marketId, outcome);
    if (!tokenId) {
      return { success: false, error: 'Could not find token ID for market' };
    }

    // Calculate shares
    const shares = this.calculateShares(dollarAmount, price);
    if (shares < 1) {
      return { success: false, error: 'Position too small for at least 1 share' };
    }

    // Place order at slightly better price for faster fill
    const limitPrice = Math.round((price + 0.01) * 100) / 100; // 1 cent better

    return await this.placeOrder({
      tokenId,
      side: 'BUY',
      price: limitPrice,
      size: shares,
    });
  }

  // Get open orders
  async getOpenOrders() {
    if (!this.initialized) await this.initialize();

    try {
      const orders = await this.client.getOpenOrders();
      return orders;
    } catch (error) {
      console.error('[Trading] Failed to get orders:', error.message);
      return [];
    }
  }

  // Cancel an order
  async cancelOrder(orderId) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.client.cancelOrder(orderId);
      console.log('[Trading] Order cancelled:', orderId);
      return { success: true, result };
    } catch (error) {
      console.error('[Trading] Cancel failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Cancel all orders
  async cancelAllOrders() {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.client.cancelAll();
      console.log('[Trading] All orders cancelled');
      return { success: true, result };
    } catch (error) {
      console.error('[Trading] Cancel all failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get balances (USDC and positions)
  async getBalances() {
    // This would require additional contract calls
    // For now, return placeholder
    console.log('[Trading] Balance check not implemented - check wallet directly');
    return null;
  }
}

// Factory function for easy instantiation
function createTrader(privateKey, signatureType = SignatureType.EOA) {
  return new PolymarketTrader(privateKey, signatureType);
}

// Export
module.exports = {
  PolymarketTrader,
  createTrader,
  SignatureType,
  CLOB_HOST,
  CHAIN_ID,
};

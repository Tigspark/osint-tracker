import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

let instance = null;

export class Engine {
    constructor() {
        this.mode = 'paper';
        this.exchange = null;
        this.portfolio = {
            holdings: [],
            totalValue: parseFloat(process.env.INITIAL_BALANCE || '10000'),
            initialValue: parseFloat(process.env.INITIAL_BALANCE || '10000'),
            pnl: 0,
            pnlPercent: 0
        };
        this.startTime = Date.now();
        this.activeStrategies = new Map();
        this.tradeHistory = [];
        this.performance = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            profitFactor: 0,
            totalProfit: 0,
            totalLoss: 0
        };
        this.paperBalance = {
            USD: 10000,
            BTC: 0.02,
            ETH: 0.01,
            SOL: 0,
            XRP: 0,
            ADA: 0,
            DOGE: 0
        };
        this.pendingOrders = [];
    }

    static getInstance() {
        if (!instance) {
            instance = new Engine();
        }
        return instance;
    }

    getMode() {
        return this.mode;
    }

    async setMode(mode) {
        if (mode === 'live') {
            if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
                throw new Error('API credentials not configured. Set KRAKEN_API_KEY and KRAKEN_API_SECRET in .env');
            }
            const ccxt = await import('ccxt');
            this.exchange = new ccxt.kraken({
                apiKey: process.env.KRAKEN_API_KEY,
                secret: process.env.KRAKEN_API_SECRET,
                enableRateLimit: true
            });
            logger.info('Switched to LIVE trading mode');
        } else {
            this.exchange = null;
            logger.info('Switched to PAPER trading mode');
        }
        this.mode = mode;
    }

    getStatus() {
        return {
            status: 'online',
            mode: this.mode,
            uptime: this.startTime,
            activeStrategies: this.activeStrategies.size
        };
    }

    getPortfolio() {
        return this.portfolio;
    }

    getPerformance() {
        return this.performance;
    }

    async getBalance() {
        if (this.mode === 'paper') {
            return {
                free: this.paperBalance,
                used: {},
                total: this.paperBalance
            };
        }
        
        try {
            const balance = await this.exchange.fetchBalance();
            return balance;
        } catch (error) {
            logger.error('Failed to fetch balance:', error);
            throw error;
        }
    }

    async getTicker(symbol) {
        try {
            const ccxt = await import('ccxt');
            const exchange = new ccxt.kraken({ enableRateLimit: true });
            const ticker = await exchange.fetchTicker(symbol);
            return {
                symbol,
                price: ticker.last,
                bid: ticker.bid,
                ask: ticker.ask,
                volume: ticker.volume,
                change: ticker.change,
                changePercent: ticker.changePercent
            };
        } catch (error) {
            logger.info(`Ticker fallback for ${symbol}: ${error.message}`);
            return {
                symbol,
                price: this.getSimulatedPrice(symbol),
                bid: this.getSimulatedPrice(symbol),
                ask: this.getSimulatedPrice(symbol),
                volume: 0,
                change: 0,
                changePercent: 0
            };
        }
    }

    async getAvailableSymbols() {
        try {
            const ccxt = await import('ccxt');
            const exchange = new ccxt.kraken({ enableRateLimit: true });
            const markets = await exchange.loadMarkets();
            return Object.keys(markets).filter(m => m.includes('/')).slice(0, 50);
        } catch (error) {
            logger.error('Failed to fetch symbols:', error);
            return ['BTC/USD', 'ETH/USD', 'SOL/USD'];
        }
    }

    getOHLC(symbol, timeframe = '15m', limit = 200) {
        const now = Math.floor(Date.now() / 1000);
        const intervals = {
            '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800, '1M': 2592000
        };
        const interval = intervals[timeframe] || 900;

        const basePrice = symbol === 'BTC/USD' ? 69000 :
                         symbol === 'ETH/USD' ? 3400 : 140;

        const data = [];
        let price = basePrice;

        for (let i = limit; i >= 0; i--) {
            const time = now - (i * interval);
            const volatility = basePrice * 0.003;
            const change = (Math.random() - 0.48) * volatility;

            const open = price;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * volatility * 0.3;
            const low = Math.min(open, close) - Math.random() * volatility * 0.3;
            const volume = Math.random() * 500 + 50;

            data.push({
                time,
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: parseFloat(volume.toFixed(2))
            });

            price = close;
        }

        return data;
    }

    async placeOrder(symbol, side, amount, type = 'market', price = null) {
        const orderId = uuidv4();
        
        if (this.mode === 'paper') {
            return this.placePaperOrder(orderId, symbol, side, amount, type, price);
        }

        try {
            const order = await this.exchange.createOrder(symbol, type, side, amount, price);
            this.recordTrade(order);
            return order;
        } catch (error) {
            logger.error('Failed to place order:', error);
            throw error;
        }
    }

    placePaperOrder(orderId, symbol, side, amount, type, price) {
        const [base, quote] = symbol.split('/');
        const orderPrice = price || this.getSimulatedPrice(symbol);
        const total = amount * orderPrice;

        if (side === 'buy') {
            if (this.paperBalance[quote] < total) {
                throw new Error(`Insufficient ${quote} balance`);
            }
            this.paperBalance[quote] -= total;
            this.paperBalance[base] = (this.paperBalance[base] || 0) + amount;
        } else {
            if (this.paperBalance[base] < amount) {
                throw new Error(`Insufficient ${base} balance`);
            }
            this.paperBalance[base] -= amount;
            this.paperBalance[quote] += total;
        }

        const order = {
            id: orderId,
            symbol,
            side,
            type,
            amount,
            price: orderPrice,
            status: 'closed',
            timestamp: Date.now()
        };

        this.recordTrade(order);
        this.updatePortfolio(symbol);
        this.pendingOrders.push(order);
        
        logger.info(`Paper order: ${side} ${amount} ${symbol} @ ${orderPrice}`);
        return order;
    }

    getSimulatedPrice(symbol) {
        const prices = {
            'BTC/USD': 67500 + (Math.random() - 0.5) * 100,
            'ETH/USD': 3450 + (Math.random() - 0.5) * 50,
            'SOL/USD': 145 + (Math.random() - 0.5) * 5
        };
        return prices[symbol] || 100;
    }

    async getOpenOrders(symbol = null) {
        if (this.mode === 'paper') {
            return this.pendingOrders.filter(o => o.status === 'open');
        }
        
        try {
            return await this.exchange.fetchOpenOrders(symbol);
        } catch (error) {
            logger.error('Failed to fetch orders:', error);
            return [];
        }
    }

    async cancelOrder(orderId, symbol) {
        if (this.mode === 'paper') {
            const orderIndex = this.pendingOrders.findIndex(o => o.id === orderId);
            if (orderIndex >= 0) {
                this.pendingOrders.splice(orderIndex, 1);
                logger.info(`Cancelled paper order: ${orderId}`);
                return true;
            }
            throw new Error('Order not found');
        }

        try {
            await this.exchange.cancelOrder(orderId, symbol);
            return true;
        } catch (error) {
            logger.error('Failed to cancel order:', error);
            throw error;
        }
    }

    recordTrade(order) {
        const trade = {
            id: uuidv4(),
            orderId: order.id || uuidv4(),
            symbol: order.symbol,
            side: order.side,
            amount: order.amount,
            price: order.price,
            total: order.amount * order.price,
            fee: order.fee?.cost || 0,
            timestamp: order.timestamp || Date.now(),
            pnl: null
        };

        this.tradeHistory.unshift(trade);
        
        if (this.tradeHistory.length > 1000) {
            this.tradeHistory = this.tradeHistory.slice(0, 1000);
        }

        this.updatePerformance(trade);
        this.updatePortfolio(order.symbol);
    }

    updatePerformance(trade) {
        this.performance.totalTrades++;
        
        if (trade.side === 'sell' && trade.pnl !== null) {
            if (trade.pnl > 0) {
                this.performance.winningTrades++;
                this.performance.totalProfit += trade.pnl;
            } else {
                this.performance.losingTrades++;
                this.performance.totalLoss += Math.abs(trade.pnl);
            }
        }

        const total = this.performance.winningTrades + this.performance.losingTrades;
        this.performance.winRate = total > 0 
            ? (this.performance.winningTrades / total) * 100 
            : 0;
        
        this.performance.profitFactor = this.performance.totalLoss > 0 
            ? this.performance.totalProfit / this.performance.totalLoss 
            : 0;
    }

    updatePortfolio(symbol) {
        const [base] = symbol.split('/');
        
        let holdings = [];
        let totalValue = 0;

        for (const [asset, amount] of Object.entries(this.paperBalance)) {
            if (amount > 0) {
                const value = asset === 'USD' 
                    ? amount 
                    : amount * this.getSimulatedPrice(`${asset}/USD`);
                
                holdings.push({ asset, amount, value });
                totalValue += value;
            }
        }

        this.portfolio.holdings = holdings;
        this.portfolio.totalValue = totalValue;
        this.portfolio.pnl = totalValue - this.portfolio.initialValue;
        this.portfolio.pnlPercent = ((totalValue - this.portfolio.initialValue) / this.portfolio.initialValue) * 100;
    }

    getTradeHistory(limit = 100, offset = 0) {
        return this.tradeHistory.slice(offset, offset + limit);
    }

    addStrategy(strategy) {
        this.activeStrategies.set(strategy.id, strategy);
        logger.info(`Strategy started: ${strategy.type} on ${strategy.symbol}`);
    }

    removeStrategy(strategyId) {
        const strategy = this.activeStrategies.get(strategyId);
        if (strategy) {
            this.activeStrategies.delete(strategyId);
            logger.info(`Strategy stopped: ${strategy.id}`);
        }
    }

    updateStrategy(strategyId, updates) {
        const strategy = this.activeStrategies.get(strategyId);
        if (strategy) {
            Object.assign(strategy, updates);
        }
    }

    getConfig() {
        return {
            mode: this.mode,
            initialBalance: this.portfolio.initialValue,
            currentBalance: this.paperBalance
        };
    }

    updateConfig(config) {
        if (config.initialBalance && config.initialBalance !== this.portfolio.initialValue) {
            this.portfolio.initialValue = config.initialBalance;
            this.paperBalance.USD = config.initialBalance;
            this.updatePortfolio('BTC/USD');
        }
    }

    getUptime() {
        return Date.now() - this.startTime;
    }

    resetPaperBalance() {
        this.paperBalance = {
            USD: 10000,
            BTC: 0.02,
            ETH: 0.01,
            SOL: 5,
            XRP: 100,
            ADA: 500,
            DOGE: 1000
        };
        this.updatePortfolio('BTC/USD');
        logger.info('Paper balance reset');
    }

    stop() {
        this.activeStrategies.forEach((_, id) => {
            this.removeStrategy(id);
        });
        logger.info('Engine stopped');
    }
}

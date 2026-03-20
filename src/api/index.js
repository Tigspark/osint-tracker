import express from 'express';
import { Engine } from '../engine/Engine.js';
import { StrategyManager } from '../strategies/StrategyManager.js';

const router = express.Router();
const engine = Engine.getInstance();
const strategyManager = StrategyManager.getInstance();

router.get('/status', (req, res) => {
    res.json({
        status: 'online',
        mode: engine.getMode(),
        activeStrategies: strategyManager.getActiveStrategies(),
        portfolio: engine.getPortfolio(),
        uptime: engine.getUptime()
    });
});

router.get('/strategies', (req, res) => {
    res.json(strategyManager.getAvailableStrategies());
});

router.get('/strategies/active', (req, res) => {
    res.json(strategyManager.getActiveStrategies());
});

router.post('/strategies/start', async (req, res) => {
    try {
        const { strategyType, symbol, config } = req.body;
        const result = await strategyManager.startStrategy(strategyType, symbol, config, engine);
        res.json({ success: true, strategy: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/strategies/stop', async (req, res) => {
    try {
        const { strategyId } = req.body;
        await strategyManager.stopStrategy(strategyId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/trades', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    res.json(engine.getTradeHistory(limit, offset));
});

router.get('/portfolio', (req, res) => {
    res.json(engine.getPortfolio());
});

router.get('/balance', async (req, res) => {
    try {
        res.json(await engine.getBalance());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/orders', async (req, res) => {
    try {
        const symbol = req.query.symbol;
        res.json(await engine.getOpenOrders(symbol));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/orders/cancel', async (req, res) => {
    try {
        const { orderId, symbol } = req.body;
        await engine.cancelOrder(orderId, symbol);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/ticker', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'BTC/USD';
        res.json(await engine.getTicker(symbol));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/ohlc', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'BTC/USD';
        const timeframe = req.query.timeframe || '15m';
        const limit = parseInt(req.query.limit) || 200;
        const data = engine.getOHLC(symbol, timeframe, limit);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/symbols', async (req, res) => {
    try {
        res.json(await engine.getAvailableSymbols());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trade', async (req, res) => {
    try {
        const { symbol, side, amount, type, price } = req.body;
        const result = await engine.placeOrder(symbol, side, amount, type, price);
        res.json({ success: true, order: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/performance', (req, res) => {
    res.json(engine.getPerformance());
});

router.post('/mode', async (req, res) => {
    try {
        const { mode } = req.body;
        if (mode !== 'paper' && mode !== 'live') {
            throw new Error('Mode must be "paper" or "live"');
        }
        await engine.setMode(mode);
        res.json({ success: true, mode });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/config', (req, res) => {
    const { action, ...configData } = req.body;
    
    if (action === 'get') {
        res.json(engine.getConfig());
    } else if (action === 'set') {
        try {
            engine.updateConfig(configData);
            res.json({ success: true });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    } else {
        res.status(400).json({ error: 'Invalid action. Use "get" or "set".' });
    }
});

export default router;

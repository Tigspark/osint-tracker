import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Engine } from './src/engine/Engine.js';
import { StrategyManager } from './src/strategies/StrategyManager.js';
import { logger } from './src/utils/logger.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 10000;

const engine = Engine.getInstance();
const strategyManager = StrategyManager.getInstance();

app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        mode: engine.getMode(),
        activeStrategies: strategyManager.getActiveStrategies(),
        portfolio: engine.getPortfolio(),
        uptime: engine.getUptime()
    });
});

app.get('/api/ticker', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'BTC/USD';
        res.json(await engine.getTicker(symbol));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ohlc', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'BTC/USD';
        const timeframe = req.query.timeframe || '15m';
        const limit = parseInt(req.query.limit) || 200;
        res.json(engine.getOHLC(symbol, timeframe, limit));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/trade', async (req, res) => {
    try {
        const { symbol, side, amount, type, price } = req.body;
        const result = await engine.placeOrder(symbol, side, amount, type, price);
        res.json({ success: true, order: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        res.json(await engine.getOpenOrders(req.query.symbol));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/strategies', (req, res) => {
    res.json(strategyManager.getAvailableStrategies());
});

app.get('/api/strategies/active', (req, res) => {
    res.json(strategyManager.getActiveStrategies());
});

app.post('/api/strategies/start', async (req, res) => {
    try {
        const { strategyType, symbol, config } = req.body;
        const result = await strategyManager.startStrategy(strategyType, symbol, config, engine);
        res.json({ success: true, strategy: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/strategies/stop', async (req, res) => {
    try {
        const { strategyId } = req.body;
        await strategyManager.stopStrategy(strategyId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/orders/cancel', async (req, res) => {
    try {
        const { orderId, symbol } = req.body;
        await engine.cancelOrder(orderId, symbol);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/mode', async (req, res) => {
    try {
        const { mode } = req.body;
        await engine.setMode(mode);
        res.json({ success: true, mode });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/reset-balance', (req, res) => {
    engine.resetPaperBalance();
    res.json({ success: true, message: 'Paper balance reset' });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    logger.info('═══════════════════════════════════════════════════');
    logger.info('         CRYPTO TRADING BOT');
    logger.info('═══════════════════════════════════════════════════');
    logger.info(`Dashboard: http://localhost:${PORT}/`);
    logger.info(`API: http://localhost:${PORT}/api`);
    logger.info('═══════════════════════════════════════════════════');
});

export default app;

import { logger } from '../utils/logger.js';

let instance = null;

export class StrategyManager {
    constructor() {
        this.strategies = new Map();
    }

    static getInstance() {
        if (!instance) {
            instance = new StrategyManager();
        }
        return instance;
    }

    getAvailableStrategies() {
        return [
            {
                type: 'grid',
                name: 'Grid Trading',
                description: 'Place buy/sell orders at regular intervals around a price',
                parameters: ['gridLevels', 'gridSpacing', 'totalInvestment']
            },
            {
                type: 'dca',
                name: 'DCA',
                description: 'Buy fixed amounts at regular intervals',
                parameters: ['dcaAmount', 'dcaIntervalHours']
            },
            {
                type: 'mean_reversion',
                name: 'Mean Reversion',
                description: 'Buy low, sell high when price reverts to mean',
                parameters: ['windowSize', 'stdDeviation', 'positionSize']
            }
        ];
    }

    getActiveStrategies() {
        return Array.from(this.strategies.values()).map(s => ({
            id: s.id,
            type: s.type,
            symbol: s.symbol,
            status: s.status,
            profit: s.profit || 0,
            trades: s.trades || 0,
            createdAt: s.createdAt
        }));
    }

    async startStrategy(type, symbol, config, engine) {
        const strategy = {
            id: `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            symbol,
            config,
            status: 'running',
            profit: 0,
            trades: 0,
            createdAt: Date.now(),
            orders: []
        };

        this.strategies.set(strategy.id, strategy);
        engine.addStrategy(strategy);

        if (type === 'dca') {
            this.startDCAStrategy(strategy, engine);
        } else if (type === 'grid') {
            this.startGridStrategy(strategy, engine);
        } else if (type === 'mean_reversion') {
            this.startMeanReversionStrategy(strategy, engine);
        }

        logger.info(`Started ${type} strategy on ${symbol} with ID ${strategy.id}`);
        
        return {
            id: strategy.id,
            type: strategy.type,
            symbol: strategy.symbol,
            config: strategy.config,
            status: strategy.status,
            profit: strategy.profit,
            trades: strategy.trades,
            createdAt: strategy.createdAt
        };
    }

    async stopStrategy(strategyId) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy) {
            throw new Error('Strategy not found');
        }

        strategy.status = 'stopped';
        
        if (strategy.interval) {
            clearInterval(strategy.interval);
        }
        
        this.strategies.delete(strategyId);
        Engine.getInstance().removeStrategy(strategyId);
        
        logger.info(`Stopped strategy: ${strategyId}`);
    }

    startDCAStrategy(strategy, engine) {
        const intervalMs = (strategy.config.dcaIntervalHours || 24) * 60 * 60 * 1000;
        
        const execute = async () => {
            if (strategy.status !== 'running') return;
            
            try {
                const ticker = await engine.getTicker(strategy.symbol);
                const amount = strategy.config.dcaAmount / ticker.price;
                
                await engine.placeOrder(strategy.symbol, 'buy', amount, 'market');
                
                strategy.trades++;
                strategy.profit = (strategy.profit || 0) + strategy.config.dcaAmount;
                
                logger.info(`DCA executed: bought ${amount} ${strategy.symbol} at ${ticker.price}`);
            } catch (error) {
                logger.error('DCA execution failed:', error);
            }
        };

        execute();
        strategy.interval = setInterval(execute, intervalMs);
    }

    startGridStrategy(strategy, engine) {
        const levels = strategy.config.gridLevels || 10;
        const spacing = (strategy.config.gridSpacing || 1) / 100;
        const investment = strategy.config.totalInvestment || 1000;

        const placeGridOrders = async () => {
            if (strategy.status !== 'running') return;
            
            try {
                const ticker = await engine.getTicker(strategy.symbol);
                const currentPrice = ticker.price;
                const gridSize = currentPrice * spacing;
                
                strategy.orders.forEach(o => {
                    engine.cancelOrder(o.id, strategy.symbol).catch(() => {});
                });
                strategy.orders = [];

                for (let i = 1; i <= levels; i++) {
                    const buyPrice = currentPrice - (gridSize * i);
                    const sellPrice = currentPrice + (gridSize * i);
                    
                    if (buyPrice > 0) {
                        const amount = (investment / levels) / buyPrice;
                        try {
                            const order = await engine.placeOrder(strategy.symbol, 'buy', amount, 'limit', buyPrice);
                            strategy.orders.push(order);
                        } catch (e) {}
                    }
                    
                    if (sellPrice > 0) {
                        const amount = (investment / levels) / sellPrice;
                        try {
                            const order = await engine.placeOrder(strategy.symbol, 'sell', amount, 'limit', sellPrice);
                            strategy.orders.push(order);
                        } catch (e) {}
                    }
                }

                logger.info(`Grid placed: ${levels * 2} orders around ${currentPrice}`);
            } catch (error) {
                logger.error('Grid execution failed:', error);
            }
        };

        placeGridOrders();
        strategy.interval = setInterval(placeGridOrders, 60000);
    }

    startMeanReversionStrategy(strategy, engine) {
        const windowSize = strategy.config.windowSize || 20;
        const positionSize = strategy.config.positionSize || 0.1;

        const execute = async () => {
            if (strategy.status !== 'running') return;
            
            try {
                const ticker = await engine.getTicker(strategy.symbol);
                const currentPrice = ticker.price;
                
                const mean = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
                const stdDev = strategy.config.stdDeviation || 2;
                
                const lowerBand = mean - (mean * 0.02 * stdDev);
                const upperBand = mean + (mean * 0.02 * stdDev);

                if (currentPrice < lowerBand) {
                    await engine.placeOrder(strategy.symbol, 'buy', positionSize, 'market');
                    strategy.trades++;
                    logger.info(`Mean Reversion: Bought at ${currentPrice}`);
                } else if (currentPrice > upperBand) {
                    await engine.placeOrder(strategy.symbol, 'sell', positionSize, 'market');
                    strategy.trades++;
                    logger.info(`Mean Reversion: Sold at ${currentPrice}`);
                }
            } catch (error) {
                logger.error('Mean Reversion execution failed:', error);
            }
        };

        execute();
        strategy.interval = setInterval(execute, 30000);
    }
}

import { Engine } from '../engine/Engine.js';

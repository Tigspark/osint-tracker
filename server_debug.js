import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Engine } from './src/engine/Engine.js';
import { StrategyManager } from './src/strategies/StrategyManager.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 7000;

const engine = Engine.getInstance();
const strategyManager = StrategyManager.getInstance();

console.log('Setting up middleware...');
app.use(express.json());
console.log('JSON middleware set');

console.log('Setting up routes...');

app.get('/api/status', (req, res) => {
    console.log('STATUS ROUTE CALLED');
    res.json({
        status: 'online',
        mode: engine.getMode(),
        activeStrategies: strategyManager.getActiveStrategies(),
        portfolio: engine.getPortfolio(),
        uptime: engine.getUptime()
    });
});

console.log('Routes set');

app.use(express.static(path.join(__dirname, 'public')));
console.log('Static files configured');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server listening on', PORT);
});

const API = '/api';
let state = {
    symbol: 'BTC/USD',
    timeframe: '15m',
    chartType: 'candle',
    mode: 'paper',
    autoRefresh: true,
    soundAlerts: false,
    confirmOrders: true,
    candleData: [],
    chart: null,
    candleSeries: null,
    volumeSeries: null
};

async function api(endpoint, options = {}) {
    try {
        const response = await fetch(`${API}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function formatNumber(value, decimals = 4) {
    return (value || 0).toFixed(decimals);
}

function initChart() {
    const chartContainer = document.getElementById('chart');
    chartContainer.innerHTML = '';

    state.chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: { background: { type: 'solid', color: '#0d1117' }, textColor: '#8b949e' },
        grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#30363d' },
        timeScale: { borderColor: '#30363d', timeVisible: true },
    });

    if (state.chartType === 'candle') {
        state.candleSeries = state.chart.addCandlestickSeries({
            upColor: '#3fb950', downColor: '#f85149',
            borderUpColor: '#3fb950', borderDownColor: '#f85149',
            wickUpColor: '#3fb950', wickDownColor: '#f85149',
        });
    } else if (state.chartType === 'line') {
        state.candleSeries = state.chart.addLineSeries({ color: '#58a6ff', lineWidth: 2 });
    } else {
        state.candleSeries = state.chart.addAreaSeries({ topColor: 'rgba(88, 166, 255, 0.4)', bottomColor: 'rgba(88, 166, 255, 0.0)' });
    }

    state.volumeSeries = state.chart.addHistogramSeries({ color: '#58a6ff', priceFormat: { type: 'volume' }, priceScaleId: '' });
    state.volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    state.chart.timeScale().fitContent();

    window.addEventListener('resize', () => {
        state.chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
    });

    loadChartData();
}

async function loadChartData() {
    try {
        const data = await api(`/ohlc?symbol=${state.symbol}&timeframe=${state.timeframe}&limit=200`);
        state.candleData = data;
        
        state.candleSeries.setData(data.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));
        state.volumeSeries.setData(data.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(63, 185, 80, 0.5)' : 'rgba(248, 81, 73, 0.5)' })));
        state.chart.timeScale().fitContent();
        updatePriceDisplay(data[data.length - 1]);
        
        const highs = data.map(d => d.high), lows = data.map(d => d.low), volumes = data.map(d => d.volume);
        document.getElementById('stat-high').textContent = formatCurrency(Math.max(...highs));
        document.getElementById('stat-low').textContent = formatCurrency(Math.min(...lows));
        document.getElementById('stat-volume').textContent = (volumes.reduce((a, b) => a + b, 0) / 1000).toFixed(1) + 'K';
    } catch (error) { console.error('Chart error:', error); }
}

function updatePriceDisplay(lastCandle) {
    const priceEl = document.getElementById('current-price');
    const changeEl = document.getElementById('price-change');
    const currentPrice = lastCandle.close;
    const openPrice = state.candleData[0]?.open || currentPrice;
    const change = currentPrice - openPrice;
    const changePercent = ((change / openPrice) * 100).toFixed(2);
    priceEl.textContent = formatCurrency(currentPrice);
    priceEl.className = `price-display ${change >= 0 ? 'price-up' : 'price-down'}`;
    changeEl.textContent = `${change >= 0 ? '+' : ''}${formatCurrency(change)} (${changePercent}%)`;
    changeEl.style.color = change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
}

async function loadOrders() {
    try {
        const orders = await api('/orders');
        const tbody = document.getElementById('orders-list');
        tbody.innerHTML = orders.length === 0 
            ? '<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:20px">No open orders</td></tr>'
            : orders.map(o => `<tr><td style="color:${o.side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)'}">${o.side.toUpperCase()}</td><td>${formatNumber(o.amount)}</td><td>${o.price ? formatCurrency(o.price) : 'Market'}</td><td><button class="cancel-btn" onclick="cancelOrder('${o.id}', '${o.symbol}')">Cancel</button></td></tr>`).join('');
    } catch (error) {}
}

async function loadStrategies() {
    try {
        const strategies = await api('/strategies/active');
        const container = document.getElementById('active-strategies');
        container.innerHTML = strategies.length === 0 
            ? '<p style="color:var(--text-muted);font-size:12px">No active strategies</p>'
            : strategies.map(s => `<div class="strategy-card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="strategy-name">${s.type.toUpperCase()}</div><div class="strategy-desc">${s.symbol}</div></div><button class="cancel-btn" onclick="stopStrategy('${s.id}')">Stop</button></div><div class="strategy-stats"><div class="strategy-stat">Trades: <span>${s.trades}</span></div><div class="strategy-stat">P/L: <span class="${s.profit >= 0 ? 'stat-positive' : 'stat-negative'}">${formatCurrency(s.profit)}</span></div></div></div>`).join('');
    } catch (error) {}
}

async function placeOrder(side) {
    const amount = parseFloat(document.getElementById('order-amount').value);
    const price = document.getElementById('order-price').value;
    const type = document.getElementById('order-type').value;
    if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
    if (state.confirmOrders && !confirm(`Confirm ${side.toUpperCase()} order?\nAmount: ${amount}\nSymbol: ${state.symbol}`)) return;
    try {
        await api('/trade', { method: 'POST', body: JSON.stringify({ symbol: state.symbol, side, amount, type, price: price ? parseFloat(price) : undefined }) });
        showToast(`${side.toUpperCase()} order placed!`, 'success');
        document.getElementById('order-amount').value = '';
        document.getElementById('order-price').value = '';
        loadOrders();
        loadChartData();
    } catch (error) { showToast(`Order failed: ${error.message}`, 'error'); }
}

async function cancelOrder(orderId, symbol) {
    try { await api('/orders/cancel', { method: 'POST', body: JSON.stringify({ orderId, symbol }) }); showToast('Order cancelled', 'success'); loadOrders(); }
    catch (error) { showToast(`Cancel failed: ${error.message}`, 'error'); }
}

function openStrategyModal(type) {
    const modal = document.getElementById('strategy-modal');
    const titles = { grid: 'Grid Trading Configuration', dca: 'DCA Configuration', mean_reversion: 'Mean Reversion Configuration' };
    document.getElementById('modal-title').textContent = titles[type];
    let html = `<div class="form-group" style="margin-bottom:15px"><label>Symbol</label><select class="form-input" id="strat-symbol"><option value="BTC/USD">BTC/USD</option><option value="ETH/USD">ETH/USD</option><option value="SOL/USD">SOL/USD</option></select></div>`;
    if (type === 'grid') html += `<div class="form-row"><div class="form-group"><label>Grid Levels</label><input type="number" class="form-input" id="strat-levels" value="10"></div><div class="form-group"><label>Spacing (%)</label><input type="number" class="form-input" id="strat-spacing" value="1"></div></div><div class="form-group"><label>Total Investment ($)</label><input type="number" class="form-input" id="strat-investment" value="1000"></div>`;
    else if (type === 'dca') html += `<div class="form-group"><label>DCA Amount ($)</label><input type="number" class="form-input" id="strat-dca-amount" value="50"></div><div class="form-group"><label>Interval (hours)</label><input type="number" class="form-input" id="strat-interval" value="24"></div>`;
    else html += `<div class="form-row"><div class="form-group"><label>Window Size</label><input type="number" class="form-input" id="strat-window" value="20"></div><div class="form-group"><label>Std Deviation</label><input type="number" class="form-input" id="strat-stddev" value="2"></div></div><div class="form-group"><label>Position Size</label><input type="number" class="form-input" id="strat-position" value="0.1"></div>`;
    document.getElementById('modal-body').innerHTML = html + `<div class="modal-actions"><button class="btn-primary" onclick="startStrategy('${type}')">Start Strategy</button><button class="btn-secondary" onclick="closeModal()">Cancel</button></div>`;
    modal.classList.add('active');
}

function closeModal() { document.getElementById('strategy-modal').classList.remove('active'); }

async function startStrategy(type) {
    const symbol = document.getElementById('strat-symbol').value;
    let config = {};
    if (type === 'grid') config = { gridLevels: parseInt(document.getElementById('strat-levels').value), gridSpacing: parseFloat(document.getElementById('strat-spacing').value), totalInvestment: parseFloat(document.getElementById('strat-investment').value) };
    else if (type === 'dca') config = { dcaAmount: parseFloat(document.getElementById('strat-dca-amount').value), dcaIntervalHours: parseFloat(document.getElementById('strat-interval').value) };
    else config = { windowSize: parseInt(document.getElementById('strat-window').value), stdDeviation: parseFloat(document.getElementById('strat-stddev').value), positionSize: parseFloat(document.getElementById('strat-position').value) };
    try { await api('/strategies/start', { method: 'POST', body: JSON.stringify({ strategyType: type, symbol, config }) }); showToast('Strategy started!', 'success'); closeModal(); loadStrategies(); }
    catch (error) { showToast(`Failed: ${error.message}`, 'error'); }
}

async function stopStrategy(id) {
    try { await api('/strategies/stop', { method: 'POST', body: JSON.stringify({ strategyId: id }) }); showToast('Strategy stopped', 'success'); loadStrategies(); }
    catch (error) { showToast(`Failed: ${error.message}`, 'error'); }
}

function toggleSetting(setting) {
    const toggle = document.getElementById(`toggle-${setting}`);
    toggle.classList.toggle('active');
    state[setting === 'auto' ? 'autoRefresh' : setting === 'sound' ? 'soundAlerts' : 'confirmOrders'] = toggle.classList.contains('active');
}

document.querySelectorAll('.symbol-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.symbol-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.symbol = btn.dataset.symbol;
    initChart();
}));

document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', async () => {
    const mode = btn.dataset.mode;
    if (mode === 'live' && !confirm('⚠️ LIVE TRADING with real money. Are you sure?')) return;
    try { await api('/mode', { method: 'POST', body: JSON.stringify({ mode }) }); document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.mode = mode; showToast(`Switched to ${mode.toUpperCase()} mode`, 'success'); }
    catch (error) { showToast(`Mode switch failed: ${error.message}`, 'error'); }
}));

document.querySelectorAll('.chart-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.chartType = btn.dataset.type;
    initChart();
}));

document.querySelectorAll('.tf-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.timeframe = btn.dataset.tf;
    initChart();
}));

document.getElementById('btn-buy').addEventListener('click', () => placeOrder('buy'));
document.getElementById('btn-sell').addEventListener('click', () => placeOrder('sell'));
document.getElementById('refresh-btn').addEventListener('click', () => { initChart(); loadOrders(); loadStrategies(); showToast('Data refreshed', 'success'); });

setInterval(() => { if (state.autoRefresh) { loadChartData(); loadOrders(); loadStrategies(); } }, 10000);

initChart();
loadOrders();
loadStrategies();

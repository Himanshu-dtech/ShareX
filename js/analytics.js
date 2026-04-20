// ================================
// CONFIG
// ================================
const STORAGE_KEY_USER = 'user';
// const API_URL = window.location.hostname === "localhost"
//   ? "http://localhost:5000"
//   : "https://sharex-live.onrender.com";

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js not loaded');
        return;
    }

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
    Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.05)';

    await initAnalytics();
});

async function initAnalytics() {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER));
    if (!user || !user.email) {
        window.location.href = 'login.html';
        return;
    }

    // --- ROLE-BASED FORK ---
    if (user.isAdmin) {
        // ADMIN MODE: Fetch global data from server
        let globalProperties = [];
        try {
            const res = await fetch(`${API_URL}/properties`);
            if (res.ok) {
                globalProperties = await res.json();
            }
        } catch (e) {
            console.warn("Backend offline, using empty market data.");
        }
        renderGlobalKPIs(globalProperties, user);
        renderGlobalCharts(globalProperties);
    } else {
        // USER MODE: Read personal data from local storage
        renderKPIs(user);
        renderCharts(user);
    }
}

// ================================
// HELPERS
// ================================
function getUserKey(email, key) {
    return `fractionx_${email}_${key}`;
}

// Dynamic smart formatter: scales across K, L, Cr
function formatSmartCurrency(amount) {
    if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
    if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
    if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(1)} K`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

// Single source of truth for asset categorization
function categorizeAsset(assetName) {
    const name = (assetName || '').toLowerCase();
    if (name.match(/villa|estate|city|house/)) return 'Real Estate';
    if (name.match(/car|tesla|ferrari|bmw/))   return 'Vehicle';
    if (name.match(/rolex|watch|gold/))         return 'Luxury';
    return 'Art';
}

// Maps asset category to investor demographic segment
function categoryToDemographic(category) {
    const map = {
        'Vehicle':     'Retail',
        'Luxury':      'HNIs',
        'Real Estate': 'Institutions',
        'Art':         'Corporates'
    };
    return map[category] || 'Corporates';
}

function showEmptyState(id, fallback) {
    const el = document.getElementById(id);
    if (el) el.innerText = fallback;
}

// ================================
// ADMIN LOGIC (GLOBAL MARKET)
// ================================
function renderGlobalKPIs(properties, user) {
    const totalMarketCap = properties.reduce((sum, prop) => sum + (Number(prop.price) || 0), 0);
    const activeInvestors = properties.length > 0 ? 1240 : 0; // Mock data for prototype
    const volume24h = totalMarketCap * 0.02; // Mock 2% daily volume

    const capEl = document.getElementById('kpi-market-cap');
    const invEl = document.getElementById('kpi-investors');
    const volEl = document.getElementById('kpi-volume');

    if (capEl) capEl.innerText = formatSmartCurrency(totalMarketCap);
    if (invEl) invEl.innerText = activeInvestors.toLocaleString();
    if (volEl) volEl.innerText = formatSmartCurrency(volume24h);

    // Update Header to show Admin Status
    const title = document.querySelector('h1');
    if (title) title.innerHTML = 'Platform Analytics <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; vertical-align: middle; margin-left: 10px;">Admin View</span>';
}

function renderGlobalCharts(properties) {
    // Format backend properties to match the chart's expected data structure
    const formattedAssets = properties.map(p => ({
        assetName: p.title,
        amount: p.price
    }));

    // Generate Global Trend (Mock dates for global platform view)
    const totalMarketCap = properties.reduce((sum, prop) => sum + (Number(prop.price) || 0), 0);
    renderTrendChart(
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Today'], 
        [0, totalMarketCap * 0.2, totalMarketCap * 0.5, totalMarketCap * 0.7, totalMarketCap * 0.9, totalMarketCap]
    );

    // Generate Global Category & Demographics
    const categoryMap = { 'Real Estate': 0, 'Vehicle': 0, 'Luxury': 0, 'Art': 0 };
    const demoMap     = { Retail: 0, HNIs: 0, Institutions: 0, Corporates: 0 };

    formattedAssets.forEach(asset => {
        const amt      = Number(asset.amount) || 0;
        const category = categorizeAsset(asset.assetName);
        const demo     = categoryToDemographic(category);
        categoryMap[category] += amt;
        demoMap[demo]         += amt;
    });

    renderCategoryChart(categoryMap);
    renderTopAssetsChart(formattedAssets); // Reusing your exact chart function!
    renderDemographicsChart(demoMap);
}

// ================================
// USER LOGIC (PERSONAL PORTFOLIO)
// ================================
// ================================
// KPI LOGIC
// ================================
function renderKPIs(user) {
    // Force email to lowercase to prevent capitalization mismatches
    const safeEmail = (user.email || '').toLowerCase();
    
    const balanceKey = getUserKey(safeEmail, 'balance');
    const investKey = getUserKey(safeEmail, 'investments');

    const balance = Number(localStorage.getItem(balanceKey)) || 0;
    const investments = JSON.parse(localStorage.getItem(investKey)) || [];

    // 🚨 DEBUG LOGS: Press F12 in your browser and check the Console to see these!
    console.log("📊 Analytics Check - User Email:", safeEmail);
    console.log("📊 Analytics Check - Investments Found:", investments.length);
    console.log("📊 Analytics Check - Raw Data:", investments);

    if (!investments || investments.length === 0) {
        showEmptyState('kpi-market-cap', '₹0');
        showEmptyState('kpi-investors', '0');
        showEmptyState('kpi-volume', '₹0');
        return;
    }

    let totalInvested = 0;
    let volume24h = 0;
    const now = Date.now();

    investments.forEach(inv => {
        const amt = Number(inv.amount) || 0;
        totalInvested += amt;
        if (inv.date && now - new Date(inv.date).getTime() <= 86400000) {
            volume24h += amt;
        }
    });

    const profit    = Math.floor(totalInvested * 0.125);
    const marketCap = balance + totalInvested + profit;

    const capEl = document.getElementById('kpi-market-cap');
    const invEl = document.getElementById('kpi-investors');
    const volEl = document.getElementById('kpi-volume');

    if (capEl) capEl.innerText = formatSmartCurrency(marketCap);
    if (invEl) invEl.innerText = investments.length ? '1 (You)' : '0';
    if (volEl) volEl.innerText = formatSmartCurrency(volume24h);
}

function renderCharts(user) {
    const investments = JSON.parse(
        localStorage.getItem(getUserKey(user.email, 'investments'))
    ) || [];

    let runningTotal = 0;
    const trendLabels = ['Start'];
    const trendData   = [0];

    investments
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(inv => {
            runningTotal += Number(inv.amount) || 0;
            trendLabels.push(
                new Date(inv.date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short'
                })
            );
            trendData.push(runningTotal);
        });

    renderTrendChart(trendLabels, trendData);

    const categoryMap = { 'Real Estate': 0, 'Vehicle': 0, 'Luxury': 0, 'Art': 0 };
    const demoMap     = { Retail: 0, HNIs: 0, Institutions: 0, Corporates: 0 };

    investments.forEach(inv => {
        const amt      = Number(inv.amount) || 0;
        const category = categorizeAsset(inv.assetName);
        const demo     = categoryToDemographic(category);
        categoryMap[category] += amt;
        demoMap[demo]         += amt;
    });

    renderCategoryChart(categoryMap);
    renderTopAssetsChart(investments);
    renderDemographicsChart(demoMap);
}

// ================================
// SHARED CHART RENDERERS
// ================================
function renderTrendChart(labels, data) {
    const canvas = document.getElementById('marketTrendChart');
    if (!canvas) return;

    if (window.trendChart instanceof Chart) window.trendChart.destroy();

    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99,102,241,0.4)');
    gradient.addColorStop(1, 'rgba(99,102,241,0)');

    window.trendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels.length > 1 ? labels : ['Start', 'Today'],
            datasets: [{
                data: data.length > 1 ? data : [0, 0],
                borderColor: '#6366f1', backgroundColor: gradient, fill: true, tension: 0.35, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: (v) => formatSmartCurrency(v) } } }
        }
    });
}

function renderCategoryChart(map) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;

    if (window.categoryChart instanceof Chart) window.categoryChart.destroy();

    const labels = Object.keys(map).filter(k => map[k] > 0);
    const values = Object.values(map).filter(v => v > 0);

    window.categoryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No Assets'],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'], borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
    });
}

function renderTopAssetsChart(investments) {
    const canvas = document.getElementById('topAssetsChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.topAssetsChart instanceof Chart) window.topAssetsChart.destroy();

    if (!investments.length) {
        window.topAssetsChart = new Chart(canvas, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: '#1e293b' }] },
            options: { plugins: { legend: { display: false } } }
        });
        return;
    }

    const assetTotals = {};
    investments.forEach(inv => {
        const name = inv.assetName || 'Unknown Asset';
        assetTotals[name] = (assetTotals[name] || 0) + (Number(inv.amount) || 0);
    });

    const top = Object.entries(assetTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount).slice(0, 5);

    window.topAssetsChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top.map(a => a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name),
            datasets: [{ data: top.map(a => a.amount), backgroundColor: '#6366f1', borderRadius: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: (v) => formatSmartCurrency(v) } } }
        }
    });
}

function renderDemographicsChart(demoMap) {
    const canvas = document.getElementById('demographicsChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.demographicsChart instanceof Chart) window.demographicsChart.destroy();

    const labels = Object.keys(demoMap).filter(k => demoMap[k] > 0);
    const values = Object.values(demoMap).filter(v => v > 0);

    window.demographicsChart = new Chart(canvas, {
        type: 'polarArea',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(16,185,129,0.7)', 'rgba(236,72,153,0.7)', 'rgba(245,158,11,0.7)']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } } }
    });
}
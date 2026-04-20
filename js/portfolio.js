// ================================
// USER HELPERS
// ================================
// const API_URL = window.location.hostname === "localhost"
//   ? "http://localhost:5000"
//   : "https://sharex-live.onrender.com";
function getUserKey(email, key) {
    return `fractionx_${email}_${key}`;
}

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', loadPortfolio);

async function loadPortfolio() {

    // --- 1. AUTH CHECK ---
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) {
        window.location.href = "login.html";
        return;
    }

    // --- 2. ADMIN FORK ---
    if (user.isAdmin) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="text-align: center; margin-top: 100px; color: white;">
                    <div style="width: 80px; height: 80px; background: rgba(99,102,241,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 2.5rem; border: 2px solid #6366f1;">
                        <i class="fas fa-shield-alt" style="color: #6366f1;"></i>
                    </div>
                    <h1 style="font-size: 2rem; margin-bottom: 10px; font-weight: bold;">Admin Clearance Active</h1>
                    <p style="color: #94a3b8; max-width: 500px; margin: 0 auto;">System Administrators do not hold personal portfolios. Please use the Analytics tab to view platform-wide asset distribution.</p>
                </div>
            `;
        }
        return;
    }

    // --- 3. DOM ELEMENTS ---
    const listContainer = document.getElementById('portfolioList');
    const netWorthEl = document.getElementById('totalNetWorth');
    const chartCanvas = document.getElementById('allocationChart');
    const navName = document.getElementById('navUserName');
    const avatarEls = document.querySelectorAll('.avatar-circle');

    // --- 4. PER-USER STORAGE KEYS ---
    const balanceKey = getUserKey(user.email, 'balance');
    const investmentsKey = getUserKey(user.email, 'investments');

    const rawInvestments = JSON.parse(localStorage.getItem(investmentsKey)) || [];
    const walletBalance = Number(localStorage.getItem(balanceKey)) || 0;

    // --- HEADER UI ---
    if (user.name) {
        navName && (navName.innerText = user.name);
        avatarEls.forEach(el => el.innerText = user.name.charAt(0).toUpperCase());
    }

    // --- 5. EMPTY STATE ---
    if (rawInvestments.length === 0) {
        if (listContainer) {
            listContainer.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:50px; color:var(--text-muted);">
                        <i class="fas fa-folder-open text-4xl mb-3" style="color: #475569; display: block;"></i>
                        <p style="margin-bottom: 10px;">No investments yet.</p>
                        <a href="marketplace.html" style="color:#6366f1; font-weight:600; text-decoration: none;">Start Investing →</a>
                    </td>
                </tr>`;
        }

        netWorthEl && (netWorthEl.innerText = "₹" + walletBalance.toLocaleString('en-IN'));
        chartCanvas && renderChart([], []);
        return;
    }

    // --- 6. AGGREGATE DUPLICATES ---
    const portfolioMap = {};
    
    rawInvestments.forEach(inv => {
        const id = inv.assetId || inv.assetName; // Use ID if available, otherwise name
        if (!portfolioMap[id]) {
            portfolioMap[id] = {
                assetName: inv.assetName || 'Unknown Asset',
                tokens: 0,
                amount: 0,
                date: inv.date
            };
        }
        portfolioMap[id].tokens += parseInt(inv.tokens || 1);
        portfolioMap[id].amount += parseInt(inv.amount || 0);
        
        // Keep the most recent purchase date
        if (new Date(inv.date) > new Date(portfolioMap[id].date)) {
            portfolioMap[id].date = inv.date;
        }
    });

    const consolidatedInvestments = Object.values(portfolioMap);

    // --- 7. CALCULATIONS & RENDER ---
    let totalInvested = 0;
    let categoryMap = {
        'Vehicle': 0,
        'Real Estate': 0,
        'Luxury': 0,
        'Art': 0
    };

    let html = '';

    // Sort by most recently purchased
    consolidatedInvestments.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
        const principal = inv.amount || 0;
        totalInvested += principal;

        let category = 'Art';
        const name = inv.assetName.toLowerCase();

        if (/ferrari|tesla|bmw|car|vehicle/.test(name)) category = 'Vehicle';
        else if (/villa|apartment|estate|city|house/.test(name)) category = 'Real Estate';
        else if (/rolex|watch|gold|diamond/.test(name)) category = 'Luxury';

        categoryMap[category] += principal;

        const dateStr = inv.date
            ? new Date(inv.date).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric'
              })
            : 'Just now';

        const initials = inv.assetName.substring(0, 2).toUpperCase();

        // Generate Table Row
        html += `
            <tr style="border-bottom:1px solid var(--border); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding:15px;">
                    <div style="display:flex;gap:12px;align-items:center;">
                        <div style="width:35px;height:35px;border-radius:10px;
                            background:rgba(99,102,241,.1);
                            color:#6366f1;
                            display:flex;align-items:center;justify-content:center;
                            font-weight:700;font-size:.8rem; border: 1px solid rgba(99,102,241,0.2);">
                            ${initials}
                        </div>
                        <div>
                            <div style="font-weight:600;color:var(--text-main); font-size: 0.95rem;">
                                ${inv.assetName}
                            </div>
                            <div style="font-size:.75rem;color:var(--text-muted)">
                                Last bought: ${dateStr}
                            </div>
                        </div>
                    </div>
                </td>
                <td style="padding:15px; color: #cbd5e1; font-weight: 500;">${inv.tokens}</td>
                <td style="padding:15px;font-weight:600; color: white;">
                    ₹${principal.toLocaleString('en-IN')}
                </td>
                <td style="padding:15px;text-align:right;">
                    <span style="background:rgba(16,185,129,.1);
                        color:#10b981;
                        padding:4px 10px;
                        border-radius:20px;
                        font-size:.75rem;
                        font-weight:700; border: 1px solid rgba(16,185,129,0.2);">
                        +12.5% APY
                    </span>
                </td>
            </tr>
        `;
    });

    listContainer && (listContainer.innerHTML = html);

    // --- 8. NET WORTH FIX ---
    // Net Worth = Cash in Wallet + Value of Assets Owned + Profit earned
    const profit = Math.floor(totalInvested * 0.125);
    const totalNetWorth = walletBalance + totalInvested + profit; // FIX: Added totalInvested!

    netWorthEl && (netWorthEl.innerText = "₹" + totalNetWorth.toLocaleString('en-IN'));

    // --- 9. CHART ---
    const chartLabels = Object.keys(categoryMap).filter(k => categoryMap[k] > 0);
    const chartData = Object.values(categoryMap).filter(v => v > 0);

    chartCanvas && renderChart(chartLabels, chartData);
}

// ================================
// CHART
// ================================
function renderChart(labels, data) {
    const ctx = document.getElementById('allocationChart');
    if (!ctx) return;

    if (window.portfolioChartInstance) {
        window.portfolioChartInstance.destroy();
    }

    window.portfolioChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#6366f1',
                    '#10b981',
                    '#f59e0b',
                    '#ec4899'
                ],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
                        padding: 20
                    }
                }
            }
        }
    });
}
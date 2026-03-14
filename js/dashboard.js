// ================================
// CONFIG
// ================================
const STORAGE_KEYS = {
  USER: 'user'
};

// ================================
// UTILS
// ================================
const $ = (id) => document.getElementById(id);

function getUserKey(email, key) {
  return `fractionx_${email}_${key}`;
}

const getFromStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const formatINR = (amount = 0) =>
  `₹${Number(amount).toLocaleString('en-IN')}`;

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', initDashboard);

function initDashboard() {
  console.log('Dashboard Loaded');

  const user = getFromStorage(STORAGE_KEYS.USER, null);
  if (!user || !user.email) {
      window.location.href = 'login.html';
      return;
  }

  // --- ROLE-BASED DASHBOARD SPLIT ---
  if (user.isAdmin) {
      // 1. If Admin: Render the special Control Panel
      renderAdminDashboard(user);
  } else {
      // 2. If Regular User: Render their personal financial stats
      const data = loadData(user);
      renderUser(user);
      renderStats(data);
      renderActivity(data.investments);
      renderChart(data);
  }
}

// ================================
// ADMIN DASHBOARD INJECTION
// ================================
// ================================
// ADMIN DASHBOARD INJECTION
// ================================
// ================================
// ADMIN DASHBOARD INJECTION
// ================================
async function renderAdminDashboard(user) {
    // 1. Setup Header
    const dashName = document.getElementById('dashUserName');
    const navName = document.getElementById('navUserName');
    if(dashName) dashName.innerText = "System Admin";
    if(navName) navName.innerText = user.name;

    const title = document.querySelector('h1');
    if (title) title.innerHTML = 'Admin Control Panel <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; vertical-align: middle; margin-left: 10px;">God Mode</span>';

    const subtitle = document.querySelector('.page-header p') || document.querySelector('h1').nextElementSibling;
    if (subtitle) subtitle.innerText = "Manage assets, monitor users, and oversee global transactions.";

    // 2. Hide User Elements
    const elementsToHide = [
        document.getElementById('dashBalance')?.closest('.dashboard-grid') || document.getElementById('dashBalance')?.parentElement?.parentElement,
        document.getElementById('portfolioChart')?.closest('.card') || document.getElementById('portfolioChart')?.parentElement?.parentElement,
        document.getElementById('dashActivityList')?.closest('.card') || document.getElementById('dashActivityList')?.parentElement
    ];
    elementsToHide.forEach(el => { if (el) el.style.display = 'none'; });

    // 3. FETCH GLOBAL ASSETS
    let globalProperties = [];
    try {
        const apiUrl = typeof API_URL !== 'undefined' ? API_URL : "http://localhost:5000";
        const res = await fetch(`${apiUrl}/properties`);
        if (res.ok) globalProperties = await res.json();
    } catch (e) {
        console.warn("Backend offline, using empty market data.");
    }

    // 4. SCAN LOCAL STORAGE FOR USERS & TRANSACTIONS (Hackathon Trick!)
    const allUsers = {};
    const globalTransactions = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Find Wallets
        if (key.startsWith('fractionx_') && key.endsWith('_balance')) {
            const email = key.split('_')[1];
            if (!allUsers[email]) allUsers[email] = { email: email, balance: 0, invCount: 0 };
            allUsers[email].balance = Number(localStorage.getItem(key));
        }
        
        // Find Investments
        if (key.startsWith('fractionx_') && key.endsWith('_investments')) {
            const email = key.split('_')[1];
            if (!allUsers[email]) allUsers[email] = { email: email, balance: 0, invCount: 0 };
            
            const investments = JSON.parse(localStorage.getItem(key)) || [];
            allUsers[email].invCount += investments.length;
            
            investments.forEach(inv => {
                globalTransactions.push({ email: email, ...inv });
            });
        }
    }

    // Sort transactions by newest first
    globalTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 5. BUILD ASSET TABLE HTML
    let assetRows = globalProperties.length === 0 
        ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">No assets found.</td></tr>`
        : globalProperties.map(prop => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                    <img src="${prop.image}" style="width: 30px; height: 30px; border-radius: 6px; object-fit: cover;">
                    <div style="color: white; font-weight: bold; font-size: 0.9rem;">${prop.title}</div>
                </td>
                <td style="padding: 12px; color: #94a3b8; font-size: 0.85rem;">${prop.category}</td>
                <td style="padding: 12px; color: white; font-weight: bold; font-size: 0.9rem;">₹${(Number(prop.price) || 0).toLocaleString('en-IN')}</td>
                <td style="padding: 12px; text-align: right;">
                    <button onclick="adminDeleteAsset('${prop._id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Delist</button>
                </td>
            </tr>
        `).join('');

    // 6. BUILD USER DIRECTORY HTML
    let userRows = Object.values(allUsers).length === 0
        ? `<tr><td colspan="3" style="text-align:center; padding: 20px; color: #94a3b8;">No active users.</td></tr>`
        : Object.values(allUsers).map(u => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 12px; color: white; font-size: 0.85rem;"><i class="fas fa-user-circle mr-2 text-primary"></i>${u.email}</td>
                <td style="padding: 12px; color: #10b981; font-weight: bold; font-size: 0.85rem;">₹${u.balance.toLocaleString('en-IN')}</td>
                <td style="padding: 12px; text-align: right; color: #94a3b8; font-size: 0.85rem;">${u.invCount} Assets</td>
            </tr>
        `).join('');

    // 7. BUILD TRANSACTION LEDGER HTML
    let txRows = globalTransactions.length === 0
        ? `<div style="text-align:center; padding: 20px; color: #94a3b8;">No transactions yet.</div>`
        : globalTransactions.map(tx => {
            const timeStr = new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="color: white; font-size: 0.85rem; font-weight: bold;">${tx.email.split('@')[0]} <span style="color: #94a3b8; font-weight: normal;">bought</span> ${tx.tokens}x ${tx.assetName}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${new Date(tx.date).toLocaleDateString()} at ${timeStr}</div>
                </div>
                <div style="color: #10b981; font-weight: bold; font-size: 0.9rem;">+₹${(tx.amount || 0).toLocaleString('en-IN')}</div>
            </div>
        `}).join('');

    // 8. INJECT HTML
    const adminPanel = document.createElement('div');
    adminPanel.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; margin-top: 20px;">
            <div style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                <h3 style="color: #94a3b8; font-size: 0.9rem;">Total Assets</h3>
                <div style="font-size: 1.8rem; color: white; font-weight: bold;">${globalProperties.length}</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                <h3 style="color: #94a3b8; font-size: 0.9rem;">Registered Investors</h3>
                <div style="font-size: 1.8rem; color: white; font-weight: bold;">${Object.keys(allUsers).length}</div>
            </div>
            <a href="tokenize.html" style="background: linear-gradient(135deg, #6366f1 0%, #d946ef 100%); padding: 20px; border-radius: 16px; text-decoration: none; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 1.1rem; color: white; font-weight: bold;">Mint New Asset</div>
                <i class="fas fa-plus-circle text-2xl text-white"></i>
            </a>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden;">
                <div style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                    <h3 style="color: white; font-size: 1.1rem; font-weight: bold;"><i class="fas fa-server mr-2 text-primary"></i> Asset Inventory</h3>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tbody>${assetRows}</tbody>
                    </table>
                </div>
            </div>

            <div style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden;">
                <div style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                    <h3 style="color: white; font-size: 1.1rem; font-weight: bold;"><i class="fas fa-users mr-2 text-primary"></i> Investor Directory</h3>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tbody>${userRows}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <div style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden;">
            <div style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                <h3 style="color: white; font-size: 1.1rem; font-weight: bold;"><i class="fas fa-stream mr-2 text-primary"></i> Live Global Ledger</h3>
            </div>
            <div style="max-height: 300px; overflow-y: auto; padding: 10px;">
                ${txRows}
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; margin-top: 20px;">
            <div style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                <h3 style="color: #94a3b8; font-size: 0.9rem;">Total Assets</h3>
                <div style="font-size: 1.8rem; color: white; font-weight: bold;">${globalProperties.length}</div>
            </div>
            
            <a href="tokenize.html" style="background: linear-gradient(135deg, #6366f1 0%, #d946ef 100%); padding: 20px; border-radius: 16px; text-decoration: none; display: flex; align-items: center; justify-content: space-between; transition: transform 0.2s;">
                <div style="font-size: 1.1rem; color: white; font-weight: bold;">Mint New Asset</div>
                <i class="fas fa-plus-circle text-2xl text-white"></i>
            </a>

            <button onclick="distributeDividends()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 16px; text-decoration: none; display: flex; align-items: center; justify-content: space-between; border: none; cursor: pointer; transition: transform 0.2s; text-align: left;">
                <div>
                    <h3 style="color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-bottom: 5px;">Execute Smart Contract</h3>
                    <div style="font-size: 1.1rem; color: white; font-weight: bold;">Distribute Yields</div>
                </div>
                <i class="fas fa-hand-holding-usd text-2xl text-white"></i>
            </button>
        </div>
    `;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.appendChild(adminPanel);
}

// Global function to handle deletion directly from the dashboard
window.adminDeleteAsset = async function(assetId) {
    if (!confirm("⚠️ Are you sure you want to delist this asset?")) return;
    try {
        const apiUrl = typeof API_URL !== 'undefined' ? API_URL : "http://localhost:5000";
        const res = await fetch(`${apiUrl}/properties/${assetId}`, { method: 'DELETE' });
        if (res.ok) {
            alert("✅ Asset successfully delisted!");
            window.location.reload(); 
        } else {
            alert("❌ Failed to delete. Check backend.");
        }
    } catch (e) {
        alert("❌ Error communicating with backend.");
    }
}

// ================================
// DATA (PER USER)
// ================================
function loadData(user) {
  const balanceKey = getUserKey(user.email, 'balance');
  const investmentsKey = getUserKey(user.email, 'investments');

  return {
    balance: Number(localStorage.getItem(balanceKey)) || 0,
    investments: getFromStorage(investmentsKey, [])
  };
}

// ================================
// RENDER FUNCTIONS (FOR USERS)
// ================================
function renderUser(user) {
  const firstName = user.name?.split(' ')[0] || 'User';
  $('dashUserName') && ($('dashUserName').innerText = firstName);
  $('navUserName') && ($('navUserName').innerText = user.name);
}

function renderStats({ balance, investments }) {
  $('dashBalance') && ($('dashBalance').innerText = formatINR(balance));
  
  const uniqueAssets = new Set(investments.map(inv => inv.assetId));
  $('totalAssetsCount') && ($('totalAssetsCount').innerText = uniqueAssets.size);

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const estimatedProfit = Math.floor(totalInvested * 0.125); // Simple 12.5% mock profit
  $('dashProfit') && ($('dashProfit').innerText = `+${formatINR(estimatedProfit)}`);
}

function renderActivity(investments = []) {
  const container = $('dashActivityList');
  if (!container) return;

  if (investments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-wallet"></i>
        <p>No investments yet.<br>Go to Marketplace to start!</p>
      </div>`;
    return;
  }

  const recent = [...investments]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  container.innerHTML = recent.map(renderActivityItem).join('');
}

function renderActivityItem(inv) {
  const initials = inv.assetName?.slice(0, 2).toUpperCase() || 'FX';
  const date = inv.date ? new Date(inv.date).toLocaleDateString() : 'Just now';

  return `
    <div class="activity-item">
      <div class="act-icon">${initials}</div>
      <div class="act-info">
        <h4>${inv.assetName || 'Unknown Asset'}</h4>
        <span>Bought on ${date}</span>
      </div>
      <div class="act-amount">
        <h4>${formatINR(inv.amount)}</h4>
        <span class="positive">+${inv.tokens || 1} Tokens</span>
      </div>
    </div>`;
}

// ================================
// CHART (FOR USERS)
// ================================
function renderChart({ balance, investments }) {
  const ctx = $('portfolioChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (window.portfolioChart instanceof Chart) window.portfolioChart.destroy();

  const { labels, values } = buildPortfolioSeries(balance, investments);

  window.portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.15)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function buildPortfolioSeries(initialBalance, investments = []) {
  let netWorth = initialBalance || 0;
  const labels = ['Start'];
  const values = [netWorth];

  investments
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(inv => {
      netWorth = netWorth - inv.amount + inv.amount * 1.125;
      labels.push(new Date(inv.date).toLocaleDateString());
      values.push(Math.round(netWorth));
    });

  return { labels, values };
}
// ==========================================
// ADMIN: SMART DIVIDEND DISTRIBUTION ENGINE
// ==========================================
window.distributeDividends = function() {
    if (!confirm("⚠️ Initiate Smart Contract? This will distribute a 2% monthly yield to all token holders based on their portfolio size.")) return;

    let totalPayout = 0;
    let investorsPaid = 0;

    // Scan all browser memory for user investments
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key.startsWith('fractionx_') && key.endsWith('_investments')) {
            const email = key.split('_')[1];
            const investments = JSON.parse(localStorage.getItem(key)) || [];
            
            if (investments.length > 0) {
                // Calculate total invested by this user
                let userTotalInvested = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
                
                // Calculate 2% yield
                let userYield = Math.floor(userTotalInvested * 0.02);
                
                if (userYield > 0) {
                    // Find their wallet balance key
                    const balanceKey = `fractionx_${email}_balance`;
                    let currentBalance = Number(localStorage.getItem(balanceKey)) || 0;
                    
                    // Deposit the yield into their wallet!
                    localStorage.setItem(balanceKey, currentBalance + userYield);
                    
                    totalPayout += userYield;
                    investorsPaid++;
                }
            }
        }
    }

    if (investorsPaid > 0) {
        alert(`✅ Smart Contract Executed!\n\nSuccessfully distributed ₹${totalPayout.toLocaleString('en-IN')} across ${investorsPaid} investors' wallets.`);
        window.location.reload(); // Refresh the ledger and stats
    } else {
        alert("ℹ️ No active investors found to pay out.");
    }
}
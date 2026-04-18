const API_URL = "https://sharex-live.onrender.com";
class FractionXPlatform {
    constructor() {
        this.assets = [];
        this.userPortfolio = [];
        this.walletBalance = 0;
        this.favorites = new Set();
        this.currentFilter = 'all';
        this.currentUser = null;
        this.currentPurchaseAsset = null;

        this.init();
    }

    // ================================
    // HELPERS
    // ================================
    getUserKey(key) {
        return `fractionx_${this.currentUser.email}_${key}`;
    }

    // ================================
    // INIT
    // ================================
    init() {
        this.currentUser = JSON.parse(localStorage.getItem('user'));

        if (!this.currentUser || !this.currentUser.email) {
            window.location.href = 'login.html';
            return;
        }

        this.loadSampleData();
        this.loadUserData();
        this.bindEvents();
        this.renderAssets();
        this.renderPortfolio();
        this.updateStats();

        console.log('Platform Initialized (Per-User Version)');
    }

    // ================================
    // DATA
    // ================================
    loadSampleData() {
        this.assets = [
            { id: 1, name: "Ferrari SF90 Stradale", subtitle: "2023 • Hybrid Supercar", type: "vehicle", value: 500000, tokenPrice: 1, totalTokens: 500000, soldTokens: 127500, image: "linear-gradient(135deg, #ef4444, #991b1b)", icon: "🏎️", returns: "24.5%", riskLevel: "Medium" },
            { id: 2, name: "Manhattan Penthouse", subtitle: "Upper East Side", type: "real-estate", value: 2500000, tokenPrice: 5, totalTokens: 500000, soldTokens: 287500, image: "linear-gradient(135deg, #3b82f6, #1e40af)", icon: "🏢", returns: "12.8%", riskLevel: "Low" },
            { id: 3, name: "Bored Ape #3749", subtitle: "BAYC • Rare", type: "nft", value: 85000, tokenPrice: 0.17, totalTokens: 500000, soldTokens: 425000, image: "linear-gradient(135deg, #a855f7, #6b21a8)", icon: "🎨", returns: "67.2%", riskLevel: "High" },
            { id: 4, name: "Banksy Original", subtitle: "Girl with Balloon", type: "art", value: 750000, tokenPrice: 1.5, totalTokens: 500000, soldTokens: 156250, image: "linear-gradient(135deg, #f59e0b, #b45309)", icon: "🖼️", returns: "89.4%", riskLevel: "High" }
        ];
    }

    loadUserData() {
        const balanceKey = this.getUserKey('balance');
        const portfolioKey = this.getUserKey('portfolio');
        const favKey = this.getUserKey('favorites');

        this.walletBalance = Number(localStorage.getItem(balanceKey)) || 0;
        this.userPortfolio = JSON.parse(localStorage.getItem(portfolioKey)) || [];
        this.favorites = new Set(JSON.parse(localStorage.getItem(favKey)) || []);

        document.getElementById('walletBalance') &&
            (document.getElementById('walletBalance').innerText = `$${this.walletBalance.toFixed(2)}`);
    }

    persistUserData() {
        localStorage.setItem(this.getUserKey('balance'), this.walletBalance);
        localStorage.setItem(this.getUserKey('portfolio'), JSON.stringify(this.userPortfolio));
        localStorage.setItem(this.getUserKey('favorites'), JSON.stringify([...this.favorites]));
    }

    // ================================
    // EVENTS
    // ================================
    bindEvents() {
        document.querySelectorAll('.filter-btn')
            .forEach(btn => btn.addEventListener('click', e => this.handleFilter(e)));

        document.getElementById('confirmPurchaseBtn')
            ?.addEventListener('click', () => this.confirmPurchase());

        document.getElementById('cancelPurchaseBtn')
            ?.addEventListener('click', () => this.closeAllModals());

        document.getElementById('tokenAmount')
            ?.addEventListener('input', () => this.updatePurchaseCost());
    }

    // ================================
    // RENDER ASSETS
    // ================================
    renderAssets() {
        const grid = document.getElementById('assetsGrid');
        if (!grid) return;

        const filtered = this.currentFilter === 'all'
            ? this.assets
            : this.assets.filter(a => a.type === this.currentFilter);

        grid.innerHTML = '';

        filtered.forEach(asset => {
            const soldPct = (asset.soldTokens / asset.totalTokens) * 100;
            const available = asset.totalTokens - asset.soldTokens;
            const isFav = this.favorites.has(asset.id);

            const card = document.createElement('div');
            card.className = 'asset-card';

            card.innerHTML = `
                <div class="card-img" style="background:${asset.image}">
                    <div class="card-badge">${asset.type.toUpperCase()}</div>
                    <button class="card-fav-btn ${isFav ? 'active' : ''}">
                        <i class="fas fa-heart"></i>
                    </button>
                    ${asset.icon}
                </div>
                <div class="card-body">
                    <div class="card-title">${asset.name}</div>
                    <div class="card-sub">${asset.subtitle}</div>

                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${soldPct}%"></div>
                        </div>
                        <small>${available.toLocaleString()} tokens left</small>
                    </div>

                    <button class="btn-buy" onclick="platform.showPurchaseModal(${asset.id})">
                        Buy Tokens
                    </button>
                </div>
            `;

            card.querySelector('.card-fav-btn')
                .addEventListener('click', () => this.toggleFavorite(asset.id));

            grid.appendChild(card);
        });
    }

    // ================================
    // PORTFOLIO
    // ================================
    renderPortfolio() {
        const list = document.getElementById('portfolioList');
        if (!list) return;

        list.innerHTML = '';
        let total = 0;

        this.userPortfolio.forEach(item => {
            total += item.value;
            const div = document.createElement('div');
            div.className = 'portfolio-item';
            div.innerHTML = `
                <div>${item.assetName}</div>
                <div>${item.tokens} tokens</div>
                <div>$${item.value.toFixed(2)}</div>
            `;
            list.appendChild(div);
        });

        document.querySelector('.portfolio-value') &&
            (document.querySelector('.portfolio-value').innerText = `$${total.toFixed(2)}`);
    }

    // ================================
    // MODALS
    // ================================
    showPurchaseModal(id) {
        this.currentPurchaseAsset = this.assets.find(a => a.id === id);
        document.getElementById('availableTokens').innerText =
            (this.currentPurchaseAsset.totalTokens - this.currentPurchaseAsset.soldTokens).toLocaleString();
        this.openModal('purchaseModal');
    }

    openModal(id) {
        document.getElementById('modalOverlay').classList.remove('hidden');
        document.getElementById(id).classList.remove('hidden');
    }

    closeAllModals() {
        document.getElementById('modalOverlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    // ================================
    // PURCHASE
    // ================================
    updatePurchaseCost() {
        const qty = Number(document.getElementById('tokenAmount').value);
        const total = qty * this.currentPurchaseAsset.tokenPrice;
        document.getElementById('totalCost').innerText = `$${total.toFixed(2)}`;
    }

    confirmPurchase() {
        const qty = Number(document.getElementById('tokenAmount').value);
        if (!qty) return;

        const cost = qty * this.currentPurchaseAsset.tokenPrice;
        if (this.walletBalance < cost) {
            alert('Insufficient balance');
            return;
        }

        this.walletBalance -= cost;
        this.userPortfolio.push({
            assetId: this.currentPurchaseAsset.id,
            assetName: this.currentPurchaseAsset.name,
            tokens: qty,
            value: cost,
            change: "+0.0%"
        });

        this.persistUserData();
        this.renderPortfolio();

        document.getElementById('walletBalance').innerText =
            `$${this.walletBalance.toFixed(2)}`;

        this.closeAllModals();
        this.openModal('successModal');
    }

    // ================================
    // MISC
    // ================================
    toggleFavorite(id) {
        this.favorites.has(id) ? this.favorites.delete(id) : this.favorites.add(id);
        this.persistUserData();
        this.renderAssets();
    }

    handleFilter(e) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderAssets();
    }

    updateStats() {
        document.getElementById('totalAssets') &&
            (document.getElementById('totalAssets').innerText = this.assets.length);
    }
}

// ================================
// BOOTSTRAP
// ================================
window.platform = new FractionXPlatform();

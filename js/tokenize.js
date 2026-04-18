const API_URL = "https://sharex-live.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Tokenize Asset Script Loaded");

    // ================================
    // AUTH CHECK
    // ================================
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) {
        window.location.href = "login.html";
        return;
    }

    // ================================
    // HELPERS
    // ================================
    const get = (id) => document.getElementById(id);
    const getSel = (sel) => document.querySelector(sel);

    const getUserKey = (key) => `fractionx_${user.email}_${key}`;

    // ================================
    // INPUTS
    // ================================
    const inputs = {
        title: get('assetTitle'),
        location: get('assetLocation'),
        price: get('assetPrice'),
        supply: get('totalTokens'),
        tokenPrice: get('tokenPrice'),
        roi: get('assetRoi'),
        category: get('assetCategory'),
        image: get('assetImage')
    };

    // ================================
    // PREVIEW ELEMENTS
    // ================================
    const preview = {
        title: getSel('.p-header h4'),
        apy: getSel('.p-apy'),
        category: getSel('.p-cat'),
        location: getSel('#prevLoc'),
        valuation: getSel('.p-stats .stat-col:nth-child(1) strong'),
        tokenPrice: getSel('.p-stats .stat-col:nth-child(2) strong'),
        image: getSel('.p-img')
    };

    // ================================
    // AUTO TOKEN PRICE
    // ================================
    function calculateTokenPrice() {
        const valuation = Number(inputs.price.value);
        const supply = Number(inputs.supply.value);

        if (valuation > 0 && supply > 0) {
            inputs.tokenPrice.value = (valuation / supply).toFixed(2);
        } else {
            inputs.tokenPrice.value = '';
        }
        updatePreview();
    }

    // ================================
    // LIVE PREVIEW
    // ================================
    function updatePreview() {
        if (preview.title) preview.title.innerText = inputs.title.value || "Asset Name";
        if (preview.apy) preview.apy.innerText = inputs.roi.value ? `+${inputs.roi.value}% APY` : "+0% APY";
        if (preview.category) preview.category.innerText = inputs.category.value || "Category";
        if (preview.location) preview.location.innerText = inputs.location.value || "Global";

        if (preview.valuation) {
            const val = Number(inputs.price.value);
            preview.valuation.innerText = val
                ? `₹${val.toLocaleString('en-IN')}`
                : "₹0";
        }

        if (preview.tokenPrice) {
            const tp = Number(inputs.tokenPrice.value);
            preview.tokenPrice.innerText = tp ? `₹${tp.toLocaleString('en-IN')}` : "₹0";
        }

        if (preview.image) {
            const url = inputs.image.value.trim();
            preview.image.src = url.startsWith('http')
                ? url
                : "https://via.placeholder.com/400x300";
        }
    }

    // ================================
    // LISTENERS
    // ================================
    inputs.price?.addEventListener('input', calculateTokenPrice);
    inputs.supply?.addEventListener('input', calculateTokenPrice);

    Object.values(inputs).forEach(i => i?.addEventListener('input', updatePreview));

    // ================================
    // SUBMIT LOGIC
    // ================================
    const btn = get('createBtn');

    btn?.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!inputs.title.value || !inputs.price.value || !inputs.supply.value) {
            alert("Please fill all required fields.");
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Minting Asset...';
        btn.disabled = true;

        // Normalize Category
        const category = inputs.category.value || "Vehicle";

        const assetData = {
            title: inputs.title.value,
            location: inputs.location.value || "Global",
            price: Number(inputs.price.value),
            fractionPrice: Number(inputs.tokenPrice.value),
            roi: inputs.roi.value ? `${inputs.roi.value}%` : "0%",
            category,
            image: inputs.image.value.trim() || "https://via.placeholder.com/400",
            createdBy: user.email,
            createdAt: new Date().toISOString()
        };

        try {
            const res = await fetch(`${API_URL}/properties`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData)
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

        } catch (err) {
            console.warn("Backend offline → saving locally");

            // 🔥 LOCAL FALLBACK
            const localKey = getUserKey('tokenized_assets');
            const existing = JSON.parse(localStorage.getItem(localKey)) || [];
            existing.push({ ...assetData, _id: Date.now().toString() });
            localStorage.setItem(localKey, JSON.stringify(existing));
        }

        btn.innerHTML = '<i class="fas fa-check"></i> Asset Created';
        btn.style.background = '#10b981';

        setTimeout(() => {
            window.location.href = "marketplace.html";
        }, 900);
    });
});

// ================================
// USER HELPERS
// ================================
const STORAGE_KEY_USER = 'user';
// const API_URL = window.location.hostname === "localhost"
//   ? "http://localhost:5000"
//   : "https://sharex-live.onrender.com";

function getUserKey(email, key) {
    return `fractionx_${email}_${key}`;
}

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Profile Page Initialized");
    loadProfile();
});

// ================================
// LOAD PROFILE
// ================================
window.loadProfile = function () {
    // --- AUTH CHECK ---
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER));
    if (!user || !user.email) {
        window.location.href = 'login.html';
        return;
    }

    // --- HEADER ---
    safeSetText('navUserName', user.name);

    // --- ROLE-BASED FORK ---
    if (user.isAdmin) {
        renderAdminProfile(user);
    } else {
        renderUserProfile(user);
    }
};

// ================================
// ADMIN PROFILE LOGIC
// ================================
function renderAdminProfile(user) {
    // 1. Change the page header
    const headerTitle = document.querySelector('.page-header h1') || document.querySelector('h1');
    const headerDesc = document.querySelector('.page-header p');
    if (headerTitle) headerTitle.innerText = "System Identity";
    if (headerDesc) headerDesc.innerText = "Administrator Access and Security clearance.";

    // 2. Hide the user-specific grids, forms, and wallet cards
    // Targeting the main wrappers that usually hold the profile and credit card
    const profileGrid = document.querySelector('.profile-grid') || document.querySelector('.grid'); 
    if (profileGrid) profileGrid.style.display = 'none';

    // 3. Prevent duplicate admin cards if re-rendering
    const existingAdminCard = document.getElementById('admin-identity-card');
    if (existingAdminCard) existingAdminCard.remove();

    // 4. Inject Admin Identity Card
    const adminCard = document.createElement('div');
    adminCard.id = 'admin-identity-card';
    adminCard.innerHTML = `
        <div style="background: var(--navy-800, #0f172a); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 40px; margin-top: 20px; display: flex; align-items: center; gap: 30px; flex-wrap: wrap; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #6366f1, #d946ef); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: bold; color: white; box-shadow: 0 10px 20px rgba(99,102,241,0.4);">
                <i class="fas fa-shield-alt"></i>
            </div>
            <div>
                <div style="display: inline-block; background: rgba(99,102,241,0.2); color: #6366f1; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px; border: 1px solid rgba(99,102,241,0.3);">
                    Level 5 Clearance
                </div>
                <h2 style="font-size: 2rem; color: white; margin-bottom: 5px;">${user.name}</h2>
                <p style="color: #94a3b8; margin-bottom: 15px;"><i class="fas fa-envelope mr-2"></i> ${user.email}</p>
                <div style="display: flex; gap: 15px;">
                    <button style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: not-allowed; transition: all 0.3s;">
                        <i class="fas fa-key mr-2"></i> Reset Admin Keys
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.appendChild(adminCard);
}

// ================================
// USER PROFILE LOGIC
// ================================
function renderUserProfile(user) {
    // --- PER-USER BALANCE ---
    const balanceKey = getUserKey(user.email, 'balance');
    const balance = Number(localStorage.getItem(balanceKey)) || 0;

    safeSetText('profileInitials', user.name.charAt(0).toUpperCase());
    safeSetText('profileNameDisplay', user.name);
    safeSetText('profileEmailDisplay', user.email);

    // --- CREDIT CARD ---
    safeSetText('cardBalance', `₹${balance.toLocaleString('en-IN')}`);
    safeSetText('cardHolder', user.name.toUpperCase());

    // --- FORM FIELDS ---
    safeSetValue('inputName', user.name);
    safeSetValue('inputEmail', user.email);
    safeSetValue('inputPhone', user.phone || '');
    safeSetValue('inputLocation', user.location || '');
    safeSetValue('inputBio', user.bio || '');
}

// ================================
// ADD FUNDS (USERS ONLY)
// ================================
window.openDepositModal = function () {
    const modal = document.getElementById('depositModal');
    modal && (modal.style.display = 'flex');
};

window.closeDepositModal = function () {
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.style.display = 'none';
        const input = document.getElementById('depositAmount');
        if (input) input.value = '';
    }
};

window.confirmDeposit = function () {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER));
    if (!user || !user.email) return;

    const amountInput = document.getElementById('depositAmount');
    if (!amountInput) return;

    const amount = parseInt(amountInput.value);
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    const balanceKey = getUserKey(user.email, 'balance');
    const btn = document.querySelector('.confirm-btn');
    const originalText = btn?.innerText || 'Confirm';

    btn && (btn.innerText = "Processing...");
    btn && (btn.disabled = true);

    setTimeout(() => {
        let currentBalance = Number(localStorage.getItem(balanceKey)) || 0;
        currentBalance += amount;

        localStorage.setItem(balanceKey, currentBalance);

        loadProfile();
        closeDepositModal();

        btn && (btn.innerText = originalText);
        btn && (btn.disabled = false);

        alert(`✅ Successfully added ₹${amount.toLocaleString('en-IN')}!`);
    }, 1000);
};

// ================================
// SAVE PROFILE (USERS ONLY)
// ================================
window.saveProfileData = function () {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER));
    if (!user) return;

    const newName = document.getElementById('inputName').value;
    if (!newName) return alert("Name cannot be empty.");

    user.name = newName;
    user.phone = document.getElementById('inputPhone').value;
    user.location = document.getElementById('inputLocation').value;
    user.bio = document.getElementById('inputBio').value;

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

    loadProfile();
    alert("✅ Profile Updated Successfully!");
};

// ================================
// HELPERS
// ================================
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// ================================
// CLOSE MODAL ON OUTSIDE CLICK
// ================================
window.onclick = function (event) {
    const modal = document.getElementById('depositModal');
    if (event.target === modal) closeDepositModal();
};
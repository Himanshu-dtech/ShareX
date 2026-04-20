console.log("🚀 Global Script Loaded");

// Set this to your local server URL for testing
const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://sharex-live.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. ROLE-BASED SIDEBAR CONTROL ---
    // Run this first to hide/show elements based on the stored user role
    setupRoleBasedUI();

    // --- 2. HEADER USERNAME FIX ---
    await updateGlobalHeader();

    // --- 3. SIDEBAR TOGGLE LOGIC ---
    setupSidebar();

    // --- 4. DARK MODE TOGGLE ---
    setupDarkMode();

    // --- 5. LOGOUT LOGIC ---
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            if(confirm("Are you sure you want to logout?")) {
                localStorage.removeItem('user');
                window.location.href = "login.html";
            }
        });
    });
});

// --- HELPER FUNCTIONS ---

/**
 * Controls menu visibility based on user role (Admin vs User)
 */
/**
 * Controls menu visibility based on user role (Admin vs User)
 */

function setupRoleBasedUI() {
    const localUser = JSON.parse(localStorage.getItem('user'));
    const tokenizeMenuItem = document.getElementById('admin-only-tokenize');
    
    // Find all menu items marked for regular users only
    const userOnlyItems = document.querySelectorAll('.user-only');

    if (localUser && localUser.isAdmin === true) {
        // --- ADMIN MODE ---
        if (tokenizeMenuItem) tokenizeMenuItem.style.display = 'block';
        
        // Hide all personal user links
        userOnlyItems.forEach(item => item.style.display = 'none');
        
        console.log("👑 Role Detected: Admin. Adjusting sidebar.");
    } else {
        // --- USER MODE ---
        if (tokenizeMenuItem) tokenizeMenuItem.style.display = 'none';
        
        // Show personal user links
        userOnlyItems.forEach(item => item.style.display = '');
        
        console.log("👤 Role Detected: User. Adjusting sidebar.");
    }
}

/**
 * Updates the navigation bar with user info
 */
async function updateGlobalHeader() {
    try {
        const localUser = JSON.parse(localStorage.getItem('user'));
        
        if (localUser && localUser.name) {
            updateUserUI(localUser);
        } else if (localUser && localUser.email) {
            // If local data is missing name, fetch fresh data from backend
            const res = await fetch(`${API_URL}/user?email=${localUser.email}`);
            if (res.ok) {
                const user = await res.json();
                updateUserUI(user);
                // Sync the local storage with fresh data (including isAdmin status)
                localStorage.setItem('user', JSON.stringify(user));
                setupRoleBasedUI(); // Re-run UI check with fresh data
            }
        }
    } catch (err) { 
        console.error("User fetch error:", err); 
    }
}

function updateUserUI(user) {
    const navName = document.getElementById('navUserName');
    if (navName) navName.innerText = user.name;

    const avatars = document.querySelectorAll('.avatar-circle');
    avatars.forEach(el => el.innerText = user.name.charAt(0).toUpperCase());

    const dashName = document.getElementById('dashUserName');
    if (dashName) dashName.innerText = user.name.split(' ')[0];
}

function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const mainContent = document.querySelector('.main-content');
    
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if(isCollapsed && window.innerWidth > 900 && sidebar) {
        sidebar.classList.add('collapsed');
        if(mainContent) mainContent.style.marginLeft = '80px';
    }

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth > 900) {
                sidebar.classList.toggle('collapsed');
                const collapsed = sidebar.classList.contains('collapsed');
                if(mainContent) mainContent.style.marginLeft = collapsed ? '80px' : '260px';
                localStorage.setItem('sidebar-collapsed', collapsed);
            } else {
                sidebar.classList.toggle('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900 && sidebar.classList.contains('active')) { 
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}

function setupDarkMode() {
    const themeBtn = document.getElementById('themeToggle');
    const body = document.body;
    
    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
        updateThemeUI(true);
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            const isLight = body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            updateThemeUI(isLight);
        });
    }

    function updateThemeUI(isLight) {
        if (!themeBtn) return;
        themeBtn.innerHTML = isLight 
            ? `<i class="fas fa-moon"></i> <span class="link-text">Dark Mode</span>` 
            : `<i class="fas fa-sun"></i> <span class="link-text">Light Mode</span>`;
    }
}
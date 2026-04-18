// CHANGE TO YOUR PORT (5000 or 5001)
const API_URL = "https://sharex-live.onrender.com";

let isLoginMode = true;

// This function must be GLOBAL so the HTML onclick="" can find it
function switchTab(mode) {
    isLoginMode = (mode === 'login');
    const title = document.getElementById('formTitle');
    const subtitle = document.getElementById('formSubtitle');
    const nameGroup = document.getElementById('nameGroup');
    const submitBtn = document.getElementById('submitBtn');
    const tabs = document.querySelectorAll('.tab');

    if (isLoginMode) {
        title.innerText = "Welcome Back";
        subtitle.innerText = "Enter your details to access your portfolio.";
        nameGroup.style.display = "none";
        document.getElementById('name').removeAttribute('required'); 
        submitBtn.innerText = "Log In";
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        title.innerText = "Create Account";
        subtitle.innerText = "Join FractionX and start investing today.";
        nameGroup.style.display = "block";
        document.getElementById('name').setAttribute('required', 'true');
        submitBtn.innerText = "Sign Up";
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Processing..."; 
    submitBtn.disabled = true;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    const endpoint = isLoginMode ? '/login' : '/register';
    const payload = isLoginMode ? { email, password } : { name, email, password };

    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            if (isLoginMode) {
                // Save user info
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // ✅ REDIRECT TO DASHBOARD (OVERVIEW)
                window.location.href = 'dashboard.html';
            } else {
                alert("✅ Account created! Please log in.");
                switchTab('login');
            }
        } else {
            alert("❌ " + (data.message || "An error occurred"));
        }
    } catch (error) {
        console.error(error);
        alert("Could not connect to server.");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});
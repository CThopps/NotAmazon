// This script runs on page load and checks /debug/session
// to see if a user is logged in. Then it hides/shows header links.

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/debug/session', {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('Failed to fetch session info');
            return;
        }

        const data = await response.json();
        const user = data.user || null;

        const loginLink  = document.getElementById('login-link');
        const signupLink = document.getElementById('signup-link');
        const logoutForm = document.getElementById('logout-form');
        const userInfo   = document.getElementById('user-info');
        const adminLink  = document.getElementById('admin-link'); 

        if (user) {
            // Logged in → hide login/signup, show logout
            if (loginLink)  loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';
            if (logoutForm) logoutForm.style.display = 'inline';

            if (userInfo) {
                userInfo.textContent = `Logged in as ${user.email} (${user.role})`;
            }

            if (adminLink) {
                if (user.role === 'admin') {
                    adminLink.style.display = 'inline';
                } else {
                    adminLink.style.display = 'none';
                }
            }
        } else {
            // Logged out → show login/signup, hide logout/admin
            if (loginLink)  loginLink.style.display = 'inline';
            if (signupLink) signupLink.style.display = 'inline';
            if (logoutForm) logoutForm.style.display = 'none';

            if (userInfo) userInfo.textContent = '';

            if (adminLink) adminLink.style.display = 'none';
        }

    } catch (err) {
        console.error('Error checking session info:', err);
    }
});

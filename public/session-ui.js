// This script runs on page load and checks /debug/session
// to see if a user is logged in. Then it hides/shows header links.

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/debug/session', {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            // If the debug route fails for some reason, just stop silently
            console.error('Failed to fetch session info');
            return;
        }

        const data = await response.json();
        const user = data.user || null;

        const loginLink = document.getElementById('login-link');
        const signupLink = document.getElementById('signup-link');
        const logoutForm = document.getElementById('logout-form');
        const userInfo = document.getElementById('user-info');

        if (user) {
            // Logged in: hide Login / Sign Up, show Logout, show user info
            if (loginLink) loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';
            if (logoutForm) logoutForm.style.display = 'inline';

            if (userInfo) {
                userInfo.textContent = `Logged in as ${user.email} (${user.role})`;
            }
        } else {
            // Not logged in: show Login / Sign Up, hide Logout, clear user info
            if (loginLink) loginLink.style.display = 'inline';
            if (signupLink) signupLink.style.display = 'inline';
            if (logoutForm) logoutForm.style.display = 'none';

            if (userInfo) {
                userInfo.textContent = '';
            }
        }
    } catch (err) {
        console.error('Error checking session info:', err);
        // Fail silently on the UI side
    }
});

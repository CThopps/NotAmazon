/**
 * NotAmazon Session UI Script
 * 
 * This script manages the visibility of header links based on the user's session state.
 * It checks if a user is logged in by querying the /debug/session endpoint
 * and updates the UI accordingly:
 * - If logged in: hides login/signup links, shows logout link and user info.
 * - If logged out: shows login/signup links, hides logout link and user info.
 * - Shows admin link only for users with the admin role.
 *  * Expected HTML elements:
 *  - login-link    : link to login page
 *  - signup-link   : link to signup page
 *  - logout-form   : form with logout button
 *  - user-info     : span/div to show logged-in user info
 *  - admin-link    : link to admin dashboard (shown only to admins)
 */


// This script runs on page load and checks /debug/session
// to see if a user is logged in. Then it hides/shows header links.

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch session info from the server
        const response = await fetch('/debug/session', {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        // Check if the response was successful
        if (!response.ok) {
            console.error('Failed to fetch session info');
            return;
        }

        // Parse the JSON data from the response
        const data = await response.json();
        // Extract user info
        const user = data.user || null;

        // Get references to UI elements
        const loginLink  = document.getElementById('login-link');
        const signupLink = document.getElementById('signup-link');
        const logoutForm = document.getElementById('logout-form');
        const userInfo   = document.getElementById('user-info');
        const adminLink  = document.getElementById('admin-link'); 

        // Update UI based on whether the user is logged in and their role
        if (user) {
            // Logged in → hide login/signup, show logout
            if (loginLink)  loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';
            if (logoutForm) logoutForm.style.display = 'inline';

            // Show user info
            if (userInfo) {
                userInfo.textContent = `Logged in as ${user.email} (${user.role})`;
            }

            // Show admin link only for admins
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

            // Clear user info
            if (userInfo) userInfo.textContent = '';

            // Hide admin link
            
            if (adminLink) adminLink.style.display = 'none';
        }

    } catch (err) {
        console.error('Error checking session info:', err);
    }
});

/**
 * Authentication System
 * Manages JWT tokens, user sessions, and protected route access
 */
const auth = {
    user: JSON.parse(localStorage.getItem('user')),
    isInitialized: false,

    /**
     * Initialize authentication
     * Checks if session cookie is valid and updates UI
     */
    initAuth: async function() {
        if (this.isInitialized) return;
        
        try {
            // Step 1: Handshake - Get Access Token using HTTP-only Refresh Cookie
            const refreshData = await endpoints.auth.refresh();
            if (refreshData && refreshData.success) {
                api.setAccessToken(refreshData.accessToken);
                
                // Step 2: Get Profile
                const data = await endpoints.auth.me();
                if (data && data.success) {
                    this.user = data.user;
                    localStorage.setItem('user', JSON.stringify(this.user));
                    this.updateUI();
                    this.isInitialized = true;
                    this.startSilentRefresh();
                    // Notify pages that auth is ready and data loading can begin
                    window.dispatchEvent(new Event('authReady'));
                }
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            if (!window.location.pathname.includes('login.html')) {
                this.logout();
            }
        }
    },

    /**
     * Periodic silent refresh to prevent expiry
     */
    startSilentRefresh: function() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        
        // Refresh every 12 minutes (for a 15 min token)
        this.refreshInterval = setInterval(async () => {
            try {
                const data = await endpoints.auth.refresh();
                if (data && data.success) {
                    api.setAccessToken(data.accessToken);
                    console.log('🔄 Session rotated successfully');
                }
            } catch (e) {
                console.error('Silent refresh failed');
            }
        }, 12 * 60 * 1000);
    },

    /**
     * Check if authenticated, redirect to login if not
     */
    requireAuth: function() {
        const isLoginPage = window.location.pathname.includes('login.html');
        
        // With cookies, we don't know if we're authed until initAuth finishes
        // But we can check if we have a cached user as a hint
        if (!this.user && !isLoginPage) {
            // Check if we are in a sub-page (inside /pages/) or at the root
            const isSubPage = window.location.pathname.includes('/pages/');
            const baseUrl = isSubPage ? '../' : './';
            window.location.href = `${baseUrl}login.html`;
            return false;
        }
        return true;
    },

    /**
     * Check if user has specific role
     */
    hasRole: function(...allowedRoles) {
        if (!this.user || !this.user.role) return false;
        return allowedRoles.some(role => role.toLowerCase() === this.user.role.toLowerCase());
    },

    /**
     * Logout and clear session
     */
    logout: async function() {
        try {
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            await endpoints.auth.logout();
        } catch (e) {
            console.warn('Logout failed on server:', e);
        }
        
        api.setAccessToken(null);
        this.user = null;
        
        const isSubPage = window.location.pathname.includes('/pages/');
        const baseUrl = isSubPage ? '../' : './';
        window.location.href = `${baseUrl}login.html`;
    },

    /**
     * Update UI elements with user info
     */
    updateUI: function() {
        if (!this.user) return;

        const userAvatar = document.getElementById('userAvatar') || document.getElementById('userAvatarInitial');
        const userName = document.getElementById('userName') || document.getElementById('userDisplayName');
        const userRole = document.getElementById('userRole') || document.getElementById('roleBadge');

        // Extract initials for avatar
        const initials = this.user.fullName 
            ? this.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            : this.user.username[0].toUpperCase();

        if (userAvatar) userAvatar.textContent = initials;
        if (userName) userName.textContent = this.user.fullName || this.user.username;
        if (userRole) {
            userRole.textContent = this.user.role.toUpperCase();
            userRole.className = `user-role-badge ${this.user.role}`;
        }

        // Sync with roleManager if present
        if (window.roleManager) {
            window.roleManager.syncWithAuth(this.user.role, this.user.employeeId || this.user.id);
        }
    }
};

// Auto-init on page load (only once)
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('login.html') && !auth.isInitialized) {
        auth.initAuth();
    }
});

// Expose globally
window.auth = auth;

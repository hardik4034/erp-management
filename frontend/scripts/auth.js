// Authentication Mock for No-Auth System
const auth = {
    token: 'mock-token',
    user: { 
        name: 'Admin', 
        role: 'Admin' 
    },

    initAuth: function() {
        console.log('Auth initialized (Mock)');
        this.updateUI();
    },

    requireAuth: function() {
        // No checks needed
        return true;
    },

    hasRole: function(...roles) {
        // Always allowed
        return true;
    },

    logout: function() {
        window.location.href = '../index.html';
    },

    updateUI: function() {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');

        if (userAvatar) userAvatar.textContent = 'A';
        if (userName) userName.textContent = 'Admin';
        if (userRole) userRole.textContent = 'Admin';
    }
};

// Expose globally
window.auth = auth;

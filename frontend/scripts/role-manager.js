/**
 * Role Manager - Secure RBAC Sync
 * This module syncs the UI with the authenticated user role from the session.
 * Manual role switching is deactivated for security.
 */

class RoleManager {
    constructor() {
        this.STORAGE_KEY = 'currentRole';
        this.DEFAULT_ROLE = 'employee';

        // Role definitions with permissions
        this.ROLES = {
            admin: {
                label: 'Admin',
                permissions: ['create', 'edit', 'delete', 'view'],
                color: '#e74c3c',
                description: 'Full access to all features'
            },
            hr: {
                label: 'HR',
                permissions: ['create', 'edit', 'view'],
                color: '#3498db',
                description: 'Can create, edit, and view (no delete)'
            },
            manager: {
                label: 'Manager',
                permissions: ['edit', 'view'],
                color: '#f39c12',
                description: 'Can edit and view only'
            },
            employee: {
                label: 'Employee',
                permissions: ['view'],
                color: '#95a5a6',
                description: 'View only access'
            }
        };

        // Initialize
        this.init();
    }

    init() {
        // Load current role from localStorage or set default
        const savedRole = localStorage.getItem(this.STORAGE_KEY);
        this.currentRole = (savedRole && this.ROLES[savedRole]) ? savedRole : this.DEFAULT_ROLE;

        console.log(`🔐 Role Manager initialized. Current role: ${this.getCurrentRoleLabel()}`);

        // Sync with auth data if available
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                this.syncWithAuth(user.role, user.employeeId || user.id);
            } catch (e) { }
        }
    }

    getCurrentRole() { return this.currentRole; }
    getCurrentRoleLabel() { return this.ROLES[this.currentRole]?.label || 'Unknown'; }
    getCurrentRoleColor() { return this.ROLES[this.currentRole]?.color || '#95a5a6'; }

    // Deactivated manual setRole for security
    setRole(role) {
        console.warn('⚠️ Manual role switching is deactivated in production.');
        return false;
    }

    saveRole() {
        localStorage.setItem(this.STORAGE_KEY, this.currentRole);
    }

    hasPermission(permission) {
        const roleData = this.ROLES[this.currentRole];
        return roleData?.permissions.includes(permission) || false;
    }

    isRole(role) { return this.currentRole === role; }

    applyRolePermissions() {
        // Reset visibility
        document.querySelectorAll('.create-btn, .add-btn, .new-btn, .edit-btn, .update-btn, .delete-btn, .remove-btn, .admin-only, .hr-only, .manager-only').forEach(el => {
            el.classList.remove('hidden');
        });

        if (!this.hasPermission('create')) this.hideElements(['.create-btn', '.add-btn', '.new-btn']);
        if (!this.hasPermission('edit')) this.hideElements(['.edit-btn', '.update-btn']);
        if (!this.hasPermission('delete')) this.hideElements(['.delete-btn', '.remove-btn']);

        if (!this.isRole('admin')) this.hideElements(['.admin-only']);
        if (!this.isRole('admin') && !this.isRole('hr')) this.hideElements(['.hr-only']);
        if (!this.isRole('admin') && !this.isRole('hr') && !this.isRole('manager')) this.hideElements(['.manager-only']);

        this.applySidebarPermissions();
        console.log(`🎨 UI permissions applied for: ${this.getCurrentRoleLabel()}`);
    }

    applySidebarPermissions() {
        document.querySelectorAll('.nav-item').forEach(el => el.style.display = '');

        if (!this.isRole('admin')) {
            const employeesLink = document.querySelector('a[href*="employees.html"]');
            if (employeesLink) employeesLink.closest('.nav-item').style.display = 'none';
        }

        if (!this.isRole('admin') && !this.isRole('hr')) {
            ['departments.html', 'designations.html', 'biometric-settings.html'].forEach(page => {
                const link = document.querySelector(`a[href*="${page}"]`);
                if (link) link.closest('.nav-item').style.display = 'none';
            });
        }

        if (this.isRole('manager') || this.isRole('employee')) {
            ['payroll.html', 'employee-salary.html'].forEach(page => {
                const link = document.querySelector(`a[href*="${page}"]`);
                if (link) link.closest('.nav-item').style.display = 'none';
            });
        }
        this.updateMyProfileLink();
    }

    updateMyProfileLink() {
        const profileLink = document.getElementById('myProfileLink');
        if (!profileLink) return;
        const employeeId = this.authenticatedEmployeeId;
        if (!employeeId) return; // Don't update until auth has synced
        const isSubPage = window.location.pathname.includes('/pages/');
        const baseUrl = isSubPage ? '' : './pages/';
        profileLink.href = `${baseUrl}profile.html?employeeId=${employeeId}`;
    }

    hideElements(selectors) {
        selectors.forEach(s => document.querySelectorAll(s).forEach(el => el.classList.add('hidden')));
    }

    triggerRoleChangeEvent() {
        const event = new CustomEvent('roleChanged', {
            detail: {
                role: this.currentRole,
                label: this.getCurrentRoleLabel(),
                permissions: this.ROLES[this.currentRole].permissions
            }
        });
        window.dispatchEvent(event);
    }

    syncWithAuth(role, employeeId) {
        if (!role) return;
        const newRole = role.toLowerCase();
        const hasChanged = this.currentRole !== newRole || this.authenticatedEmployeeId !== employeeId;

        this.currentRole = newRole;
        this.authenticatedEmployeeId = employeeId;
        localStorage.setItem(this.STORAGE_KEY, this.currentRole);

        this.applyRolePermissions();
        // Always fire roleChanged when called from auth so dependent modules (grid, leaves, etc.)
        // can reload with the confirmed employee ID — even if role/id appear unchanged.
        this.triggerRoleChangeEvent();
        this.updateHeaderUI();
    }

    updateHeaderUI() {
        const badge = document.getElementById('roleBadge');
        if (badge) {
            badge.textContent = this.getCurrentRoleLabel();
            badge.className = `role-badge ${this.currentRole}`;
        }
    }

    // Deactivated dropdown initialization
    initRoleDropdown() {
        console.log('🔒 Secure RBAC enabled: Manual role switching deactivated');
    }

    getDataScope() {
        if (this.isRole('admin') || this.isRole('hr')) return 'all';
        if (this.isRole('manager')) return 'team';
        return 'own';
    }

    getCurrentEmployeeId() {
        // Return null if not yet synced with auth — callers must handle null gracefully
        return this.authenticatedEmployeeId || null;
    }
}

window.roleManager = new RoleManager();
window.roleManager.applyRolePermissions();

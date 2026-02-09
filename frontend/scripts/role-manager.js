/**
 * Role Manager - Temporary Role-Based Access Control System
 * This module manages user roles and permissions without authentication.
 * Designed to be easily replaceable with real auth later.
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

        // Permission class mappings for UI elements
        this.PERMISSION_CLASSES = {
            'create': ['.create-btn', '.add-btn', '.new-btn'],
            'edit': ['.edit-btn', '.update-btn'],
            'delete': ['.delete-btn', '.remove-btn'],
            'admin-only': ['.admin-only'],
            'hr-only': ['.hr-only', '.admin-only'],
            'manager-only': ['.manager-only', '.hr-only', '.admin-only']
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize role manager
     */
    init() {
        // Load current role from localStorage or set default
        const savedRole = localStorage.getItem(this.STORAGE_KEY);
        if (savedRole && this.ROLES[savedRole]) {
            this.currentRole = savedRole;
        } else {
            this.currentRole = this.DEFAULT_ROLE;
            this.saveRole();
        }

        console.log(`🔐 Role Manager initialized. Current role: ${this.getCurrentRoleLabel()}`);
    }

    /**
     * Get current role
     */
    getCurrentRole() {
        return this.currentRole;
    }

    /**
     * Get current role label
     */
    getCurrentRoleLabel() {
        return this.ROLES[this.currentRole]?.label || 'Unknown';
    }

    /**
     * Get current role color
     */
    getCurrentRoleColor() {
        return this.ROLES[this.currentRole]?.color || '#95a5a6';
    }

    /**
     * Set new role
     */
    setRole(role) {
        if (!this.ROLES[role]) {
            console.error(`Invalid role: ${role}`);
            return false;
        }

        this.currentRole = role;
        this.saveRole();
        this.applyRolePermissions();
        this.triggerRoleChangeEvent();
        
        console.log(`✅ Role changed to: ${this.getCurrentRoleLabel()}`);
        
        // Show toast notification if available
        if (window.toast) {
            window.toast.show(`Role changed to ${this.getCurrentRoleLabel()}`, 'info');
        }

        return true;
    }

    /**
     * Save role to localStorage
     */
    saveRole() {
        localStorage.setItem(this.STORAGE_KEY, this.currentRole);
    }

    /**
     * Check if current role has a specific permission
     */
    hasPermission(permission) {
        const roleData = this.ROLES[this.currentRole];
        return roleData?.permissions.includes(permission) || false;
    }

    /**
     * Check if current role is a specific role
     */
    isRole(role) {
        return this.currentRole === role;
    }

    /**
     * Get all available roles
     */
    getAllRoles() {
        return Object.keys(this.ROLES).map(key => ({
            value: key,
            label: this.ROLES[key].label,
            color: this.ROLES[key].color,
            description: this.ROLES[key].description
        }));
    }

    /**
     * Apply role-based permissions to UI elements
     * This function shows/hides elements based on current role permissions
     */
    applyRolePermissions() {
        // First, show all elements (reset)
        document.querySelectorAll('.create-btn, .add-btn, .new-btn, .edit-btn, .update-btn, .delete-btn, .remove-btn, .admin-only, .hr-only, .manager-only').forEach(el => {
            el.classList.remove('hidden');
        });

        // Hide create buttons if no create permission
        if (!this.hasPermission('create')) {
            this.hideElements(['.create-btn', '.add-btn', '.new-btn']);
        }

        // Hide edit buttons if no edit permission
        if (!this.hasPermission('edit')) {
            this.hideElements(['.edit-btn', '.update-btn']);
        }

        // Hide delete buttons if no delete permission
        if (!this.hasPermission('delete')) {
            this.hideElements(['.delete-btn', '.remove-btn']);
        }

        // Handle role-specific elements
        if (!this.isRole('admin')) {
            this.hideElements(['.admin-only']);
        }

        if (!this.isRole('admin') && !this.isRole('hr')) {
            this.hideElements(['.hr-only']);
        }

        if (!this.isRole('admin') && !this.isRole('hr') && !this.isRole('manager')) {
            this.hideElements(['.manager-only']);
        }

        // Apply sidebar navigation permissions
        this.applySidebarPermissions();

        console.log(`🎨 UI permissions applied for role: ${this.getCurrentRoleLabel()}`);
    }

    /**
     * Apply permissions to sidebar navigation
     * Hide certain pages based on role
     */
    applySidebarPermissions() {
        // Show all nav items first (reset)
        document.querySelectorAll('.nav-item').forEach(el => {
            el.style.display = '';
        });

        // Employees page - Hide for Employee role
        if (this.isRole('employee')) {
            const employeesLink = document.querySelector('a[href*="employees.html"]');
            if (employeesLink) {
                employeesLink.closest('.nav-item').style.display = 'none';
            }
        }

        // Departments and Designations - Admin only
        if (!this.isRole('admin')) {
            const departmentsLink = document.querySelector('a[href*="departments.html"]');
            const designationsLink = document.querySelector('a[href*="designations.html"]');
            
            if (departmentsLink) {
                departmentsLink.closest('.nav-item').style.display = 'none';
            }
            if (designationsLink) {
                designationsLink.closest('.nav-item').style.display = 'none';
            }
        }

        // Payroll and Employee Salary - Hide for Manager and Employee roles
        if (this.isRole('manager') || this.isRole('employee')) {
            const payrollLink = document.querySelector('a[href*="payroll.html"]');
            const employeeSalaryLink = document.querySelector('a[href*="employee-salary.html"]');
            
            if (payrollLink) {
                payrollLink.closest('.nav-item').style.display = 'none';
            }
            if (employeeSalaryLink) {
                employeeSalaryLink.closest('.nav-item').style.display = 'none';
            }
        }

        // Appreciations - Visible to all (Page handles permissions)
        // if (!this.isRole('admin') && !this.isRole('hr')) {
        //     const appreciationsLink = document.querySelector('a[href*="appreciations.html"]');
        //     if (appreciationsLink) {
        //         appreciationsLink.closest('.nav-item').style.display = 'none';
        //     }
        // }
    }

    /**
     * Hide elements by selectors
     */
    hideElements(selectors) {
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add('hidden');
            });
        });
    }

    /**
     * Show elements by selectors
     */
    showElements(selectors) {
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.remove('hidden');
            });
        });
    }

    /**
     * Trigger role change event
     */
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

    /**
     * Initialize role dropdown in header
     */
    initRoleDropdown() {
        const dropdown = document.getElementById('roleDropdown');
        const badge = document.getElementById('roleBadge');

        if (!dropdown) {
            // Silently skip if dropdown not present (some pages may not have it)
            return;
        }

        // Set current value
        dropdown.value = this.currentRole;

        // Update badge
        if (badge) {
            this.updateRoleBadge(badge);
        }

        // Listen for changes
        dropdown.addEventListener('change', (e) => {
            this.setRole(e.target.value);
            if (badge) {
                this.updateRoleBadge(badge);
            }
        });

        console.log('✅ Role dropdown initialized');
    }

    /**
     * Update role badge
     */
    updateRoleBadge(badge) {
        badge.textContent = this.getCurrentRoleLabel();
        badge.className = `role-badge ${this.currentRole}`;
        badge.style.backgroundColor = this.getCurrentRoleColor();
    }

    /**
     * Get data scope for current role
     * Returns: 'all', 'team', or 'own'
     */
    getDataScope() {
        if (this.isRole('admin') || this.isRole('hr')) {
            return 'all'; // Can see all data
        } else if (this.isRole('manager')) {
            return 'team'; // Can see team data
        } else {
            return 'own'; // Can only see own data
        }
    }

    /**
     * Check if current role can see all data
     */
    canSeeAllData() {
        return this.getDataScope() === 'all';
    }

    /**
     * Check if current role can only see own data
     */
    canSeeOnlyOwnData() {
        return this.getDataScope() === 'own';
    }

    /**
     * Get simulated employee ID for current role
     * In real implementation, this would come from authentication
     * For now, we'll use a hardcoded ID based on role
     */
    getCurrentEmployeeId() {
        // Temporary simulation - replace with real auth later
        // BASED ON REAL DATA: 
        // ID 1 (Hardik) is the manager (Top level)
        // ID 2 (Test Demo) reports to ID 1
        const simulatedIds = {
            'employee': 2,  // ID 2 is the subordinate
            'manager': 1,   // ID 1 is the manager (has subordinates)
            'hr': null,     // HR sees all data
            'admin': null   // Admin sees all data
        };
        return simulatedIds[this.currentRole];
    }
}

// Create global instance
window.roleManager = new RoleManager();

// Auto-initialize dropdown when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.roleManager.initRoleDropdown();
        window.roleManager.applyRolePermissions();
    });
} else {
    // DOM already loaded
    window.roleManager.initRoleDropdown();
    window.roleManager.applyRolePermissions();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoleManager;
}

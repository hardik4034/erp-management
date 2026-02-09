/**
 * Role Validator Middleware
 * Temporary role-based permission validation for API endpoints
 * This reads the x-role header and validates permissions
 * 
 * WARNING: This is NOT secure for production use!
 * This is only for development/testing without authentication.
 * Replace with real JWT/session-based auth later.
 */

// Role permission definitions (must match frontend)
const ROLE_PERMISSIONS = {
    admin: {
        permissions: ['create', 'edit', 'delete', 'view']
    },
    hr: {
        permissions: ['create', 'edit', 'view']
    },
    manager: {
        permissions: ['edit', 'view']
    },
    employee: {
        permissions: ['view']
    }
};

/**
 * Middleware to validate role permissions
 * @param {string} requiredPermission - The permission required for this endpoint
 */
const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        // Read role from header (temporary, insecure method)
        const role = req.headers['x-role'] || 'employee';
        
        // Validate role exists
        if (!ROLE_PERMISSIONS[role]) {
            console.warn(`⚠️  Invalid role received: ${role}`);
            return res.status(403).json({
                success: false,
                error: 'Invalid role'
            });
        }

        // Get role permissions
        const roleData = ROLE_PERMISSIONS[role];
        const hasPermission = roleData.permissions.includes(requiredPermission);

        // Log the permission check
        console.log(`🔐 Permission Check: ${req.method} ${req.path} | Role: ${role} | Required: ${requiredPermission} | Granted: ${hasPermission}`);

        // Check if role has required permission
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: `Forbidden: ${role} role does not have '${requiredPermission}' permission`
            });
        }

        // Permission granted, continue
        next();
    };
};

/**
 * Middleware to log role information (optional)
 */
const logRole = (req, res, next) => {
    const role = req.headers['x-role'] || 'employee';
    console.log(`👤 Request from role: ${role} | ${req.method} ${req.path}`);
    next();
};

/**
 * Helper to check if role has specific permission
 */
const hasPermission = (role, permission) => {
    if (!ROLE_PERMISSIONS[role]) return false;
    return ROLE_PERMISSIONS[role].permissions.includes(permission);
};

/**
 * Helper to get all permissions for a role
 */
const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role]?.permissions || [];
};

module.exports = {
    requirePermission,
    logRole,
    hasPermission,
    getRolePermissions,
    ROLE_PERMISSIONS
};

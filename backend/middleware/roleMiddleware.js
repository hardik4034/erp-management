/**
 * Role-Based Access Control Middleware
 * Extracts user role and employee ID from request headers
 * Provides helper methods for role-based authorization
 */

/**
 * Extract role and employee ID from request headers
 * In production, this would extract from JWT token
 * For now, using headers sent from frontend role-manager
 */
const extractUserContext = (req, res, next) => {
    try {
        // Extract from headers (temporary simulation)
        const userRole = req.headers['x-user-role'] || 'employee';
        const employeeId = req.headers['x-employee-id'] ? parseInt(req.headers['x-employee-id']) : null;

        // Attach user context to request
        req.user = {
            role: userRole.toLowerCase(),
            employeeId: employeeId,

            // Helper methods
            isEmployee: function() {
                return this.role === 'employee';
            },

            isManager: function() {
                return this.role === 'manager';
            },

            isHR: function() {
                return this.role === 'hr';
            },

            isAdmin: function() {
                return this.role === 'admin';
            },

            canManageLeaves: function() {
                return this.isAdmin() || this.isHR() || this.isManager();
            },

            canApproveLeaves: function() {
                return this.isAdmin() || this.isHR() || this.isManager();
            },

            canDeleteLeaves: function() {
                return this.isAdmin() || this.isHR();
            },

            canSeeAllData: function() {
                return this.isAdmin() || this.isHR();
            },

            getDataScope: function() {
                if (this.isAdmin() || this.isHR()) {
                    return 'all'; // Can see all data
                } else if (this.isManager()) {
                    return 'team'; // Can see team data
                } else {
                    return 'own'; // Can only see own data
                }
            }
        };

        console.log(`🔐 User Context: Role=${req.user.role}, EmployeeId=${req.user.employeeId}, Scope=${req.user.getDataScope()}`);
        next();
    } catch (error) {
        console.error('Error in role middleware:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error in authentication' 
        });
    }
};

/**
 * Require specific roles for route access
 * Usage: requireRole('admin', 'hr')
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const userRole = req.user.role;
        const hasPermission = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!hasPermission) {
            console.warn(`⚠️ Access denied: User role '${userRole}' not in allowed roles [${allowedRoles.join(', ')}]`);
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have permission to perform this action',
                requiredRoles: allowedRoles
            });
        }

        next();
    };
};

/**
 * Validate employee ID ownership for Employee role
 * Ensures employees can only access their own data
 */
const validateOwnership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    // Only enforce for Employee role
    if (req.user.isEmployee()) {
        const requestedEmployeeId = parseInt(req.params.employeeId || req.body.employeeId || req.query.employeeId);
        
        if (requestedEmployeeId && requestedEmployeeId !== req.user.employeeId) {
            console.warn(`⚠️ Ownership violation: Employee ${req.user.employeeId} tried to access employee ${requestedEmployeeId}`);
            return res.status(403).json({ 
                success: false, 
                message: 'You can only access your own data' 
            });
        }
    }

    next();
};

module.exports = {
    extractUserContext,
    requireRole,
    validateOwnership
};

/**
 * Authorize specific roles
 * Usage: authorizeRoles('admin', 'hr')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userRole = req.user.role;
        const hasPermission = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!hasPermission) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. You do not have permission to perform this action.' 
            });
        }

        next();
    };
};

/**
 * Validate ownership for employee-specific data
 * Ensures employees can only access their own records
 */
const validateOwnership = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

    // Admin and HR can bypass ownership checks for most routes
    if (req.user.role === 'admin' || req.user.role === 'hr') {
        return next();
    }

    // Managers can access their own data or data linked to them (usually handled in the service/query layer)
    // Here we strictly enforce that Employees can only touch their own ID
    if (req.user.role === 'employee') {
        const requestedEmployeeId = parseInt(req.params.employeeId || req.body.employeeId || req.query.employeeId || req.params.id);
        
        if (requestedEmployeeId && requestedEmployeeId !== req.user.employeeId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. You can only access your own data.' 
            });
        }
    }

    next();
};

/**
 * Enforce Password Change
 */
const enforcePasswordChange = (req, res, next) => {
    if (req.path.includes('/change-password') || req.path.includes('/logout')) {
        return next();
    }

    if (req.user && req.user.mustChangePassword) {
        return res.status(403).json({ 
            success: false, 
            message: 'Password change required',
            code: 'PASSWORD_CHANGE_REQUIRED'
        });
    }

    next();
};

module.exports = {
    authorizeRoles,
    validateOwnership,
    enforcePasswordChange,
    // Aliases for compatibility
    authorize: authorizeRoles,
    requireRole: authorizeRoles,
    extractUserContext: (req, res, next) => next()
};

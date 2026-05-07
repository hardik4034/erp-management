const authService = require('../services/authService');
const userService = require('../services/userService');
const logger      = require('../utils/logger');

// In-memory user cache to avoid DB hit on every request
// TTL: 5 minutes. Keyed by user ID.
const _userCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000;

const getCachedUser = async (id) => {
    const cached = _userCache.get(id);
    if (cached && (Date.now() - cached.ts) < USER_CACHE_TTL_MS) {
        return cached.user;
    }
    const user = await userService.getUserById(id);
    if (user) {
        _userCache.set(id, { user, ts: Date.now() });
    }
    return user;
};

// Expose cache invalidation so services can call it on user updates
const invalidateUserCache = (id) => _userCache.delete(id);

/**
 * Middleware to verify JWT from HTTP-only cookies
 */
const userAuthMiddleware = async (req, res, next) => {
    // 1. Extract access token from Authorization header or cookies
    let accessToken = req.cookies.accessToken;
    
    // Check Authorization header (Bearer token) - Priority for new hybrid flow
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.split(' ')[1];
    }

    if (!accessToken) {
        // Check if it's a login or public route
        const publicPaths = ['/auth/login', '/auth/refresh-token', '/auth/logout', '/health'];
        if (publicPaths.includes(req.path)) {
            return next();
        }
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        // 2. Verify Access Token
        const decoded = authService.verifyAccessToken(accessToken);
        
        if (!decoded) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired access token', 
                code: 'TOKEN_EXPIRED' 
            });
        }

        // 3. Attach user context to request
        // In a strict RBAC system, we might want to fetch the user from DB to ensure they are still active
        const user = await getCachedUser(decoded.id);

        if (!user || user.status !== 'Active') {
            return res.status(401).json({ success: false, message: 'Account suspended or not found' });
        }

        req.user = {
            id: user.id,
            employeeId: user.employee_id || user.id,
            username: user.username,
            // fullName is pre-populated here so auditMiddleware can use it
            // directly without an extra DB round-trip on every mutating request
            fullName: user.full_name || user.username,
            role: user.role_name.toLowerCase(),
            mustChangePassword: !!user.must_change_password,
            // Compatibility helpers
            isEmployee: () => user.role_name.toLowerCase() === 'employee',
            isManager: () => user.role_name.toLowerCase() === 'manager',
            isHR: () => user.role_name.toLowerCase() === 'hr',
            isAdmin: () => user.role_name.toLowerCase() === 'admin',
            // Permission helpers
            canApproveLeaves: () => ['admin', 'hr', 'manager'].includes(user.role_name.toLowerCase()),
            canManageLeaves: () => ['admin', 'hr'].includes(user.role_name.toLowerCase())
        };

        next();
    } catch (error) {
        logger.error('Auth Middleware Error', { error: error.message });
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};

module.exports = userAuthMiddleware;
module.exports.invalidateUserCache = invalidateUserCache;

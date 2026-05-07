require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// SECURITY NOTICE: Never use default secrets in production.
// Set JWT_SECRET and JWT_REFRESH_SECRET in environment variables.
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        console.error('❌ FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in production!');
        process.exit(1);
    }
}

module.exports = {
    jwt: {
        // Never fall back to defaults in production (guarded above)
        accessSecret:   process.env.JWT_SECRET          || 'dev-access-secret-change-me',
        refreshSecret:  process.env.JWT_REFRESH_SECRET  || 'dev-refresh-secret-change-me',
        // Access token: short-lived (15 min). Refresh token handles session continuity.
        // Silent refresh in auth.js rotates every 12 min keeping users logged in.
        accessExpiration:  '15m',  // FIX: was '3600m' (2.5 days!) — now properly short-lived
        refreshExpiration: '7d',   // Long-lived, stored in HTTP-only cookie, rotated on use
    },
    cookies: {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',                              // CSRF protection
        maxAgeAccess:   15 * 60 * 1000,                 //  15 minutes
        maxAgeRefresh:   7 * 24 * 60 * 60 * 1000,       //   7 days
    },
    bcryptRounds: 12, // OWASP minimum recommendation for 2026+
    lockout: {
        maxAttempts: 5,
        duration:    15 * 60 * 1000, // 15 minutes
    }
};

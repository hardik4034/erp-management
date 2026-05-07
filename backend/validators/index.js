/**
 * validators/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified validation module — single source of truth for all express-validator
 * chains used across the application.
 *
 * PREVIOUSLY: Two separate files existed:
 *   - middleware/validation.js         (entity validators)
 *   - validators/authValidator.js      (auth / user validators)
 * NOW: Both are consolidated here. Both legacy paths still re-export from here
 *      for backward compatibility (no route changes required).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const { body, param, validationResult } = require('express-validator');

// ─── Strong password policy (OWASP compliant) ───────────────────────────────
// Min 8 chars | Upper | Lower | Number | Special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PASSWORD_MSG   = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

// ─── Reusable validation result handler ─────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════
const authValidator = {
    /** POST /api/auth/login */
    login: [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    /** POST /api/auth/change-password */
    changePassword: [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').matches(PASSWORD_REGEX).withMessage(PASSWORD_MSG)
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin routes)
// ═══════════════════════════════════════════════════════════════════════════
const userValidator = {
    /** POST /api/users */
    create: [
        body('username')
            .trim()
            .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
        body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
        body('fullName').trim().notEmpty().withMessage('Full name is required'),
        body('roleId').isInt().withMessage('Valid Role ID is required'),
        body('password').matches(PASSWORD_REGEX).withMessage(PASSWORD_MSG)
    ],
    /** PUT /api/users/:id/reset-password */
    resetPassword: [
        body('password').matches(PASSWORD_REGEX).withMessage(PASSWORD_MSG)
    ],
    /** PUT /api/users/:id
     * NOTE: status is REQUIRED (not optional) — enforces strict enum so DB
     *       can never receive an invalid value.
     */
    update: [
        body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
        body('fullName').trim().notEmpty().withMessage('Full name is required'),
        body('roleId').isInt().withMessage('Valid Role ID is required'),
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive')
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE
// ═══════════════════════════════════════════════════════════════════════════
const employeeValidation = {
    create: [
        body('firstName').trim().notEmpty().withMessage('First name is required'),
        body('lastName').trim().notEmpty().withMessage('Last name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
        body('dateOfJoining').isDate().withMessage('Valid date of joining required'),
        body('departmentId').isInt().withMessage('Department ID must be an integer'),
        body('designationId').isInt().withMessage('Designation ID must be an integer'),
        handleValidationErrors
    ],
    update: [
        param('id').isInt().withMessage('Invalid employee ID'),
        body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
        body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
        body('email').optional().isEmail().withMessage('Valid email is required'),
        body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
        handleValidationErrors
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════
const attendanceValidation = {
    create: [
        body('employeeId').isInt().withMessage('Employee ID must be an integer'),
        body('attendanceDate').isDate().withMessage('Valid date required'),
        body('status')
            .isIn(['Present', 'Absent', 'Half Day', 'Late', 'On Leave'])
            .withMessage('Invalid status. Must be one of: Present, Absent, Half Day, Late, On Leave'),
        body('checkInTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
        body('checkOutTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
        handleValidationErrors
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// LEAVE
// ═══════════════════════════════════════════════════════════════════════════
const leaveValidation = {
    create: [
        body('leaveTypeId').isInt().withMessage('Leave type ID must be an integer'),
        body('fromDate').isDate().withMessage('Valid from date required'),
        body('toDate').isDate().withMessage('Valid to date required'),
        body('reason').trim().notEmpty().withMessage('Reason is required'),
        // NOTE: employeeId is OPTIONAL in body — server enforces from req.user for employees
        body('employeeId').optional().isInt().withMessage('Employee ID must be an integer'),
        handleValidationErrors
    ],
    updateStatus: [
        param('id').isInt().withMessage('Invalid leave ID'),
        body('status').isIn(['Approved', 'Rejected']).withMessage('Status must be Approved or Rejected'),
        body('rejectionReason').optional().trim(),
        handleValidationErrors
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// HOLIDAY
// ═══════════════════════════════════════════════════════════════════════════
const holidayValidation = {
    create: [
        body('holidayName').trim().notEmpty().withMessage('Holiday name is required'),
        body('holidayDate').isDate().withMessage('Valid date required'),
        body('description').optional().trim(),
        handleValidationErrors
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// DEPARTMENT
// ═══════════════════════════════════════════════════════════════════════════
const departmentValidation = {
    create: [
        body('departmentName').trim().notEmpty().withMessage('Department name is required'),
        body('description').optional().trim(),
        handleValidationErrors
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// DESIGNATION
// ═══════════════════════════════════════════════════════════════════════════
const designationValidation = {
    create: [
        body('designationName').trim().notEmpty().withMessage('Designation name is required'),
        body('departmentId').isInt().withMessage('Department ID must be an integer'),
        body('description').optional().trim(),
        handleValidationErrors
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// APPRECIATION
// ═══════════════════════════════════════════════════════════════════════════
const appreciationValidation = {
    create: [
        body('employeeId').isInt().withMessage('Employee ID must be an integer'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').optional().trim(),
        body('appreciationDate').isDate().withMessage('Valid date required'),
        handleValidationErrors
    ]
};

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
    // Auth
    authValidator,
    userValidator,
    // Entities
    employeeValidation,
    attendanceValidation,
    leaveValidation,
    holidayValidation,
    departmentValidation,
    designationValidation,
    appreciationValidation,
    // Utility
    handleValidationErrors,
    PASSWORD_REGEX
};

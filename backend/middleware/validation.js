const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Employee validation rules
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

// Attendance validation rules
const attendanceValidation = {
    create: [
        body('employeeId').isInt().withMessage('Employee ID must be an integer'),
        body('attendanceDate').isDate().withMessage('Valid date required'),
        body('status').isIn(['Present', 'Absent', 'Half Day', 'Late', 'On Leave']).withMessage('Invalid status'),
        body('checkInTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
        body('checkOutTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
        handleValidationErrors
    ]
};

// Leave validation rules
const leaveValidation = {
    create: [
        body('employeeId').isInt().withMessage('Employee ID must be an integer'),
        body('leaveTypeId').isInt().withMessage('Leave type ID must be an integer'),
        body('fromDate').isDate().withMessage('Valid from date required'),
        body('toDate').isDate().withMessage('Valid to date required'),
        body('reason').trim().notEmpty().withMessage('Reason is required'),
        handleValidationErrors
    ],
    updateStatus: [
        param('id').isInt().withMessage('Invalid leave ID'),
        body('status').isIn(['Approved', 'Rejected']).withMessage('Status must be Approved or Rejected'),
        body('rejectionReason').optional().trim(),
        handleValidationErrors
    ]
};

// Holiday validation rules
const holidayValidation = {
    create: [
        body('holidayName').trim().notEmpty().withMessage('Holiday name is required'),
        body('holidayDate').isDate().withMessage('Valid date required'),
        body('description').optional().trim(),
        handleValidationErrors
    ]
};

// Department validation rules
const departmentValidation = {
    create: [
        body('departmentName').trim().notEmpty().withMessage('Department name is required'),
        body('description').optional().trim(),
        handleValidationErrors
    ]
};

// Designation validation rules
const designationValidation = {
    create: [
        body('designationName').trim().notEmpty().withMessage('Designation name is required'),
        body('departmentId').isInt().withMessage('Department ID must be an integer'),
        body('description').optional().trim(),
        handleValidationErrors
    ]
};

// Appreciation validation rules
const appreciationValidation = {
    create: [
        body('employeeId').isInt().withMessage('Employee ID must be an integer'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').optional().trim(),
        body('appreciationDate').isDate().withMessage('Valid date required'),
        handleValidationErrors
    ]
};

// Auth validation rules
const authValidation = {
    register: [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('roleId').isInt().withMessage('Role ID must be an integer'),
        handleValidationErrors
    ],
    login: [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
        handleValidationErrors
    ]
};

module.exports = {
    employeeValidation,
    attendanceValidation,
    leaveValidation,
    holidayValidation,
    departmentValidation,
    designationValidation,
    appreciationValidation,
    authValidation,
    handleValidationErrors
};

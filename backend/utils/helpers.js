/**
 * Generate employee code in format EMP{YEAR}{SEQUENCE}
 * Example: EMP2026001
 */
const generateEmployeeCode = (year, sequence) => {
    const paddedSequence = String(sequence).padStart(3, '0');
    return `EMP${year}${paddedSequence}`;
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format time to HH:MM
 */
const formatTime = (time) => {
    if (!time) return null;
    if (typeof time === 'string') return time;
    const d = new Date(time);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Calculate number of days between two dates
 */
const calculateDays = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

/**
 * Check if date is in the past
 */
const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
};

/**
 * Get current year
 */
const getCurrentYear = () => {
    return new Date().getFullYear();
};

/**
 * Create success response
 */
const successResponse = (data, message = 'Success') => {
    return {
        success: true,
        message,
        data
    };
};

/**
 * Create error response
 */
const errorResponse = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

module.exports = {
    generateEmployeeCode,
    formatDate,
    formatTime,
    calculateDays,
    isPastDate,
    getCurrentYear,
    successResponse,
    errorResponse
};

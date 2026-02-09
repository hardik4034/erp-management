const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Database errors
    if (err.name === 'RequestError') {
        statusCode = 500;
        // Include more details about the SQL error
        let dbMessage = err.message;
        if (err.number) {
            dbMessage = `SQL Error ${err.number}: ${err.message}`;
        }
        if (err.procName) {
            dbMessage += ` (Procedure: ${err.procName})`;
        }
        message = 'Database error: ' + dbMessage;
    }


    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;

const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all attendance
const getAllAttendance = async (req, res, next) => {
    try {
        const { employeeId, fromDate, toDate } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId || null)
            .input('FromDate', sql.Date, fromDate || null)
            .input('ToDate', sql.Date, toDate || null)
            .execute('sp_GetAllAttendance');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get attendance by ID
const getAttendanceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_GetAllAttendance');

        if (result.recordset.length === 0) {
            throw errorResponse('Attendance record not found', 404);
        }

        res.json(successResponse(result.recordset[0]));
    } catch (error) {
        next(error);
    }
};

// Create attendance
const createAttendance = async (req, res, next) => {
    try {
        const { 
            employeeId, attendanceDate, status, checkInTime, checkOutTime, remarks,
            checkInLocation, checkOutLocation, workingFrom, workingFromOut, overwrite
        } = req.body;

        // Validate status - Single Source of Truth
        const VALID_STATUSES = ['Present', 'Late', 'Half Day', 'Absent', 'On Leave'];
        
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            });
        }

        // Validate CheckOutTime requirements
        if ((status === 'Present' || status === 'Late') && !checkOutTime) {
            return res.status(400).json({
                success: false,
                error: 'Check Out time is required for Present/Late status'
            });
        }

        // Map frontend status to database status (remove spaces)
        const STATUS_DB_MAP = {
            "Half Day": "Half Day",  // Keep as is - DB already has space
            "On Leave": "On Leave",  // Keep as is - DB already has space
            "Present": "Present",
            "Late": "Late",
            "Absent": "Absent"
        };

        const dbStatus = STATUS_DB_MAP[status];

        if (!dbStatus) {
            return res.status(400).json({
                success: false,
                error: `Invalid status value: ${status}`
            });
        }

        // CRITICAL FIX: Use VarChar instead of Time type
        // The mssql driver's sql.Time type has strict validation that rejects our format
        // Let SQL Server handle the string-to-TIME conversion in the stored procedure
        const normalizeTime = (t) => {
            if (!t) return null;
            const timeStr = String(t).trim();
            
            // Validate time format (HH:mm or HH:mm:ss)
            if (!/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
                console.error('Invalid time format:', timeStr);
                throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm or HH:mm:ss`);
            }
            
            // Return HH:mm format (strip seconds if present)
            return timeStr.substring(0, 5);
        };

        const normalizedCheckIn = normalizeTime(checkInTime);
        const normalizedCheckOut = normalizeTime(checkOutTime);

        console.log('✅ FIXED VERSION - Using VarChar for time parameters');
        console.log('Input CheckIn:', checkInTime, '→ Normalized:', normalizedCheckIn);
        console.log('Input CheckOut:', checkOutTime, '→ Normalized:', normalizedCheckOut);
        console.log('Attendance Date:', attendanceDate);

        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('AttendanceDate', sql.Date, attendanceDate)
            .input('Status', sql.NVarChar(20), dbStatus)
            .input('CheckInTime', sql.VarChar(5), normalizedCheckIn)  // Use VarChar instead of Time
            .input('CheckOutTime', sql.VarChar(5), normalizedCheckOut) // Use VarChar instead of Time
            .input('Remarks', sql.NVarChar(500), remarks || null)
            .input('CheckInLocation', sql.NVarChar(100), checkInLocation || null)
            .input('CheckOutLocation', sql.NVarChar(100), checkOutLocation || null)
            .input('WorkingFrom', sql.NVarChar(50), workingFrom || null)
            .input('WorkingFromOut', sql.NVarChar(50), workingFromOut || null)
            .input('Overwrite', sql.Bit, overwrite ? 1 : 0)
            .execute('sp_CreateAttendance');

        res.status(201).json(successResponse(result.recordset[0], 'Attendance marked successfully'));

    } catch (error) {
        console.error("SQL ERROR:", error);

        // Handle specific business logic error from SP (50001)
        if (error.number === 50001) {
            return res.status(409).json({
                success: false,
                error: 'Attendance record already exists for this employee and date. Please check "Attendance Overwrite" to update it.'
            });
        }

        // Return detailed error for debugging
        return res.status(400).json({
            success: false,
            error: error.message || "Database validation failed"
        });
    }
};

// Update attendance
const updateAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, checkInTime, checkOutTime, remarks, checkInLocation, checkOutLocation, workingFrom, workingFromOut, attendanceDate } = req.body;
        const pool = await getConnection();

        // Use VarChar for time parameters (same as createAttendance)
        const normalizeTime = (t) => {
            if (!t) return null;
            const timeStr = String(t).trim();
            // Return HH:mm format (strip seconds if present)
            return timeStr.substring(0, 5);
        };

        await pool.request()
            .input('AttendanceId', sql.Int, id)
            .input('Status', sql.NVarChar(20), status)
            .input('CheckInTime', sql.VarChar(5), normalizeTime(checkInTime))  // Use VarChar
            .input('CheckOutTime', sql.VarChar(5), normalizeTime(checkOutTime)) // Use VarChar
            .input('Remarks', sql.NVarChar(500), remarks || null)
            .input('CheckInLocation', sql.NVarChar(100), checkInLocation || null)
            .input('CheckOutLocation', sql.NVarChar(100), checkOutLocation || null)
            .input('WorkingFrom', sql.NVarChar(50), workingFrom || null)
            .input('WorkingFromOut', sql.NVarChar(50), workingFromOut || null)
            .execute('sp_UpdateAttendance');

        res.json(successResponse(null, 'Attendance updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Delete attendance
const deleteAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('AttendanceId', sql.Int, id)
            .execute('sp_DeleteAttendance');

        res.json(successResponse(null, 'Attendance deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Get monthly attendance report
const getMonthlyReport = async (req, res, next) => {
    try {
        const { month, year, employeeId } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('Month', sql.Int, month)
            .input('Year', sql.Int, year)
            .input('EmployeeId', sql.Int, employeeId || null)
            .execute('sp_GetMonthlyAttendanceReport');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAttendance,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    getMonthlyReport
};

// Get attendance grid for calendar view
const getAttendanceGrid = async (req, res, next) => {
    try {
        const { fromDate, toDate, employeeIds } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('FromDate', sql.Date, fromDate)
            .input('ToDate', sql.Date, toDate)
            .input('EmployeeIds', sql.NVarChar(sql.MAX), employeeIds || null)
            .execute('sp_GetAttendanceGrid');

        // Result contains 3 recordsets: employees, attendance, holidays
        const employees = result.recordsets[0] || [];
        const attendance = result.recordsets[1] || [];
        const holidays = result.recordsets[2] || [];

        // Transform attendance into a map for easier frontend consumption
        const attendanceMap = {};
        attendance.forEach(record => {
            const key = `${record.EmployeeId}_${record.AttendanceDate.toISOString().split('T')[0]}`;
            attendanceMap[key] = {
                attendanceId: record.AttendanceId, // Include ID for editing
                status: record.Status, // Single source of truth
                checkInTime: record.CheckInTime,
                checkOutTime: record.CheckOutTime,
                remarks: record.Remarks,
                notes: record.Notes,
                checkInLocation: record.CheckInLocation,
                checkOutLocation: record.CheckOutLocation,
                workingFrom: record.WorkingFrom,
                workingFromOut: record.WorkingFromOut
            };
        });

        res.json(successResponse({
            employees,
            attendanceMap,
            holidays
        }));
    } catch (error) {
        next(error);
    }
};

// Bulk import attendance
const bulkImportAttendance = async (req, res, next) => {
    try {
        const { attendanceData } = req.body;
        
        if (!attendanceData || !Array.isArray(attendanceData)) {
            throw errorResponse('Invalid attendance data format', 400);
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('AttendanceData', sql.NVarChar(sql.MAX), JSON.stringify(attendanceData))
            .execute('sp_BulkCreateAttendance');

        const summary = result.recordset[0];
        
        if (summary.ErrorCount > 0) {
            throw errorResponse(summary.ErrorMessages, 400);
        }

        res.json(successResponse(summary, `Successfully imported ${summary.InsertedCount} attendance records`));
    } catch (error) {
        next(error);
    }
};

// Export attendance as CSV
const exportAttendance = async (req, res, next) => {
    try {
        const { fromDate, toDate, employeeId } = req.query;
        
        if (!fromDate || !toDate) {
            throw errorResponse('fromDate and toDate are required', 400);
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('FromDate', sql.Date, fromDate)
            .input('ToDate', sql.Date, toDate)
            .input('EmployeeId', sql.Int, employeeId || null)
            .execute('sp_ExportAttendance');

        const data = result.recordset;

        // Convert to CSV
        if (data.length === 0) {
            throw errorResponse('No attendance records found for the specified date range', 404);
        }

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Handle dates
                    if (value instanceof Date) {
                        return value.toISOString().split('T')[0];
                    }
                    // Escape commas and quotes in strings
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ];

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_${fromDate}_to_${toDate}.csv`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAttendance,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    getMonthlyReport,
    getAttendanceGrid,
    bulkImportAttendance,
    exportAttendance
};

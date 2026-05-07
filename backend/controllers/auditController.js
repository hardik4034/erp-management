const { sql, getConnection } = require('../config/database');

// GET /api/audit
const getAuditLogs = async (req, res) => {
    try {
        const { module, role, limit = 50, page = 1, action, startDate, endDate, search } = req.query;
        const pool = await getConnection();
        
        let query = `
            SELECT a.LogId, a.UserId, a.Role as LegacyRole, a.Module, a.Action, 
                   a.Endpoint, a.RecordId as TargetRecordId, a.Payload, a.Details, a.IpAddress, a.UserAgent, a.CreatedAt,
                   a.ActorUserId, a.ActorName, a.ActorEmployeeId, a.ActorRole,
                   a.TargetEmployeeId, a.TargetEmployeeName,
                   u.username as LegacyUsername, e.FirstName as LegacyFN, e.LastName as LegacyLN, e.EmployeeCode as LegacyEmpCode
            FROM AuditLogs a
            LEFT JOIN Users u ON a.UserId = u.id
            LEFT JOIN Employees e ON u.employee_id = e.EmployeeId
            WHERE 1=1
        `;
        
        let countQuery = `
            SELECT COUNT(*) as total
            FROM AuditLogs a
            LEFT JOIN Users u ON a.UserId = u.id
            LEFT JOIN Employees e ON u.employee_id = e.EmployeeId
            WHERE 1=1
        `;

        const request = pool.request();
        const countRequest = pool.request();
        
        if (module) {
            query += ` AND a.Module = @Module`;
            countQuery += ` AND a.Module = @Module`;
            request.input('Module', sql.NVarChar(100), module);
            countRequest.input('Module', sql.NVarChar(100), module);
        }
        
        if (role) {
            query += ` AND (a.ActorRole = @Role OR a.Role = @Role)`;
            countQuery += ` AND (a.ActorRole = @Role OR a.Role = @Role)`;
            request.input('Role', sql.NVarChar(50), role);
            countRequest.input('Role', sql.NVarChar(50), role);
        }

        if (action) {
            query += ` AND a.Action = @Action`;
            countQuery += ` AND a.Action = @Action`;
            request.input('Action', sql.NVarChar(50), action);
            countRequest.input('Action', sql.NVarChar(50), action);
        }

        if (startDate && endDate) {
            query += ` AND a.CreatedAt BETWEEN @StartDate AND @EndDate`;
            countQuery += ` AND a.CreatedAt BETWEEN @StartDate AND @EndDate`;
            request.input('StartDate', sql.DateTimeOffset, new Date(startDate));
            // Ensure endDate includes the full day if no time is provided
            let ed = new Date(endDate);
            if(ed.getHours() === 0) ed.setHours(23, 59, 59, 999);
            request.input('EndDate', sql.DateTimeOffset, ed);
            countRequest.input('StartDate', sql.DateTimeOffset, new Date(startDate));
            countRequest.input('EndDate', sql.DateTimeOffset, ed);
        }

        if (search) {
            query += ` AND (
                a.ActorName LIKE @Search OR 
                a.ActorEmployeeId LIKE @Search OR 
                a.TargetEmployeeName LIKE @Search OR 
                a.TargetEmployeeId LIKE @Search OR 
                u.username LIKE @Search OR 
                e.EmployeeCode LIKE @Search
            )`;
            countQuery += ` AND (
                a.ActorName LIKE @Search OR 
                a.ActorEmployeeId LIKE @Search OR 
                a.TargetEmployeeName LIKE @Search OR 
                a.TargetEmployeeId LIKE @Search OR 
                u.username LIKE @Search OR 
                e.EmployeeCode LIKE @Search
            )`;
            request.input('Search', sql.NVarChar(100), `%${search}%`);
            countRequest.input('Search', sql.NVarChar(100), `%${search}%`);
        }
        
        // Pagination logic
        const parsedLimit = parseInt(limit, 10) || 50;
        const parsedPage = parseInt(page, 10) || 1;
        const offset = (parsedPage - 1) * parsedLimit;

        query += ` ORDER BY a.CreatedAt DESC OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY`;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, parsedLimit);

        const [result, countResult] = await Promise.all([
            request.query(query),
            countRequest.query(countQuery)
        ]);
        
        const total = countResult.recordset[0].total;

        // Format the results
        const logs = result.recordset.map(log => {
            const legacyName = log.LegacyFN && log.LegacyLN ? `${log.LegacyFN} ${log.LegacyLN}` : (log.LegacyUsername || 'System');
            
            return {
                id: log.LogId,
                // Actor fields
                actorName: log.ActorName || legacyName,
                actorEmployeeId: log.ActorEmployeeId || log.LegacyEmpCode || 'N/A',
                actorRole: log.ActorRole || log.LegacyRole || 'system',
                
                // General
                module: log.Module,
                action: log.Action,
                endpoint: log.Endpoint,
                
                // Target fields
                targetRecordId: log.TargetRecordId,
                targetEmployeeId: log.TargetEmployeeId,
                targetEmployeeName: log.TargetEmployeeName,
                
                // Payload
                payload: log.Payload,
                details: log.Details, // Fallback for older logs
                
                // Meta
                ipAddress: log.IpAddress,
                userAgent: log.UserAgent,
                createdAt: log.CreatedAt
            };
        });

        res.json({ 
            success: true, 
            data: logs,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(total / parsedLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAuditLogs
};

const { sql, getConnection } = require('../config/database');
const auditQueue = require('../services/auditQueueService');
const logger = require('../utils/logger');

const endpointTableMap = {
    'employees': { table: 'Employees', idCol: 'EmployeeId', empIdCol: 'EmployeeId' },
    'leaves': { table: 'Leaves', idCol: 'LeaveId', empIdCol: 'EmployeeId' },
    'attendance': { table: 'Attendance', idCol: 'AttendanceId', empIdCol: 'EmployeeId' },
    'payroll': { table: 'Payroll', idCol: 'PayrollId', empIdCol: 'EmployeeId' },
    'assets': { table: 'Assets', idCol: 'AssetId', empIdCol: 'AssignedTo' }, // Assuming AssignedTo is EmployeeId
    'documents': { table: 'Documents', idCol: 'DocumentId', empIdCol: 'EmployeeId' }
};

const SENSITIVE_FIELDS = [
    'password', 'oldpassword', 'newpassword', 'confirmpassword', 
    'token', 'refreshtoken', 
    'bankaccount', 'accountnumber', 'salary', 'basesalary', 'netsalary', 'grosssalary', 'ctc'
];

const maskSensitiveData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Preserve dates instead of iterating over them
    if (obj instanceof Date || Object.prototype.toString.call(obj) === '[object Date]') {
        return obj.toISOString();
    }
    
    if (Array.isArray(obj)) return obj.map(item => maskSensitiveData(item));

    const maskedObj = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
            maskedObj[key] = '***REDACTED***';
        } else if (value instanceof Date || Object.prototype.toString.call(value) === '[object Date]') {
            maskedObj[key] = value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
            maskedObj[key] = maskSensitiveData(value);
        } else {
            maskedObj[key] = value;
        }
    }
    return maskedObj;
};

const deepDiff = (oldObj, newObj) => {
    const diff = {};
    if (!newObj || typeof newObj !== 'object') return diff;
    
    // Create a lowercase key map for oldObj to handle DB vs JSON case mismatches (e.g., FirstName vs firstName)
    const oldObjLowerKeys = {};
    if (oldObj && typeof oldObj === 'object') {
        for (const [k, v] of Object.entries(oldObj)) {
            oldObjLowerKeys[k.toLowerCase()] = v;
        }
    }
    
    // Only compare keys that were explicitly sent in the new request payload
    const keysToCompare = Object.keys(newObj);
    
    keysToCompare.forEach(key => {
        // Try exact match first, then fallback to lowercase match
        let oldVal = undefined;
        if (oldObj && key in oldObj) {
            oldVal = oldObj[key];
        } else if (oldObjLowerKeys && key.toLowerCase() in oldObjLowerKeys) {
            oldVal = oldObjLowerKeys[key.toLowerCase()];
        }
        
        let newVal = newObj[key];

        if (oldVal instanceof Date) oldVal = oldVal.toISOString();
        if (newVal instanceof Date) newVal = newVal.toISOString();
        
        let oldPrimitive = (oldVal === null || oldVal === undefined) ? '' : String(oldVal);
        let newPrimitive = (newVal === null || newVal === undefined) ? '' : String(newVal);

        // Normalize Date formats (e.g. 2026-04-10T00:00:00.000Z vs 2026-04-10)
        if (oldPrimitive.length > 10 && oldPrimitive.includes('T') && newPrimitive.length === 10) {
            if (oldPrimitive.startsWith(newPrimitive)) oldPrimitive = newPrimitive;
        } else if (newPrimitive.length > 10 && newPrimitive.includes('T') && oldPrimitive.length === 10) {
            if (newPrimitive.startsWith(oldPrimitive)) newPrimitive = oldPrimitive;
        }

        if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
            const nestedDiff = deepDiff(oldVal, newVal);
            if (Object.keys(nestedDiff).length > 0) {
                diff[key] = nestedDiff;
            }
        } else if (oldPrimitive.trim() !== newPrimitive.trim()) {
            diff[key] = { old: oldPrimitive, new: newPrimitive };
        }
    });

    return diff;
};

// Trims object to top level primitives for CREATE payloads
const trimPayload = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const trimmed = {};
    for (const [key, val] of Object.entries(obj)) {
        // Exclude large or nested objects to keep payload small
        if (typeof val !== 'object') {
            trimmed[key] = val;
        }
    }
    return trimmed;
};

const auditMiddleware = async (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }
    
    let oldRecord = null;
    let targetRecordId = null;
    let targetEmployeeId = null;
    let targetEmployeeName = null;
    
    let moduleName = 'system';
    const pathParts = req.originalUrl.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'api') {
        moduleName = pathParts[2].split('?')[0];
    }
    if (moduleName === 'auth' && req.path.includes('/login')) moduleName = 'authentication';

    let action = 'UNKNOWN';
    if (req.method === 'POST') action = 'CREATE';
    if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
    if (req.method === 'DELETE') action = 'DELETE';

    const pool = await getConnection();

    // Pre-fetch old record and Target context
    if (action === 'UPDATE' || action === 'DELETE') {
        try {
            let idPart = pathParts[pathParts.length - 1].split('?')[0];
            // If the last part is not a number (e.g. /status or /hard), check the second-to-last part
            if (isNaN(idPart) && pathParts.length >= 4) {
                idPart = pathParts[pathParts.length - 2];
            }

            if (!isNaN(idPart) && endpointTableMap[moduleName]) {
                targetRecordId = idPart;
                const tableInfo = endpointTableMap[moduleName];
                
                let query = `SELECT main.*, e.EmployeeCode as _TargetEmpCode, e.FirstName as _TargetFN, e.LastName as _TargetLN 
                             FROM ${tableInfo.table} main
                             LEFT JOIN Employees e ON main.${tableInfo.empIdCol} = e.EmployeeId
                             WHERE main.${tableInfo.idCol} = @Id`;
                             
                // If the module is employees itself, join to itself
                if (moduleName === 'employees') {
                    query = `SELECT main.*, main.EmployeeCode as _TargetEmpCode, main.FirstName as _TargetFN, main.LastName as _TargetLN 
                             FROM Employees main WHERE main.EmployeeId = @Id`;
                }

                const oldRes = await pool.request()
                    .input('Id', sql.Int, parseInt(targetRecordId))
                    .query(query);
                    
                if (oldRes.recordset.length > 0) {
                    oldRecord = { ...oldRes.recordset[0] };
                    
                    // Extract Target Info
                    targetEmployeeId = oldRecord._TargetEmpCode || null;
                    if (oldRecord._TargetFN) {
                        targetEmployeeName = `${oldRecord._TargetFN} ${oldRecord._TargetLN || ''}`.trim();
                    }
                    
                    // Clean up temp join fields from oldRecord so they don't mess up diffing
                    delete oldRecord._TargetEmpCode;
                    delete oldRecord._TargetFN;
                    delete oldRecord._TargetLN;
                }
            }
        } catch (err) {
            logger.warn('Audit pre-fetch error', { error: err.message, module: moduleName });
        }
    }

    const originalSend = res.send;
    let responseBody = null;

    res.send = function (body) {
        responseBody = body;
        return originalSend.apply(this, arguments);
    };

    res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            try {
                // Actor context — read from req.user (pre-populated by userAuthMiddleware)
                // This avoids an extra DB round-trip on every mutating request.
                let actorUserId    = req.user?.id ?? null;
                let actorRole      = req.user?.role ?? 'system';
                let actorName      = req.user?.fullName ?? req.user?.username ?? 'System';
                let actorEmployeeId = null; // EmployeeCode — not cached; only fetched if needed by legacy callers

                // Parse response body
                let parsedResponse = null;
                if (responseBody && typeof responseBody === 'string') {
                    try { parsedResponse = JSON.parse(responseBody); } catch (e) {}
                } else if (responseBody && typeof responseBody === 'object') {
                    parsedResponse = responseBody;
                }

                // Infer Target Context for CREATE
                if (action === 'CREATE' && parsedResponse) {
                    if (parsedResponse.data && parsedResponse.data.id) targetRecordId = parsedResponse.data.id;
                    else if (parsedResponse.id) targetRecordId = parsedResponse.id;
                    else if (parsedResponse.insertId) targetRecordId = parsedResponse.insertId;

                    // If it's an employee creation, extract name from body
                    if (moduleName === 'employees') {
                        targetEmployeeId = req.body.employeeCode || parsedResponse.employeeCode;
                        targetEmployeeName = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || 'New Employee';
                    } else if (req.body.employeeId || req.body.employeeCode) {
                        // Very rough fallback if they passed employee context in body for other modules
                        targetEmployeeId = req.body.employeeCode || req.body.employeeId;
                    }
                }

                const rawBody = req.body || {};
                const safeBody = maskSensitiveData(rawBody);
                let payloadToSave = {};

                if (action === 'UPDATE' && oldRecord) {
                    const diff = deepDiff(maskSensitiveData(oldRecord), safeBody);
                    if (Object.keys(diff).length === 0) {
                        payloadToSave = { _message: "No fields modified" };
                    } else {
                        payloadToSave = diff;
                    }
                } else if (action === 'CREATE') {
                    payloadToSave = trimPayload(safeBody);
                } else if (action === 'DELETE') {
                    payloadToSave = { deletedEntityId: targetRecordId };
                    if (targetEmployeeName) payloadToSave.deletedFor = targetEmployeeName;
                }

                const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
                const userAgent = req.headers['user-agent'] || 'unknown';

                auditQueue.enqueue({
                    actorUserId,
                    actorName,
                    actorEmployeeId,
                    actorRole,
                    module: moduleName,
                    action,
                    endpoint: req.originalUrl,
                    targetRecordId,
                    targetEmployeeId,
                    targetEmployeeName,
                    payload: payloadToSave,
                    ipAddress,
                    userAgent
                });

            } catch (error) {
                logger.error('Audit Formatting Error', { error: error.message });
            }
        }
    });

    next();
};

module.exports = auditMiddleware;

let currentPage = 1;
const logsPerPage = 50;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    try {
        auth.requireAuth();
        
        if (auth.user && !auth.hasRole('hr', 'admin')) {
            window.location.href = '../index.html';
            return;
        }

        const runLoad = () => {
            try {
                if (!auth.hasRole('hr', 'admin')) {
                    window.location.href = '../index.html';
                    return;
                }
                loadAuditLogs(1).catch(e => {
                    document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Error inside loadAuditLogs promise: ${e.message}</td></tr>`;
                });
            } catch (e) {
                document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Error starting loadAuditLogs: ${e.message}</td></tr>`;
            }
        };

        if (auth.isInitialized) {
            runLoad();
        } else {
            window.addEventListener('authReady', runLoad);
            setTimeout(() => {
                if (!auth.isInitialized) {
                    document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Auth initialization timeout</td></tr>`;
                }
            }, 5000);
        }
    } catch (e) {
        document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Setup error: ${e.message}</td></tr>`;
    }
});

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        loadAuditLogs(newPage);
    }
}

async function loadAuditLogs(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Loading logs...</td></tr>';

    const moduleFilter = document.getElementById('moduleFilter')?.value || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const actionFilter = document.getElementById('actionFilter')?.value || '';
    const searchFilter = document.getElementById('searchFilter')?.value || '';
    const startDateFilter = document.getElementById('startDateFilter')?.value || '';
    const endDateFilter = document.getElementById('endDateFilter')?.value || '';

    let url = `/audit?limit=${logsPerPage}&page=${currentPage}`;
    if (moduleFilter) url += `&module=${encodeURIComponent(moduleFilter)}`;
    if (roleFilter) url += `&role=${encodeURIComponent(roleFilter)}`;
    if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
    if (searchFilter) url += `&search=${encodeURIComponent(searchFilter)}`;
    if (startDateFilter) url += `&startDate=${encodeURIComponent(startDateFilter)}`;
    if (endDateFilter) url += `&endDate=${encodeURIComponent(endDateFilter)}`;

    try {
        const response = await api.get(url);
        
        if (response.success) {
            const logs = response.data;
            const pagination = response.pagination;
            totalPages = pagination ? pagination.totalPages : 1;
            
            // Update pagination UI
            document.getElementById('currentPageDisplay').innerText = `Page ${currentPage} of ${totalPages}`;
            document.getElementById('pageInfo').innerText = pagination ? `${pagination.total} logs` : `${logs.length} logs`;
            document.getElementById('prevPageBtn').disabled = currentPage <= 1;
            document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem; color: #64748b;">No audit logs found matching criteria</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            
            logs.forEach(log => {
                const tr = document.createElement('tr');
                
                // Format Date
                let timeStr = log.createdAt;
                // SQL Server might return UTC without Z, let's ensure it has Z so new Date() converts to Local Time
                if (timeStr && !timeStr.endsWith('Z')) {
                    timeStr += 'Z';
                }
                const dateObj = new Date(timeStr);
                const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Format Action Badge
                let actionClass = '';
                const actionLower = log.action ? log.action.toLowerCase() : 'unknown';
                if (actionLower === 'create') actionClass = 'action-create';
                else if (actionLower === 'update') actionClass = 'action-update';
                else if (actionLower === 'delete') actionClass = 'action-delete';
                
                // Format Actor
                const actorRole = log.actorRole ? log.actorRole.charAt(0).toUpperCase() + log.actorRole.slice(1) : 'System';
                const actorEmpId = log.actorEmployeeId && log.actorEmployeeId !== 'N/A' ? log.actorEmployeeId : '';
                const actorNameStr = log.actorName || 'Unknown';
                let actorDisplay = `<strong>${escapeHtml(actorRole)}</strong>`;
                if (actorEmpId) {
                    actorDisplay += `<div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">(EmpID: ${escapeHtml(actorEmpId)} - ${escapeHtml(actorNameStr)})</div>`;
                } else {
                    actorDisplay += `<div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">(${escapeHtml(actorNameStr)})</div>`;
                }

                // Format Target
                const moduleName = log.module ? log.module.charAt(0).toUpperCase() + log.module.slice(1) : 'Record';
                let targetDisplay = `<strong>${escapeHtml(moduleName)}</strong>`;
                let targetMeta = [];
                
                let finalTargetRecordId = log.targetRecordId;
                
                // Fallback for older logs: try to extract ID from endpoint (e.g. /api/employees/12)
                if (!finalTargetRecordId || finalTargetRecordId === 'null') {
                    if (log.endpoint) {
                        const urlParts = log.endpoint.split('?')[0].split('/');
                        for (let i = urlParts.length - 1; i >= 0; i--) {
                            if (/^\d+$/.test(urlParts[i])) {
                                finalTargetRecordId = urlParts[i];
                                break;
                            }
                        }
                    }
                }
                
                // Fallback for older logs: try to extract from Details Payload if still not found
                if (!finalTargetRecordId || finalTargetRecordId === 'null') {
                    if (log.details && log.details.includes('Payload:')) {
                        const match = log.details.match(/Payload:\s*({.*})/);
                        if (match && match[1]) {
                            try { 
                                const p = JSON.parse(match[1]); 
                                if (p.employeeCode) finalTargetRecordId = p.employeeCode;
                                else if (p.employeeId) finalTargetRecordId = p.employeeId;
                                else if (p.EmployeeCode) finalTargetRecordId = p.EmployeeCode;
                                else if (p.EmployeeId) finalTargetRecordId = p.EmployeeId;
                            } catch(e){}
                        }
                    }
                }

                if (log.targetEmployeeId && log.targetEmployeeId !== 'null') targetMeta.push(`EmpID: ${escapeHtml(log.targetEmployeeId)}`);
                else if (finalTargetRecordId && finalTargetRecordId !== 'null') targetMeta.push(`ID: ${escapeHtml(finalTargetRecordId)}`);
                
                if (log.targetEmployeeName && log.targetEmployeeName !== 'null') targetMeta.push(escapeHtml(log.targetEmployeeName));
                
                if (targetMeta.length > 0) {
                    targetDisplay += `<div style="font-size: 0.8rem; color: #ea580c; margin-top: 2px;">(${targetMeta.join(' - ')})</div>`;
                } else {
                    targetDisplay += `<div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">(No Target Info)</div>`;
                }

                // Payload Diff
                let payloadObj = null;
                if (log.payload) {
                    try { payloadObj = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload; } catch(e){}
                } else if (log.details && log.details.includes('Payload:')) {
                    const match = log.details.match(/Payload:\s*({.*})/);
                    if (match && match[1]) {
                        try { payloadObj = JSON.parse(match[1]); } catch(e){}
                    }
                }

                const formattedDetails = formatPayloadObj(payloadObj);
                
                tr.innerHTML = `
                    <td class="date-cell" style="vertical-align: top;">${dateStr}</td>
                    <td style="vertical-align: top;">${actorDisplay}</td>
                    <td style="vertical-align: top;"><span class="action-badge ${actionClass}">${escapeHtml(log.action)}</span></td>
                    <td style="vertical-align: top;">${targetDisplay}</td>
                    <td class="details-cell" style="vertical-align: top;">
                        ${formattedDetails}
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
        } else {
            showToast('Failed to load audit logs: ' + response.message, 'error');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-500" style="padding: 2rem;">Failed to load logs</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        showToast('Error connecting to server', 'error');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-500" style="padding: 2rem;">Error connecting to server</td></tr>';
    }
}

function renderNestedDiff(obj, prefix = '') {
    let html = '';
    let count = 0;

    for (const [key, v] of Object.entries(obj)) {
        // Skip context keys
        if (key.toLowerCase() === 'employeecode' || key.toLowerCase() === 'employeeid') continue;
        if (key === '_message') {
            html += `<span style="color: #64748b;"><i>${escapeHtml(v)}</i></span>`;
            continue;
        }

        const displayKey = prefix ? `${prefix}.${key}` : key;

        if (v && typeof v === 'object' && ('old' in v || 'new' in v)) {
            // It's a diff object
            const oldVal = v.old === null || v.old === '' ? 'empty' : escapeHtml(String(v.old));
            const newVal = v.new === null || v.new === '' ? 'empty' : escapeHtml(String(v.new));
            
            html += `<div style="margin-bottom: 6px; font-size: 0.85rem; color: #334155;">
                &bull; Changed <strong>${escapeHtml(displayKey)}</strong> from 
                <span style="color: #ef4444;">'${oldVal}'</span> to 
                <span style="color: #10b981; font-weight: 600;">'${newVal}'</span>
            </div>`;
            count++;
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            // Nested object
            const nested = renderNestedDiff(v, displayKey);
            html += nested.html;
            count += nested.count;
        } else {
            // Standard static value (CREATE/DELETE)
            let valStr = String(v);
            if (v === '***REDACTED***') valStr = '***REDACTED***';
            else if (valStr.length > 50) valStr = valStr.substring(0, 50) + '...';
            
            html += `<div style="margin-bottom: 6px; font-size: 0.85rem; color: #334155;">
                &bull; Set <strong>${escapeHtml(displayKey)}</strong> to <span style="color: #10b981; font-weight: 600;">'${escapeHtml(valStr)}'</span>
            </div>`;
            count++;
        }
    }
    return { html, count };
}

function formatPayloadObj(payload) {
    if (!payload || Object.keys(payload).length === 0) return '<span style="color:#94a3b8;">-</span>';

    try {
        const { html, count } = renderNestedDiff(payload);
        
        if (count === 0) {
            return `<div style="font-size: 0.85rem; color: #94a3b8;">No specific fields changed</div>`;
        }

        if (count <= 5) {
            return `<div style="font-size: 0.85rem; line-height: 1.4;">${html}</div>`;
        } else {
            return `<details style="margin-top: 4px;">
                <summary style="cursor: pointer; color: #3b82f6; font-size: 0.8rem; font-weight: 600; outline: none; user-select: none;">View ${count} Changes</summary>
                <div style="font-size: 0.85rem; line-height: 1.4; margin-top: 4px; padding-left: 8px; border-left: 2px solid #e2e8f0;">${html}</div>
            </details>`;
        }
    } catch (e) {
        console.error('Error formatting payload:', e);
        return `<div style="color:red">Parse error</div>`;
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

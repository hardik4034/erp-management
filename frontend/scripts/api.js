// ─── API Base URL ─────────────────────────────────────────────────────────────
// Development : http://localhost:5000/api  (direct to Node, no proxy)
// Production  : /api                       (served through Nginx/IIS reverse proxy → port 5000)
//               Uses a relative URL so HTTPS is inherited from the page automatically,
//               avoiding mixed-content errors on any HTTPS deployment.
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';


/**
 * Production-Ready API Client with In-Memory Token Storage
 */
const createAPIClient = (baseURL) => {
    let _accessToken = null; // Private in-memory token
    let _refreshPromise = null;

    const setAccessToken = (token) => {
        _accessToken = token;
    };

    const request = async (endpoint, options = {}) => {
        const url = `${baseURL}${endpoint}`;

        const config = {
            ...options,
            credentials: 'include',
            headers: {
                ...options.headers
            }
        };

        // Attach Access Token if available
        if (_accessToken) {
            config.headers['Authorization'] = `Bearer ${_accessToken}`;
        }

        if (!(options.body instanceof FormData) && options.method !== 'GET') {
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            let response = await fetch(url, config);
            
            // Handle Token Expiry
            if (response.status === 401 && !endpoint.includes('/auth/login')) {
                // If we're already refreshing, wait for it
                if (!_refreshPromise) {
                    _refreshPromise = refreshTokens();
                }

                const success = await _refreshPromise;
                _refreshPromise = null;

                if (success) {
                    // Retry with new token
                    return request(endpoint, options);
                } else {
                    // Refresh failed, clear and redirect
                    _accessToken = null;
                    handleAuthFailure();
                    return new Promise(() => {});
                }
            }

            let data = null;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (options.responseType === 'blob') {
                return await response.blob();
            }

            if (!response.ok) {
                if (data && data.code === 'PASSWORD_CHANGE_REQUIRED') {
                    // Use relative path so it works on subpath deployments
                    const isSubPage = window.location.pathname.includes('/pages/');
                    window.location.href = isSubPage ? '../login.html?mode=change_password' : './login.html?mode=change_password';
                    return;
                }
                throw new Error(data?.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    };

    const refreshTokens = async () => {
        try {
            const response = await fetch(`${baseURL}/auth/refresh-token`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setAccessToken(data.accessToken);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const handleAuthFailure = () => {
        localStorage.removeItem('user');
        const isLoginPage = window.location.pathname.includes('login.html');
        if (!isLoginPage) {
            const isSubPage = window.location.pathname.includes('/pages/');
            window.location.href = isSubPage ? '../login.html' : './login.html';
        }
    };

    return {
        baseURL,
        setAccessToken,
        request,
        get: (endpoint, params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(query ? `${endpoint}?${query}` : endpoint, { method: 'GET' });
        },
        post: (endpoint, data) => request(endpoint, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        }),
        put: (endpoint, data) => request(endpoint, {
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data)
        }),
        delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
        getBlob: (endpoint, params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(query ? `${endpoint}?${query}` : endpoint, { method: 'GET', responseType: 'blob' });
        }
    };
};

const api = createAPIClient(API_BASE_URL);

// API Endpoints
const endpoints = {
    employees: {
        getAll: (params) => api.get('/employees', params),
        getById: (id) => api.get(`/employees/${id}`),
        create: (data) => api.post('/employees', data),
        update: (id, data) => api.put(`/employees/${id}`, data),
        delete: (id, data) => api.request(`/employees/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
        restore: (id) => api.post(`/employees/${id}/restore`, {}),
        hardDelete: (id) => api.request(`/employees/${id}/hard`, { method: 'DELETE' }),
        getExitDetails: (id) => api.get(`/employees/${id}/exit-details`),
        saveExitDetails: (id, data) => api.post(`/employees/${id}/exit-details`, data),
        getApprovers: (id) => api.get(`/employees/${id}/approvers`),
        saveApprovers: (id, data) => api.post(`/employees/${id}/approvers`, data)
    },

    attendance: {
        getAll: (params) => api.get('/attendance', params),
        getById: (id) => api.get(`/attendance/${id}`),
        create: (data) => api.post('/attendance', data),
        update: (id, data) => api.put(`/attendance/${id}`, data),
        delete: (id) => api.delete(`/attendance/${id}`),
        getMonthlyReport: (params) => api.get('/attendance/report/monthly', params),
        getGrid: (params) => api.get('/attendance/grid', params),
        export: (params) => api.getBlob('/attendance/export', params),
        import: (data) => api.post('/attendance/import', data)
    },

    leaves: {
        getAll: (params) => api.get('/leaves', params),
        getById: (id) => api.get(`/leaves/${id}`),
        create: (data) => api.post('/leaves', data),
        update: (id, data) => api.put(`/leaves/${id}`, data),
        updateStatus: (id, data) => api.put(`/leaves/${id}/status`, data),
        delete: (id, data) => api.request(`/leaves/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
        restore: (id) => api.post(`/leaves/${id}/restore`, {}),
        hardDelete: (id) => api.request(`/leaves/${id}/hard`, { method: 'DELETE' }),
        getTypes: () => api.get('/leaves/types/all'),
        getBalance: (employeeId) => api.get(`/leaves/balance/${employeeId}`)
    },

    holidays: {
        getAll: (params) => api.get('/holidays', params),
        getById: (id) => api.get(`/holidays/${id}`),
        create: (data) => api.post('/holidays', data),
        update: (id, data) => api.put(`/holidays/${id}`, data),
        delete: (id, data) => api.request(`/holidays/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
        restore: (id) => api.post(`/holidays/${id}/restore`, {}),
        hardDelete: (id) => api.request(`/holidays/${id}/hard`, { method: 'DELETE' })
    },

    departments: {
        getAll: (params) => api.get('/departments', params),
        getById: (id) => api.get(`/departments/${id}`),
        create: (data) => api.post('/departments', data),
        update: (id, data) => api.put(`/departments/${id}`, data),
        delete: (id, data) => api.request(`/departments/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
        restore: (id) => api.post(`/departments/${id}/restore`, {}),
        hardDelete: (id) => api.request(`/departments/${id}/hard`, { method: 'DELETE' })
    },

    designations: {
        getAll: (params) => api.get('/designations', params),
        getById: (id) => api.get(`/designations/${id}`),
        create: (data) => api.post('/designations', data),
        update: (id, data) => api.put(`/designations/${id}`, data),
        delete: (id, data) => api.request(`/designations/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
        restore: (id) => api.post(`/designations/${id}/restore`, {}),
        hardDelete: (id) => api.request(`/designations/${id}/hard`, { method: 'DELETE' })
    },

    appreciations: {
        getAll: (params) => api.get('/appreciations', params),
        getById: (id) => api.get(`/appreciations/${id}`),
        create: (data) => api.post('/appreciations', data),
        update: (id, data) => api.put(`/appreciations/${id}`, data),
        delete: (id, data) => api.request(`/appreciations/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
        restore: (id) => api.post(`/appreciations/${id}/restore`, {}),
        hardDelete: (id) => api.request(`/appreciations/${id}/hard`, { method: 'DELETE' })
    },

    payroll: {
        getAll: (params) => api.get('/payroll', params),
        getById: (id) => api.get(`/payroll/${id}`),
        generate: (data) => api.post('/payroll/generate', data),
        generateBulk: (data) => api.post('/payroll/generate-bulk', data),
        create: (data) => api.post('/payroll', data),
        update: (id, data) => api.put(`/payroll/${id}`, data),
        updateStatus: (id, data) => api.request(`/payroll/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id) => api.delete(`/payroll/${id}`),
        getComponents: (params) => api.get('/payroll/components/all', params),
        addDetail: (data) => api.post('/payroll/details', data),
        updateDetail: (id, data) => api.put(`/payroll/details/${id}`, data),
        deleteDetail: (id) => api.delete(`/payroll/details/${id}`),
        calculateAttendance: (params) => api.get('/payroll/calculate/attendance', params)
    },

    salary: {
        getAll: (params) => api.get('/salary', params),
        getById: (id) => api.get(`/salary/${id}`),
        getCurrentSalary: (employeeId) => api.get(`/salary/employee/${employeeId}/current`),
        getHistory: (employeeId) => api.get(`/salary/employee/${employeeId}/history`),
        create: (data) => api.post('/salary', data),
        update: (id, data) => api.put(`/salary/${id}`, data),
        delete: (id) => api.delete(`/salary/${id}`),
        getGroups: () => api.get('/salary/groups'),
        createGroup: (data) => api.post('/salary/groups', data)
    },
    
    documents: {
        getAll: (employeeId) => api.get(`/documents/${employeeId}`),
        upload: (employeeId, formData) => api.post(`/documents/${employeeId}`, formData),
        delete: (employeeId, documentType) => api.delete(`/documents/${employeeId}/${documentType}`)
    },

    notes: {
        getTypes: () => api.get('/notes/types'),
        getByEmployee: (employeeId, params) => api.get(`/notes/employee/${employeeId || 0}`, params),
        create: (data) => api.post('/notes/create', data),
        update: (id, data) => api.put(`/notes/update/${id}`, data),
        delete: (id) => api.delete(`/notes/delete/${id}`)
    },
    
    biometric: {
        getDevices: () => api.get('/biometric/devices'),
        connect: (data) => api.post('/biometric/connect', data),
        sync: (deviceId) => api.post(`/biometric/sync/${deviceId}`),
        syncAll: () => api.post('/biometric/sync-all'),
        process: (data) => api.post('/biometric/process', data),
        getStatus: () => api.get('/biometric/status'),
        getUnmapped: () => api.get('/biometric/unmapped'),
        mockPunch: (data) => api.post('/biometric/mock-punch', data)
    },
    
    calendar: {
        getEvents: (params) => api.get('/calendar', params),
        create: (data) => api.post('/calendar', data),
        update: (id, data) => api.put(`/calendar/${id}`, data),
        delete: (id) => api.delete(`/calendar/${id}`)
    },
    
    assets: {
        getAll: (params) => api.get('/assets', params),
        getById: (id) => api.get(`/assets/${id}`),
        create: (data) => api.post('/assets', data),
        update: (id, data) => api.put(`/assets/${id}`, data),
        delete: (id) => api.delete(`/assets/${id}`),
        assign: (data) => api.post('/assets/assign', data),
        return: (data) => api.post('/assets/return', data),
        getByEmployee: (employeeId) => api.get(`/assets/employee/${employeeId}`),
        getHistory: (id) => api.get(`/assets/${id}/history`)
    },
    
    auth: {
        login: (credentials) => api.post('/auth/login', credentials),
        me: () => api.get('/auth/me'),
        logout: () => api.post('/auth/logout', {}),
        refresh: () => api.post('/auth/refresh-token', {}),
        changePassword: (data) => api.post('/auth/change-password', data)
    },

    users: {
        getAll: () => api.get('/users'),
        create: (data) => api.post('/users', data),
        update: (id, data) => api.put(`/users/${id}`, data),
        delete: (id) => api.delete(`/users/${id}`),
        resetPassword: (id, password) => api.put(`/users/${id}/reset-password`, { password }),
        provision: (data) => api.post('/users/provision', data)
    }
};

// Utility functions
const showAlert = (message, type = 'info') => {
    // Use toast notification if available, fallback to old method
    if (window.toast) {
        window.toast.show(message, type);
    } else {
        // Fallback for backward compatibility
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.content-area');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            setTimeout(() => alertDiv.remove(), 5000);
        }
    }
};

const showLoading = (show = true) => {
    let spinner = document.getElementById('loadingSpinner');
    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loadingSpinner';
            spinner.className = 'spinner';
            document.body.appendChild(spinner);
        }
    } else {
        if (spinner) {
            spinner.remove();
        }
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
};

// Navigate to employee profile
const navigateToProfile = (employeeId) => {
    if (!employeeId) {
        console.error('Employee ID is required to navigate to profile');
        return;
    }
    window.location.href = `/pages/profile.html?employeeId=${employeeId}`;
};

// Export
window.api = api;
window.endpoints = endpoints;
window.utils = {
    showAlert,
    showLoading,
    formatDate,
    formatTime,
    navigateToProfile
};

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Client
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                'x-user-role': window.roleManager?.getCurrentRole() || 'employee',
                'x-employee-id': window.roleManager?.getCurrentEmployeeId() || null,
                ...options.headers
            }
        };

        // Only add Content-Type: application/json if body is NOT FormData
        if (!(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Create API instance
const api = new APIClient(API_BASE_URL);

// API Endpoints
const endpoints = {
    employees: {
        getAll: () => api.get('/employees'),
        getById: (id) => api.get(`/employees/${id}`),
        create: (data) => api.post('/employees', data),
        update: (id, data) => api.put(`/employees/${id}`, data),
        delete: (id) => api.delete(`/employees/${id}`)
    },

    attendance: {
        getAll: (params) => api.get('/attendance', params),
        getById: (id) => api.get(`/attendance/${id}`),
        create: (data) => api.post('/attendance', data),
        update: (id, data) => api.put(`/attendance/${id}`, data),
        delete: (id) => api.delete(`/attendance/${id}`),
        getMonthlyReport: (params) => api.get('/attendance/report/monthly', params),
        getGrid: (params) => api.get('/attendance/grid', params)
    },

    leaves: {
        getAll: (params) => api.get('/leaves', params),
        getById: (id) => api.get(`/leaves/${id}`),
        create: (data) => api.post('/leaves', data),
        update: (id, data) => api.put(`/leaves/${id}`, data),
        updateStatus: (id, data) => api.put(`/leaves/${id}/status`, data),
        delete: (id) => api.delete(`/leaves/${id}`),
        getTypes: () => api.get('/leaves/types/all'),
        getBalance: (employeeId) => api.get(`/leaves/balance/${employeeId}`)
    },

    holidays: {
        getAll: (params) => api.get('/holidays', params),
        getById: (id) => api.get(`/holidays/${id}`),
        create: (data) => api.post('/holidays', data),
        update: (id, data) => api.put(`/holidays/${id}`, data),
        delete: (id) => api.delete(`/holidays/${id}`)
    },

    departments: {
        getAll: () => api.get('/departments'),
        getById: (id) => api.get(`/departments/${id}`),
        create: (data) => api.post('/departments', data),
        update: (id, data) => api.put(`/departments/${id}`, data),
        delete: (id) => api.delete(`/departments/${id}`)
    },

    designations: {
        getAll: (params) => api.get('/designations', params),
        getById: (id) => api.get(`/designations/${id}`),
        create: (data) => api.post('/designations', data),
        update: (id, data) => api.put(`/designations/${id}`, data),
        delete: (id) => api.delete(`/designations/${id}`)
    },

    appreciations: {
        getAll: (params) => api.get('/appreciations', params),
        getById: (id) => api.get(`/appreciations/${id}`),
        create: (data) => api.post('/appreciations', data),
        update: (id, data) => api.put(`/appreciations/${id}`, data),
        delete: (id) => api.delete(`/appreciations/${id}`)
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

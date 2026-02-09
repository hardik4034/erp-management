/**
 * eSSL ADMS Service
 * Handles all interactions with eSSL ADMS Cloud API
 * 
 * IMPORTANT: Configure these environment variables:
 * - ESSL_ADMS_API_URL (e.g., https://api.essl.cloud/v1)
 * - ESSL_ADMS_API_KEY or ESSL_ADMS_TOKEN
 */

const axios = require('axios');

class EsslAdmsService {
    constructor() {
        // Load configuration from environment variables
        this.apiUrl = process.env.ESSL_ADMS_API_URL || 'https://api.essl.cloud/v1';
        this.apiKey = process.env.ESSL_ADMS_API_KEY || '';
        this.token = process.env.ESSL_ADMS_TOKEN || '';
        
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token || this.apiKey}`
            }
        });
    }

    /**
     * Validate if device exists in ADMS account
     * @param {string} deviceId - eSSL Device ID / Serial Number
     * @returns {Promise<Object>} Device information
     */
    async validateDevice(deviceId) {
        try {
            // NOTE: Adjust endpoint based on actual eSSL ADMS API documentation
            // This is a typical pattern for device validation
            const response = await this.client.get(`/devices/${deviceId}`);
            
            if (response.data && response.data.success) {
                return {
                    success: true,
                    device: {
                        deviceId: response.data.device.deviceId || deviceId,
                        deviceName: response.data.device.deviceName || response.data.device.name,
                        status: response.data.device.status || 'active',
                        model: response.data.device.model,
                        location: response.data.device.location
                    }
                };
            }
            
            return {
                success: false,
                error: 'Device not found in ADMS account'
            };
            
        } catch (error) {
            console.error('ADMS API Error (validateDevice):', error.message);
            
            if (error.response) {
                // API responded with error
                return {
                    success: false,
                    error: error.response.data.message || 'Device validation failed',
                    statusCode: error.response.status
                };
            } else if (error.request) {
                // No response received
                return {
                    success: false,
                    error: 'Unable to connect to eSSL ADMS API. Please check your internet connection.'
                };
            } else {
                // Other errors
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    /**
     * Fetch attendance logs from ADMS API
     * @param {string} deviceId - Device ID
     * @param {Date} startDate - Start date for logs
     * @param {Date} endDate - End date for logs
     * @returns {Promise<Object>} Attendance logs
     */
    async fetchAttendanceLogs(deviceId, startDate, endDate) {
        try {
            // Format dates for API (adjust format based on ADMS API requirements)
            const start = this.formatDate(startDate);
            const end = this.formatDate(endDate);
            
            // NOTE: Adjust endpoint and parameters based on actual eSSL ADMS API documentation
            // Common patterns: /devices/{deviceId}/attendance or /attendance/logs
            const response = await this.client.get(`/devices/${deviceId}/attendance`, {
                params: {
                    startDate: start,
                    endDate: end,
                    // Some APIs use different parameter names
                    // from: start,
                    // to: end
                }
            });
            
            if (response.data && response.data.success) {
                // Normalize the response data
                const logs = response.data.logs || response.data.data || [];
                
                return {
                    success: true,
                    logs: logs.map(log => this.normalizeLog(log)),
                    count: logs.length
                };
            }
            
            return {
                success: false,
                error: 'No attendance data found',
                logs: []
            };
            
        } catch (error) {
            console.error('ADMS API Error (fetchAttendanceLogs):', error.message);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.message || 'Failed to fetch attendance logs',
                    statusCode: error.response.status,
                    logs: []
                };
            } else if (error.request) {
                return {
                    success: false,
                    error: 'Unable to connect to eSSL ADMS API',
                    logs: []
                };
            } else {
                return {
                    success: false,
                    error: error.message,
                    logs: []
                };
            }
        }
    }

    /**
     * Normalize attendance log to standard format
     * @param {Object} log - Raw log from ADMS API
     * @returns {Object} Normalized log
     */
    normalizeLog(log) {
        return {
            biometricUserId: log.userId || log.employeeId || log.user_id,
            punchTime: new Date(log.punchTime || log.timestamp || log.time),
            punchType: this.determinePunchType(log),
            deviceId: log.deviceId || log.device_id,
            rawData: log // Keep original data for reference
        };
    }

    /**
     * Determine punch type from log data
     * @param {Object} log - Log data
     * @returns {string} Punch type (IN/OUT/BREAK)
     */
    determinePunchType(log) {
        // Different APIs may use different field names
        if (log.punchType) return log.punchType.toUpperCase();
        if (log.type) return log.type.toUpperCase();
        if (log.direction) return log.direction.toUpperCase();
        
        // Some systems use numeric codes
        if (log.verifyMode === 0 || log.status === 0) return 'IN';
        if (log.verifyMode === 1 || log.status === 1) return 'OUT';
        
        return 'IN'; // Default
    }

    /**
     * Format date for API request
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        if (!date) return null;
        
        // Most APIs accept ISO format or YYYY-MM-DD
        // Adjust based on ADMS API requirements
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
        // Alternative formats:
        // return d.toISOString(); // ISO format
        // return `${day}/${month}/${year}`; // DD/MM/YYYY
    }

    /**
     * Test API connection
     * @returns {Promise<Object>} Connection status
     */
    async testConnection() {
        try {
            // Try to fetch account info or device list
            const response = await this.client.get('/devices');
            
            return {
                success: true,
                message: 'Successfully connected to eSSL ADMS API',
                deviceCount: response.data.devices?.length || 0
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to connect to eSSL ADMS API: ' + error.message
            };
        }
    }
}

module.exports = new EsslAdmsService();

const request = require('supertest');
const app = require('../server');

// Mock the database connection to avoid real DB hits during unit tests
jest.mock('../config/database', () => ({
    getConnection: jest.fn().mockResolvedValue({}),
    closeConnection: jest.fn().mockResolvedValue({}),
    sql: {
        Int: 1,
        NVarChar: 2,
        Bit: 3,
        Date: 4,
        DateTimeOffset: 5,
        MAX: 1000
    }
}));

// Mock the admin database as well
jest.mock('../config/adminDatabase', () => ({
    getAdminConnection: jest.fn().mockResolvedValue({}),
    closeAdminConnection: jest.fn().mockResolvedValue({})
}));

// Mock the biometric scheduler
jest.mock('../services/schedulerService', () => ({
    initBiometricScheduler: jest.fn()
}));

const auditQueue = require('../services/auditQueueService');

// ... (mocks stay the same)

describe('Health Check API', () => {
    afterAll(() => {
        // Stop background intervals so Jest can exit
        auditQueue.stop();
    });

    it('should return 200 OK for /health endpoint', async () => {
        const res = await request(app).get('/health');
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'OK');
        expect(res.body).toHaveProperty('message', 'HRMS API is running');
    });

    it('should return 404 for unknown non-api routes', async () => {
        // Use a route OUTSIDE /api to avoid the auth middleware 401
        const res = await request(app).get('/some-non-existent-page');
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('success', false);
    });
});


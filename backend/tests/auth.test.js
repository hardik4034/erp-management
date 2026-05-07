const request = require('supertest');
const app = require('../server');
const userService = require('../services/userService');
const authService = require('../services/authService');

// Mock dependencies
jest.mock('../services/userService');
jest.mock('../services/authService');
jest.mock('../config/database', () => ({
    getConnection: jest.fn().mockResolvedValue({}),
    sql: { Int: 1, NVarChar: 2 }
}));
jest.mock('../config/adminDatabase', () => ({
    getAdminConnection: jest.fn().mockResolvedValue({})
}));

const auditQueue = require('../services/auditQueueService');

describe('Authentication API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        auditQueue.stop();
    });


    describe('POST /api/auth/login', () => {
        it('should return 401 if user is not found', async () => {
            userService.getUserByUsername.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'nonexistent', password: 'password123' });

            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return 401 if password does not match', async () => {
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                password_hash: 'hashed_pass',
                status: 'Active' 
            };
            userService.getUserByUsername.mockResolvedValue(mockUser);
            authService.compareData.mockResolvedValue(false); // Password mismatch
            userService.handleFailedLogin.mockResolvedValue({ attempts: 1 });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'testuser', password: 'wrongpassword' });

            expect(res.statusCode).toEqual(401);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should login successfully with correct credentials', async () => {
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                password_hash: 'hashed_pass', 
                role_name: 'Admin',
                status: 'Active',
                full_name: 'Test Admin'
            };
            userService.getUserByUsername.mockResolvedValue(mockUser);
            authService.compareData.mockResolvedValue(true);
            authService.generateAccessToken.mockReturnValue('mock_access_token');
            authService.generateRefreshToken.mockReturnValue('mock_refresh_token');

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'testuser', password: 'correctpassword' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.accessToken).toBe('mock_access_token');
            expect(res.body.user.username).toBe('testuser');
        });
    });
});

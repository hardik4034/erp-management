
const { getAdminConnection } = require('../config/adminDatabase');
const bcrypt = require('bcryptjs');

async function setupAuthData() {
    try {
        const pool = await getAdminConnection();
        console.log('Connected to Admin Database');

        // 1. Add missing roles
        const rolesToAdd = ['HR', 'Manager', 'Employee'];

        for (const roleName of rolesToAdd) {
            const checkRole = await pool.request()
                .input('name', roleName)
                .query('SELECT id FROM roles WHERE name = @name');

            if (checkRole.recordset.length === 0) {
                // We'll let it auto-increment but provide all required fields
                await pool.request()
                    .input('name', roleName)
                    .input('description', `${roleName} role for HRMS`)
                    .input('department', 'General')
                    .input('user_count', 0)
                    .input('is_system', 0)
                    .input('status', 'Active')
                    .query(`
                        INSERT INTO roles (name, description, department, user_count, is_system, status, last_modified, created_at, updated_at) 
                        VALUES (@name, @description, @department, @user_count, @is_system, @status, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())
                    `);
                console.log(`Added role: ${roleName}`);
            } else {
                console.log(`Role already exists: ${roleName}`);
            }
        }

        // 2. Add a default admin user if not exists
        const adminUsername = 'admin';
        const adminPassword = 'adminpassword'; // User should change this
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const checkUser = await pool.request()
            .input('username', adminUsername)
            .query('SELECT id FROM users WHERE username = @username');

        if (checkUser.recordset.length === 0) {
            await pool.request()
                .input('username', adminUsername)
                .input('password', hashedPassword)
                .input('full_name', 'System Admin')
                .input('email', 'admin@example.com')
                .input('role_id', 1) // Admin
                .input('status', 'Active')
                .query(`
                    INSERT INTO users (username, password_hash, full_name, email, role_id, status) 
                    VALUES (@username, @password, @full_name, @email, @role_id, @status)
                `);
            console.log(`Created default user: ${adminUsername} / ${adminPassword}`);
        } else {
            // Update password just in case for testing
            await pool.request()
                .input('username', adminUsername)
                .input('password', hashedPassword)
                .query('UPDATE users SET password_hash = @password WHERE username = @username');
            console.log(`Updated password for existing user: ${adminUsername}`);
        }

        console.log('✅ Auth data setup complete');
    } catch (error) {
        console.error('❌ Error setting up auth data:', error);
    } finally {
        process.exit();
    }
}

setupAuthData();

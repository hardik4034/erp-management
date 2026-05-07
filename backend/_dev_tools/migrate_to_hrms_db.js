const { getConnection } = require('../config/database');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

async function migrateDatabase() {
    try {
        const pool = await getConnection();
        
        console.log('--- Step 1: Creating UserRoles Table ---');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles')
            BEGIN
                CREATE TABLE UserRoles (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    is_system BIT DEFAULT 1,
                    status VARCHAR(20) DEFAULT 'Active',
                    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
                    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
                );
                
                INSERT INTO UserRoles (name, description) VALUES 
                ('Admin', 'Full system access'),
                ('HR', 'Human Resources management access'),
                ('Manager', 'Management and team leader access'),
                ('Employee', 'Basic self-service access');
                
                print '✅ UserRoles table created and seeded.';
            END
            ELSE
            BEGIN
                print 'ℹ️ UserRoles table already exists.';
            END
        `);

        console.log('\n--- Step 2: Creating Users Table ---');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
            BEGIN
                CREATE TABLE Users (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    username NVARCHAR(50) NOT NULL UNIQUE,
                    password_hash NVARCHAR(255) NOT NULL,
                    full_name NVARCHAR(100) NOT NULL,
                    email NVARCHAR(255) NOT NULL,
                    role_id INT REFERENCES UserRoles(id),
                    employee_id INT REFERENCES Employees(EmployeeId),
                    status NVARCHAR(20) DEFAULT 'Active',
                    must_change_password BIT DEFAULT 1,
                    failed_login_attempts INT DEFAULT 0,
                    lockout_until DATETIMEOFFSET,
                    last_login DATETIMEOFFSET,
                    created_by INT,
                    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
                    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
                );
                print '✅ Users table created.';
            END
            ELSE
            BEGIN
                print 'ℹ️ Users table already exists.';
            END
        `);

        console.log('\n--- Step 3: Seeding Admin User ---');
        const adminCheck = await pool.request().query("SELECT id FROM Users WHERE username = 'admin'");
        if (adminCheck.recordset.length === 0) {
            const passwordHash = await bcrypt.hash('Admin@123', 10);
            const roleResult = await pool.request().query("SELECT id FROM UserRoles WHERE name = 'Admin'");
            const adminRoleId = roleResult.recordset[0].id;

            await pool.request()
                .input('username', sql.NVarChar, 'admin')
                .input('password', sql.NVarChar, passwordHash)
                .input('fullName', sql.NVarChar, 'System Administrator')
                .input('email', sql.NVarChar, 'admin@soleos.com')
                .input('roleId', sql.Int, adminRoleId)
                .query(`
                    INSERT INTO Users (username, password_hash, full_name, email, role_id, must_change_password, status)
                    VALUES (@username, @password, @fullName, @email, @roleId, 0, 'Active')
                `);
            console.log('✅ Admin user (admin / Admin@123) created in HRMS.');
        } else {
            console.log('ℹ️ Admin user already exists in HRMS.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateDatabase();

/**
 * Migration: Add jti column to RefreshTokens for fast indexed lookup.
 * Run once: node add-jti-column.js
 */
require('dotenv').config();
const { getAdminConnection } = require('../config/adminDatabase');

async function run() {
    try {
        const pool = await getAdminConnection();
        
        // Step 1: Add column if not exists
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'RefreshTokens' AND COLUMN_NAME = 'jti'
            )
            BEGIN
                ALTER TABLE RefreshTokens ADD jti NVARCHAR(50) NULL;
                PRINT 'jti column added.';
            END
            ELSE
            BEGIN
                PRINT 'jti column already exists.';
            END
        `);

        // Step 2: Add index if not exists
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes 
                WHERE name = 'IX_RefreshTokens_jti' AND object_id = OBJECT_ID('RefreshTokens')
            )
            BEGIN
                CREATE NONCLUSTERED INDEX IX_RefreshTokens_jti 
                ON RefreshTokens(jti) 
                WHERE jti IS NOT NULL;
                PRINT 'Index IX_RefreshTokens_jti created.';
            END
            ELSE
            BEGIN
                PRINT 'Index already exists.';
            END
        `);
        
        console.log('✅ Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

run();

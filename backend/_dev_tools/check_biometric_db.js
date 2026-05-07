const sql = require('mssql');
require('dotenv').config({ path: 'c:/hr-employee/backend/.env' });

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function checkDb() {
    try {
        await sql.connect(config);
        
        const result = {
            tables: [],
            biometricIdExists: false,
            indexes: [],
            viewExists: false,
            spExists: false
        };

        const tables = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('biometric_devices', 'biometric_logs')");
        result.tables = tables.recordset.map(r => r.table_name);

        const cols = await sql.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Employees' AND column_name = 'BiometricId'");
        result.biometricIdExists = cols.recordset.length > 0;

        const indexes = await sql.query("SELECT i.name AS index_name FROM sys.indexes i JOIN sys.tables t ON i.object_id = t.object_id WHERE t.name = 'biometric_logs'");
        result.indexes = indexes.recordset.map(r => r.index_name);

        const views = await sql.query("SELECT table_name FROM information_schema.views WHERE table_name = 'vw_employee_biometric_attendance'");
        result.viewExists = views.recordset.length > 0;

        const sps = await sql.query("SELECT routine_name FROM information_schema.routines WHERE routine_type = 'PROCEDURE' AND routine_name = 'sp_ProcessBiometricLogs'");
        result.spExists = sps.recordset.length > 0;

        console.log("=== DB RESULT ===");
        console.log(JSON.stringify(result, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkDb();

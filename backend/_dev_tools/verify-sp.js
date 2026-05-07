require('dotenv').config();
const sql = require('mssql');
const config = {
    server: process.env.DB_SERVER, database: process.env.DB_DATABASE,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || 1433),
    options: { trustServerCertificate: true }
};
sql.connect(config)
    .then(pool => pool.request().query("SELECT name, create_date FROM sys.objects WHERE object_id = OBJECT_ID('sp_ProcessBiometricLogs') AND type = 'P'"))
    .then(r => {
        if (r.recordset.length > 0) {
            console.log('SP EXISTS:', JSON.stringify(r.recordset[0]));
        } else {
            console.log('SP NOT FOUND');
        }
        process.exit(0);
    })
    .catch(e => { console.error('ERROR:', e.message); process.exit(1); });

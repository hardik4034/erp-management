const jwt = require('jsonwebtoken');

// Ensure we have a user in solar_invest to match
const mssql = require('mssql');
require('dotenv').config({ path: 'd:\\hr-employee\\hr-employee\\backend\\.env' });

const config = {
    server: process.env.DB_SERVER,
    database: process.env.ADMIN_DB_DATABASE || 'solar_invest',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    },
    user: process.env.ADMIN_DB_USER || process.env.DB_USER,
    password: process.env.ADMIN_DB_PASSWORD || process.env.DB_PASSWORD
};

async function testToken() {
    try {
        const pool = await mssql.connect(config);
        const userRes = await pool.request().query('SELECT TOP 1 id, username, email FROM users WHERE status = \'Active\'');
        
        if (userRes.recordset.length === 0) {
            console.log('No active users found in solar_invest. dbo.users');
            process.exit(1);
        }

        const user = userRes.recordset[0];
        console.log(`Testing with user ${user.username} (ID: ${user.id})`);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: 'admin', email: user.email }, 
            'development_secret_key', 
            { expiresIn: '1h' }
        );

        console.log(`Generated Token: ${token}`);

        // now make a request
        const res = await fetch('http://localhost:5000/api/employees', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        console.log('Response Status:', res.status);
        console.log('Response Items Length:', data.data ? data.data.length : 'none');
        console.log('Response Data sample:', data.data ? data.data.slice(0, 1) : data);
        
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
testToken();

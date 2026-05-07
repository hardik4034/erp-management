/**
 * Inspect payroll stored procedures to see their actual parameters and definition.
 */
const { getConnection } = require('../config/database');

async function inspectProcs() {
    try {
        const pool = await getConnection();

        // 1. Get parameters of sp_GeneratePayrollBulk
        console.log('\n=== sp_GeneratePayrollBulk PARAMETERS ===');
        const bulkParams = await pool.request().query(`
            SELECT p.name AS ParameterName, t.name AS DataType, p.max_length, p.is_output
            FROM sys.procedures pr
            JOIN sys.parameters p ON pr.object_id = p.object_id
            JOIN sys.types t ON p.user_type_id = t.user_type_id
            WHERE pr.name = 'sp_GeneratePayrollBulk'
            ORDER BY p.parameter_id
        `);
        console.table(bulkParams.recordset);

        // 2. Get parameters of sp_GeneratePayroll
        console.log('\n=== sp_GeneratePayroll PARAMETERS ===');
        const singleParams = await pool.request().query(`
            SELECT p.name AS ParameterName, t.name AS DataType, p.max_length, p.is_output
            FROM sys.procedures pr
            JOIN sys.parameters p ON pr.object_id = p.object_id
            JOIN sys.types t ON p.user_type_id = t.user_type_id
            WHERE pr.name = 'sp_GeneratePayroll'
            ORDER BY p.parameter_id
        `);
        console.table(singleParams.recordset);

        // 3. Check SET options on the procedures (QUOTED_IDENTIFIER issue)
        console.log('\n=== SET OPTIONS for payroll procedures ===');
        const setOpts = await pool.request().query(`
            SELECT name, uses_quoted_identifier, uses_ansi_nulls
            FROM sys.sql_modules sm
            JOIN sys.procedures pr ON sm.object_id = pr.object_id
            WHERE pr.name IN ('sp_GeneratePayroll', 'sp_GeneratePayrollBulk')
        `);
        console.table(setOpts.recordset);

        // 4. Get full definition of sp_GeneratePayrollBulk
        console.log('\n=== sp_GeneratePayrollBulk DEFINITION ===');
        const bulkDef = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('sp_GeneratePayrollBulk')) AS Definition
        `);
        if (bulkDef.recordset[0]) {
            console.log(bulkDef.recordset[0].Definition);
        }

        // 5. Get full definition of sp_GeneratePayroll
        console.log('\n=== sp_GeneratePayroll DEFINITION ===');
        const singleDef = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('sp_GeneratePayroll')) AS Definition
        `);
        if (singleDef.recordset[0]) {
            console.log(singleDef.recordset[0].Definition);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

inspectProcs();

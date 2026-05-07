const { getConnection } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createHolidaySPs() {
    try {
        console.log('📝 Reading holiday stored procedures SQL file...');
        const sqlFile = path.join(__dirname, '..', 'database', 'holiday-stored-procedures.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log('🔌 Connecting to database...');
        const pool = await getConnection();

        // Split by GO statements (handles \r\n and \n)
        const batches = sqlContent
            .split(/\r?\nGO\r?\n/gi)
            .map(b => b.trim())
            .filter(b => b.length > 0 && !b.startsWith('--'));

        console.log(`📦 Executing ${batches.length} SQL batches...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            if (batch) {
                console.log(`  ⚙️  Batch ${i + 1}/${batches.length}...`);
                try {
                    await pool.request().query(batch);
                    console.log(`  ✅ Batch ${i + 1} done`);
                } catch (err) {
                    console.error(`  ❌ Batch ${i + 1} error:`, err.message);
                }
            }
        }

        console.log('✅ Holiday stored procedures setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createHolidaySPs();

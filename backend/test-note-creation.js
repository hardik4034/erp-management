const { getConnection, sql } = require('./config/database');

async function testNoteCreation() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        console.log('\n📋 Testing sp_CreateNote...');
        
        // Test creating a note
        const result = await pool.request()
            .input('EmployeeId', sql.Int, 2)
            .input('Title', sql.NVarChar(100), 'Test Note')
            .input('Description', sql.NVarChar(sql.MAX), 'This is a test note')
            .execute('sp_CreateNote');
        
        console.log('✅ Note created successfully!');
        console.log('   NoteId:', result.recordset[0].NoteId);
        
        console.log('\n📋 Fetching all notes...');
        const notesResult = await pool.request()
            .input('EmployeeId', sql.Int, null)
            .execute('sp_GetAllNotes');
        
        console.log(`✅ Found ${notesResult.recordset.length} notes total`);
        notesResult.recordset.forEach(note => {
            console.log(`   - ${note.Title} (by ${note.FirstName} ${note.LastName})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testNoteCreation();

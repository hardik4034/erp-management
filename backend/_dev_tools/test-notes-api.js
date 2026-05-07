const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testNotesAPI() {
    try {
        console.log('--- Testing Refined Notes Management API ---');

        // 1. Setup: Get a valid EmployeeId
        console.log('Fetching employees...');
        const empResponse = await axios.get(`${API_BASE}/employees`);
        const employees = empResponse.data.data;
        if (employees.length === 0) return console.error('No employees found.');
        const testEmployeeId = employees[0].EmployeeId;
        const otherEmployeeId = employees[1]?.EmployeeId || testEmployeeId + 1;

        // 2. Test: Create Note with Auto-Visibility (Salary Discussion -> HR Only)
        console.log('\nTesting Auto-Visibility (Salary Discussion)...');
        const salaryNote = {
            employeeId: testEmployeeId,
            noteType: 'Salary Discussion',
            description: 'Confidential salary discussion'
        };
        const salaryRes = await axios.post(`${API_BASE}/notes`, salaryNote, {
            headers: { 'x-employee-id': testEmployeeId, 'x-user-role': 'hr' }
        });
        const salaryNoteId = salaryRes.data.data.noteId;
        console.log(`✅ Salary Note created with ID: ${salaryNoteId}`);

        // 3. Test: RBAC (Employee should NOT see Salary Note)
        console.log('\nTesting RBAC (Employee Visibility)...');
        const empViewRes = await axios.get(`${API_BASE}/notes`, {
            headers: { 'x-employee-id': testEmployeeId, 'x-user-role': 'employee' }
        });
        const visibleToEmp = empViewRes.data.data.find(n => n.NoteId === salaryNoteId);
        if (!visibleToEmp) {
            console.log('✅ RBAC Success: Employee cannot see confidential salary note.');
        } else {
            console.error('❌ RBAC Failure: Employee CAN see confidential salary note.');
        }

        // 4. Test: Create Note for Employee to see (Performance -> HR + Employee)
        console.log('\nTesting Employee Visibility (Performance)...');
        const perfNote = {
            employeeId: testEmployeeId,
            noteType: 'Performance',
            description: 'Employee visibility test note'
        };
        const perfRes = await axios.post(`${API_BASE}/notes`, perfNote, {
            headers: { 'x-user-role': 'hr' }
        });
        const perfNoteId = perfRes.data.data.noteId;
        
        const empViewRes2 = await axios.get(`${API_BASE}/notes`, {
            headers: { 'x-employee-id': testEmployeeId, 'x-user-role': 'employee' }
        });
        if (empViewRes2.data.data.find(n => n.NoteId === perfNoteId)) {
            console.log('✅ RBAC Success: Employee can see their performance note.');
        } else {
            console.error('❌ RBAC Failure: Employee CANNOT see their performance note.');
        }

        // 5. Test: Dashboard Summary
        console.log('\nTesting Dashboard Summary...');
        const summaryRes = await axios.get(`${API_BASE}/notes/summary`, {
            headers: { 'x-user-role': 'hr' }
        });
        const summary = summaryRes.data.data;
        console.log(`✅ Summary received: Total=${summary.TotalNotes}, Warnings=${summary.TotalWarnings}, Appreciations=${summary.TotalAppreciations}`);

        // Cleanup
        console.log('\nCleaning up test notes...');
        await axios.delete(`${API_BASE}/notes/${salaryNoteId}`);
        await axios.delete(`${API_BASE}/notes/${perfNoteId}`);
        console.log('✅ Cleanup complete.');

        console.log('\n--- Refined API Test Completed Successfully ---');
    } catch (error) {
        console.error('❌ API Test Failed:', error.response ? error.response.data : error.message);
    }
}

testNotesAPI();

const axios = require('axios');
(async () => {
    try {
        console.log('🧪 Testing Timesheet and Calendar APIs...');
        
        // 1. Test Calendar GET
        console.log('Testing GET /api/calendar...');
        const calRes = await axios.get('http://localhost:5000/api/calendar?startDate=2026-03-01&endDate=2026-03-31');
        console.log(`✅ Calendar GET Success: ${calRes.data.count} events found.`);
        
        // 2. Test Timesheet GET
        console.log('Testing GET /api/timesheet...');
        const tsRes = await axios.get('http://localhost:5000/api/timesheet');
        console.log(`✅ Timesheet GET Success: ${tsRes.data.count} timesheets found.\nAll endpoints verified successfully!`);
        
    } catch (e) {
        console.error('❌ API Test Failed:', e.response ? e.response.data : e.message);
    }
})();

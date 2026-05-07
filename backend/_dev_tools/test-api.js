// Test the payroll API endpoint directly
const http = require('http');

function testPayrollAPI() {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/payroll',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-role': 'admin'
        }
    };

    console.log('Testing GET /api/payroll...\n');

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Headers:', JSON.stringify(res.headers, null, 2));
            console.log('\nResponse Body:');
            
            try {
                const jsonData = JSON.parse(data);
                console.log(JSON.stringify(jsonData, null, 2));
                
                if (jsonData.success && jsonData.data) {
                    console.log(`\n✅ Success! Found ${jsonData.data.length} payroll records`);
                    if (jsonData.data.length > 0) {
                        console.log('\nFirst record:');
                        console.log(JSON.stringify(jsonData.data[0], null, 2));
                    }
                } else {
                    console.log('\n❌ API returned success=false or no data');
                }
            } catch (e) {
                console.log('Raw response:', data);
                console.log('\n❌ Failed to parse JSON:', e.message);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request failed:', error.message);
    });

    req.end();
}

// Wait a moment for server to be ready
setTimeout(testPayrollAPI, 1000);

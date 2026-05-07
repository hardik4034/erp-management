const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing Login with valid credentials...');
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'adminpassword'
        });

        if (response.data.success) {
            console.log('✅ Login Successful!');
            console.log('Token:', response.data.accessToken.substring(0, 20) + '...');
            console.log('User Role:', response.data.user.role);

            const token = response.data.accessToken;

            console.log('\nTesting /api/auth/me with token...');
            const meResponse = await axios.get('http://localhost:5000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (meResponse.data.success) {
                console.log('✅ /me endpoint matched user:', meResponse.data.user.username);
            }
        }
    } catch (error) {
        console.error('❌ Login Failed:', error.response ? error.response.data : error.message);
    }
}

testLogin();

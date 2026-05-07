const authService = require('../services/authService');
const userService = require('../services/userService');
const { getAdminConnection } = require('../config/adminDatabase');

const args = process.argv.slice(2);

if (args.length < 5) {
    console.log('❌ Missing arguments.');
    console.log('Usage: node create-user-admin.js <username> <password> <fullName> <email> <role_id>');
    console.log('Role IDs: 1 (Admin), 5 (HR), 6 (Manager), 7 (Employee)');
    console.log('Example: node create-user-admin.js jdoe password123 "John Doe" john@example.com 7');
    process.exit(1);
}

const [username, password, fullName, email, roleId] = args;

async function run() {
    try {
        console.log(`⏳ Creating user: ${username}...`);
        
        // Hash password just like the controller does
        const passwordHash = await authService.hashData(password);
        
        const userId = await userService.createUser({
            username: username,
            passwordHash: passwordHash,
            fullName: fullName,
            email: email,
            roleId: parseInt(roleId, 10)
        }, 1); // setting "createdBy" to 1 (Admin)

        console.log(`✅ Success! Created user '${username}' with ID ${userId}`);
        
        // Let's also verify it saved properly
        const createdUser = await userService.getUserByUsername(username);
        console.log(`📋 Verified details:` );
        console.log({
            ID: createdUser.id,
            Username: createdUser.username,
            Role: createdUser.role_name,
            Email: createdUser.email
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create user:', error.message);
        if (error.message.includes('UNIQUE KEY')) {
            console.error('This username or email is already taken in the solara_admin database!');
        }
        process.exit(1);
    }
}

// Let's connect and execute
run();

async function testLogin(email, password, expectedRole, profilePath) {
    const url = "http://127.0.0.1:5000/api/auth/login";
    try {
        const loginResponse = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (!loginResponse.ok) {
            const errText = await loginResponse.text();
            console.error(`❌ Failed to login for ${email}: Status ${loginResponse.status} - ${errText}`);
            return false;
        }

        const data = await loginResponse.json();
        const token = data.token;
        const user = data.user;

        console.log(`✅ Login response status: ${loginResponse.status}`);
        console.log(`✅ Logged in as: ${user.name} (${user.email}) - Role: ${user.role}`);

        if (user.role !== expectedRole) {
            console.error(`❌ Expected role ${expectedRole}, but got ${user.role}`);
            return false;
        }

        // Test profile path
        const profileUrl = `http://127.0.0.1:5000${profilePath}`;
        const profileResponse = await fetch(profileUrl, {
            method: "GET",
            headers: {
                "Authorization": token
            }
        });

        if (!profileResponse.ok) {
            const errText = await profileResponse.text();
            console.error(`❌ Failed to fetch profile from ${profilePath}: Status ${profileResponse.status} - ${errText}`);
            return false;
        }

        const profileData = await profileResponse.json();
        console.log(`✅ Profile fetched successfully from ${profilePath}!`);
        return true;

    } catch (err) {
        console.error(`❌ Error during login test for ${email}:`, err);
        return false;
    }
}

async function runTests() {
    console.log("=== Testing Logins ===");
    
    // 1. Admin
    console.log("\n--- Testing Admin Login ---");
    const adminOk = await testLogin("admin@wedlens.com", "admin123", "admin", "/api/admin/profile");

    // 2. Photographer
    console.log("\n--- Testing Photographer Login ---");
    const photographerOk = await testLogin("photographer@test.com", "photographer123", "photographer", "/api/photographer/profile");

    // 3. Client
    console.log("\n--- Testing Client Login ---");
    const clientOk = await testLogin("client@test.com", "client123", "client", "/api/client/profile");

    console.log("\n=== Test Summary ===");
    console.log(`Admin Login:        ${adminOk ? "PASS" : "FAIL"}`);
    console.log(`Photographer Login: ${photographerOk ? "PASS" : "FAIL"}`);
    console.log(`Client Login:       ${clientOk ? "PASS" : "FAIL"}`);
}

runTests();

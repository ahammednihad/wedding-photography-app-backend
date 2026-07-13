// Using global fetch available in Node.js v18+

async function runResetTest() {
    const baseUrl = "http://127.0.0.1:5000/api/auth";
    const email = "client@test.com";

    console.log("=== Testing Forgot/Reset Password Flow ===");

    // Step 1: Request Password Reset
    console.log("\n1. Requesting password reset for:", email);
    const forgotRes = await fetch(`${baseUrl}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });

    if (!forgotRes.ok) {
        console.error("❌ Forgot Password request failed:", await forgotRes.text());
        return;
    }

    const forgotData = await forgotRes.json();
    console.log("✅ Forgot Password request succeeded:", forgotData.message);

    // Get resetUrl from response
    const resetUrl = forgotData.resetUrl;
    if (!resetUrl) {
        console.error("❌ Reset URL not found in response. Verify console logs or fallback handler.");
        return;
    }
    console.log("✅ Recovered Reset URL:", resetUrl);

    // Extract token
    const token = resetUrl.split("/").pop();
    console.log("✅ Extracted reset token:", token);

    // Step 2: Reset Password
    const newPassword = "NewPassword123";
    console.log("\n2. Resetting password using token...");
    const resetRes = await fetch(`${baseUrl}/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
    });

    if (!resetRes.ok) {
        console.error("❌ Reset Password request failed:", await resetRes.text());
        return;
    }

    const resetData = await resetRes.json();
    console.log("✅ Reset Password request succeeded:", resetData.message);

    // Step 3: Test Login with New Password
    console.log("\n3. Testing login with new password...");
    const loginNewRes = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword })
    });

    if (loginNewRes.ok) {
        console.log("✅ Login with new password: SUCCESS");
    } else {
        console.error("❌ Login with new password: FAILED", await loginNewRes.text());
    }

    // Step 4: Clean up (Reset password back to original client123)
    console.log("\n4. Restoring original password (client123)...");
    const restoreForgotRes = await fetch(`${baseUrl}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    const restoreForgotData = await restoreForgotRes.json();
    const restoreToken = restoreForgotData.resetUrl.split("/").pop();

    const restoreResetRes = await fetch(`${baseUrl}/reset-password/${restoreToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "client123" })
    });
    if (restoreResetRes.ok) {
        console.log("✅ Restored original password: SUCCESS");
    } else {
        console.error("❌ Restored original password: FAILED");
    }
}

runResetTest();

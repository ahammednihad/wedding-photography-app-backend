const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./app/models/user-model");
require("dotenv").config();
const configureDB = require("./app/config/db");

const resetPasswords = async () => {
    try {
        await configureDB();

        const defaultPassword = "Password123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Update all users who don't have a known password or reset all users to "Password123"
        // Let's reset all of the main users in the database to Password123 so the user can easily access them!
        const users = await User.find({});
        console.log(`Found ${users.length} users to update password to "${defaultPassword}"`);

        for (const user of users) {
            user.passwordHash = hashedPassword;
            // Also ensure they are approved and active
            user.isApproved = true;
            user.isActive = true;
            await user.save();
            console.log(`Updated password, active & approved status for: ${user.email} (${user.role})`);
        }

        console.log("Password reset completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error resetting passwords:", err);
        process.exit(1);
    }
};

resetPasswords();

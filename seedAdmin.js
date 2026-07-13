// Run this script once to generate your initial Admin credentials:
// node seedAdmin.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./app/models/user-model");
require("dotenv").config();
const configureDB = require("./app/config/db");

const seedAdmin = async () => {
    try {
        await configureDB();

        const existingAdmin = await User.findOne({ email: "admin@wedlens.com" });
        if (existingAdmin) {
            console.log("Admin already exists! You can login with admin@wedlens.com");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash("admin123", 10);

        const adminUser = new User({
            name: "WedLens Admin",
            email: "admin@wedlens.com",
            passwordHash: hashedPassword,
            role: "admin",
            isApproved: true,
            isActive: true
        });

        await adminUser.save();
        console.log("Admin account successfully created!");
        console.log("-----------------------------------------");
        console.log("Email: admin@wedlens.com");
        console.log("Password: admin123");
        console.log("-----------------------------------------");
        process.exit(0);
    } catch (err) {
        console.error("Error creating admin:", err);
        process.exit(1);
    }
};

seedAdmin();

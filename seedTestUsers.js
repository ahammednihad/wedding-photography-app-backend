const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./app/models/user-model");
require("dotenv").config();
const configureDB = require("./app/config/db");

const seedTestUsers = async () => {
    try {
        await configureDB();

        // 1. Admin
        const adminEmail = "admin@wedlens.com";
        const adminPassword = "admin123";
        const adminHash = await bcrypt.hash(adminPassword, 10);
        await User.findOneAndUpdate(
            { email: adminEmail },
            {
                name: "WedLens Admin",
                passwordHash: adminHash,
                role: "admin",
                isApproved: true,
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log(`Admin account ensured: ${adminEmail} / ${adminPassword}`);

        // 2. Photographer
        const photographerEmail = "photographer@test.com";
        const photographerPassword = "photographer123";
        const photographerHash = await bcrypt.hash(photographerPassword, 10);
        await User.findOneAndUpdate(
            { email: photographerEmail },
            {
                name: "Test Photographer",
                passwordHash: photographerHash,
                role: "photographer",
                isApproved: true,
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log(`Photographer account ensured: ${photographerEmail} / ${photographerPassword}`);

        // 3. Client
        const clientEmail = "client@test.com";
        const clientPassword = "client123";
        const clientHash = await bcrypt.hash(clientPassword, 10);
        await User.findOneAndUpdate(
            { email: clientEmail },
            {
                name: "Test Client",
                passwordHash: clientHash,
                role: "client",
                isApproved: true,
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log(`Client account ensured: ${clientEmail} / ${clientPassword}`);

        process.exit(0);
    } catch (err) {
        console.error("Error seeding test users:", err);
        process.exit(1);
    }
};

seedTestUsers();

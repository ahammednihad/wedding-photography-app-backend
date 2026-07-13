const mongoose = require("mongoose");
const User = require("./app/models/user-model");
require("dotenv").config();
const configureDB = require("./app/config/db");

const query = async () => {
    try {
        await configureDB();
        const users = await User.find({}, { name: 1, email: 1, role: 1, isApproved: 1, isActive: 1 });
        console.log("USERS_LIST_START");
        console.log(JSON.stringify(users, null, 2));
        console.log("USERS_LIST_END");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

query();

const mongoose = require("mongoose");

const configureDB = async () => {
  try {
    const dbUrl = process.env.DB_URL || process.env.MONGODB_URI;
    if (!dbUrl) {
      throw new Error("Database URL is not defined in environment variables (DB_URL / MONGODB_URI)");
    }
    await mongoose.connect(dbUrl);
    console.log("connected to db");
  } catch (err) {
    console.error("db connection failed", err);
  }
};

module.exports = configureDB;

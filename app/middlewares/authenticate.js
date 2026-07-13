const jwt = require("jsonwebtoken");
const User = require("../models/user-model");

const authenticateUser = async (req, res, next) => {
    // Accept token with or without "Bearer " prefix (frontend sends token directly)
    let token = req.headers["authorization"];
    if (!token) {
        return res.status(401).json({ error: "Token not provided" });
    }
    // Remove "Bearer " prefix if present, otherwise use token as-is
    if (token.startsWith("Bearer ")) {
        token = token.slice(7);
    }

    try {
        const tokenData = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB to verify if active/existent
        const user = await User.findById(tokenData.userId);
        if (!user) {
            return res.status(401).json({ error: "User account no longer exists" });
        }
        if (!user.isActive) {
            return res.status(403).json({ error: "Your account is deactivated. Please contact support." });
        }

        req.userId = tokenData.userId;
        req.user = user; // Ensure req.user has full DB details
        req.role = tokenData.role;

        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = authenticateUser;

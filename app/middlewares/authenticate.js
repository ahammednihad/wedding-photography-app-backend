const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
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

        req.userId = tokenData.userId;
        req.user = { _id: tokenData.userId }; // Ensure req.user exists for controllers
        req.role = tokenData.role;

        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = authenticateUser;

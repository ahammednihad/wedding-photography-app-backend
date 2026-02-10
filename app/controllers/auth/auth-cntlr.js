const User = require("../../models/user-model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
    authRegisterValidationSchema,
    userLoginValidationSchema
} = require("../../validations/user-validation");

const authCntlr = {};

/* ================= REGISTER ================= */
authCntlr.register = async (req, res) => {
    const { error, value } = authRegisterValidationSchema.validate(req.body, {
        abortEarly: false
    });

    if (error) {
        const message = error.details.map((d) => d.message).join("; ");
        return res.status(400).json({ error: message });
    }

    try {
        console.log('Registration request received:', value);
        const existingUser = await User.findOne({ email: value.email });
        console.log('Existing user check complete:', existingUser ? 'User exists' : 'No existing user');
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(value.password, 10);
        const user = new User({
            name: value.name,
            email: value.email,
            passwordHash: hashedPassword,
            role: value.role,
            isApproved: true, // TEMPORARY: Auto-approve all users for easier testing
            isActive: true
        });
        await user.save();

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(201).json({
            token,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isApproved: user.isApproved
            }
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

/* ================= LOGIN ================= */
authCntlr.login = async (req, res) => {
    const { error, value } = userLoginValidationSchema.validate(req.body, {
        abortEarly: false
    });

    if (error) {
        const message = error.details.map((d) => d.message).join("; ");
        return res.status(400).json({ error: message });
    }

    try {
        const user = await User.findOne({ email: value.email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(
            value.password,
            user.passwordHash
        );

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // TEMPORARY: Allow unapproved photographers to login for testing
        // if (user.role === 'photographer' && !user.isApproved) {
        //     return res.status(403).json({ error: "Your account is pending admin approval. Please check back later." });
        // }

        if (!user.isActive) {
            return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(200).json({
            token,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isApproved: user.isApproved
            }
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

module.exports = authCntlr;

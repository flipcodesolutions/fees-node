"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.changePassword = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("../models/userModel");
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";
/**
 * Handles user login.
 * Verifies username and password, then generates and returns a JWT token.
 */
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        // Fetch user details using the UserModel
        const user = await userModel_1.UserModel.findByUsername(username);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Compare pre-hashed passwords
        const isMatch = await bcryptjs_1.default.compare(password, user.password || "");
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Sign session token valid for 1 day
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1d" });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.login = login;
/**
 * Handles changing password for a logged-in user.
 * Validates old password and hashes the new one before updating database.
 */
const changePassword = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    let userId = req.user?.id;
    try {
        let user;
        // Retrieve user by ID (if authenticated) or username
        if (userId) {
            user = await userModel_1.UserModel.findById(Number(userId));
        }
        else if (username) {
            user = await userModel_1.UserModel.findByUsername(username);
        }
        if (!user || user.id === undefined) {
            return res.status(404).json({ message: "User not found" });
        }
        userId = user.id;
        // Verify old password
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password || "");
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect old password" });
        }
        // Encrypt the new password and update the DB
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await userModel_1.UserModel.updatePassword(userId, hashedPassword);
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.changePassword = changePassword;
/**
 * Gets profile details for the currently logged-in user.
 */
const getProfile = async (req, res) => {
    const userId = req.user?.id;
    try {
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Fetch user details excluding password hash using the UserModel
        const user = await userModel_1.UserModel.getProfileById(Number(userId));
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getProfile = getProfile;

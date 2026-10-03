import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";

/**
 * Handles user login.
 * Verifies username and password, then generates and returns a JWT token.
 */
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Fetch user details using the UserModel
    const user = await UserModel.findByUsername(username);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare pre-hashed passwords
    const isMatch = await bcrypt.compare(password, user.password || "");

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Sign session token valid for 1 day
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Handles changing password for a logged-in user.
 * Validates old password and hashes the new one before updating database.
 */
export const changePassword = async (req: Request, res: Response) => {
  const { username, oldPassword, newPassword } = req.body;
  let userId = (req as any).user?.id;

  try {
    let user;

    // Retrieve user by ID (if authenticated) or username
    if (userId) {
      user = await UserModel.findById(Number(userId));
    } else if (username) {
      user = await UserModel.findByUsername(username);
    }

    if (!user || user.id === undefined) {
      return res.status(404).json({ message: "User not found" });
    }

    userId = user.id;

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect old password" });
    }

    // Encrypt the new password and update the DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(userId, hashedPassword);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Gets profile details for the currently logged-in user.
 */
export const getProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch user details excluding password hash using the UserModel
    const user = await UserModel.getProfileById(Number(userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

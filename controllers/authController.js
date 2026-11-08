/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */

import bcrypt from "bcrypt";
import { User, Role } from "../models/associations.js";

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Valid name, email, and password (minimum 8 characters) required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await User.findOne({
      where: { email: cleanEmail }
    });

    if (existing) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword
    });

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Registration failed"
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Email and password required"
      });
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
      include: [{
        model: Role,
        as: "roles",
        attributes: ["id", "role_name"],
        through: { attributes: [] }
      }]
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (!req.session) {
      return res.status(500).json({
        message: "Session is not configured"
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        return res.status(500).json({
          message: "Login failed"
        });
      }

      req.session.userId = user.id;

      req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).json({
            message: "Login failed"
          });
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles.map(role => role.role_name)
          }
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Login failed"
    });
  }
};

// LOGOUT
export const logout = (req, res) => {
  if (!req.session) {
    return res.status(500).json({
      message: "Session is not configured"
    });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Logout failed"
      });
    }

    res.clearCookie("buildora.sid");
    return res.json({
      message: "Logout successful"
    });
  });
};

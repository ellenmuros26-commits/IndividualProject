
import { User, Role } from "../models/associations.js";

const permissionRoles = {
  "payroll.manage": ["Payroll Officer"]
};

// Check if user is logged in
export const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({
      message: "Please login first"
    });
  }

  next();
};

// Check if user has the required role
export const allowRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          message: "Please login first"
        });
      }

      const user = await User.findByPk(req.session.userId, {
        include: [{
          model: Role,
          as: "roles",
          attributes: ["role_name"],
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return res.status(401).json({
          message: "User not found"
        });
      }

      const userRoles = user.roles.map(
        role => role.role_name
      );

      const allowed = allowedRoles.some(
        role => userRoles.includes(role)
      );

      if (!allowed) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      req.user = user;
      next();

    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({
        message: "Authorization failed"
      });
    }
  };
};

export const allowPermissions = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          message: "Please login first"
        });
      }

      const user = await User.findByPk(req.session.userId, {
        include: [{
          model: Role,
          as: "roles",
          attributes: ["role_name"],
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return res.status(401).json({
          message: "User not found"
        });
      }

      const userRoles = user.roles.map(role => role.role_name);
      const allowed = permissions.some(permission =>
        (permissionRoles[permission] || []).some(role => userRoles.includes(role))
      );

      if (!allowed) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({
        message: "Authorization failed"
      });
    }
  };
};

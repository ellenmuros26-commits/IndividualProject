import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Attendance = sequelize.define("Attendance", {
  worker_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  attendance_date: {
    type: DataTypes.DATEONLY,
    primaryKey: true,
    allowNull: false
  },
  total_work_hours: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  attendance_status: {
    type: DataTypes.ENUM("Present", "Absent", "Late", "Half Day", "On Leave"),
    allowNull: false
  },
  verification_status: {
    type: DataTypes.ENUM("Pending", "Verified", "Rejected"),
    allowNull: false
  }
}, {
  tableName: "attendance",
  timestamps: false
});

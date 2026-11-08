import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const PayrollPeriod = sequelize.define("PayrollPeriod", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  period_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  period_status: {
    type: DataTypes.ENUM("Open", "Processing", "Approved", "Closed"),
    allowNull: false,
    defaultValue: "Open"
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "payroll_periods",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const PayrollRecord = sequelize.define("PayrollRecord", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payroll_period_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  worker_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pay_rate_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_work_hours: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  total_work_days: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  basic_pay: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  overtime_pay: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  allowances: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  total_deductions: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  gross_pay: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  net_pay: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  payroll_status: {
    type: DataTypes.ENUM("Draft", "For Approval", "Approved", "Paid", "Cancelled"),
    allowNull: false,
    defaultValue: "Draft"
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "payroll_records",
  timestamps: false
});

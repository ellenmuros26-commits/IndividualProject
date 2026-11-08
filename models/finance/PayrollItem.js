import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const PayrollItem = sequelize.define("PayrollItem", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payroll_record_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  item_type: {
    type: DataTypes.ENUM("Earning", "Deduction"),
    allowNull: false
  },
  item_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "payroll_items",
  timestamps: false
});

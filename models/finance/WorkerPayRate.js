import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const WorkerPayRate = sequelize.define("WorkerPayRate", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  worker_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pay_type: {
    type: DataTypes.ENUM("Hourly", "Daily", "Monthly"),
    allowNull: false
  },
  pay_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "worker_pay_rates",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

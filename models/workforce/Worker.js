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
  // Firebase doesn't require predefined models.
  // Use Firestore directly in controllers or create helper functions here.
  // Collection name: "worker"

 
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Worker = sequelize.define("Worker", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true
  },

  worker_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },

  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  middle_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  contact_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  employment_type: {
    type: DataTypes.ENUM(
      "Regular",
      "Contractual",
      "Daily"
    ),
    allowNull: false,
    defaultValue: "Daily"
  },

  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  employment_status: {
    type: DataTypes.ENUM(
      "Active",
      "Inactive",
      "Terminated"
    ),
    allowNull: false,
    defaultValue: "Active"
  }

}, {
  tableName: "workers",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

export { sequelize };

import { User } from "./userModel.js";
import { Role } from "./Role.js";
import { UserRole } from "./Userrole.js";
import { Worker } from "./workforce/Worker.js";
import { WorkerPayRate } from "./finance/WorkerPayRate.js";
import { PayrollPeriod } from "./finance/PayrollPeriod.js";
import { Attendance } from "./finance/Attendance.js";
import { PayrollRecord } from "./finance/PayrollRecord.js";
import { PayrollItem } from "./finance/PayrollItem.js";

// One user can have multiple roles
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "user_id",
  otherKey: "role_id",
  as: "roles"
});

// One role can belong to multiple users
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "role_id",
  otherKey: "user_id",
  as: "users"
});

WorkerPayRate.belongsTo(Worker, {
  foreignKey: "worker_id",
  as: "worker"
});

Worker.hasMany(WorkerPayRate, {
  foreignKey: "worker_id",
  as: "payRates"
});

WorkerPayRate.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator"
});

User.hasMany(WorkerPayRate, {
  foreignKey: "created_by",
  as: "createdPayRates"
});

PayrollPeriod.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator"
});

User.hasMany(PayrollPeriod, {
  foreignKey: "created_by",
  as: "createdPayrollPeriods"
});

Attendance.belongsTo(Worker, {
  foreignKey: "worker_id",
  as: "worker"
});

Worker.hasMany(Attendance, {
  foreignKey: "worker_id",
  as: "attendance"
});

PayrollRecord.belongsTo(PayrollPeriod, {
  foreignKey: "payroll_period_id",
  as: "payrollPeriod"
});

PayrollPeriod.hasMany(PayrollRecord, {
  foreignKey: "payroll_period_id",
  as: "payrollRecords"
});

PayrollRecord.belongsTo(Worker, {
  foreignKey: "worker_id",
  as: "worker"
});

Worker.hasMany(PayrollRecord, {
  foreignKey: "worker_id",
  as: "payrollRecords"
});

PayrollRecord.belongsTo(WorkerPayRate, {
  foreignKey: "pay_rate_id",
  as: "payRate"
});

PayrollRecord.hasMany(PayrollItem, {
  foreignKey: "payroll_record_id",
  as: "items"
});

PayrollItem.belongsTo(PayrollRecord, {
  foreignKey: "payroll_record_id",
  as: "payrollRecord"
});

PayrollRecord.belongsTo(User, {
  foreignKey: "approved_by",
  as: "approver"
});

export {
  User,
  Role,
  UserRole,
  Worker,
  WorkerPayRate,
  PayrollPeriod,
  Attendance,
  PayrollRecord,
  PayrollItem
};

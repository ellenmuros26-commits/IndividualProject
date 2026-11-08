
/*
 * MIT License
 *
 * Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
 * Mindoro State University - Philippines
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT.
 */

import express from "express";

import {
  homePage,
  loginPage,
  registerPage,
  forgotPasswordPage,
  dashboardPage
} from "../controllers/homeController.js";

import {
  register,
  login,
  logout
} from "../controllers/authController.js";

import {
  requireAuth,
  allowRoles,
  allowPermissions
} from "../middleware/authMiddleware.js";

import {
  getWorkers,
  getWorker,
  addWorker,
  updateWorker,
  deleteWorker
} from "../controllers/workforce/workercontroller.js";

import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject
} from "../controllers/project-resource/projectcontroller.js";

import {
  listPayRates,
  newPayRate,
  createPayRate,
  editPayRate,
  updatePayRate,
  deletePayRate
} from "../controllers/payroll-finance/payRatesController.js";

import {
  listPayrollPeriods,
  newPayrollPeriod,
  createPayrollPeriod,
  editPayrollPeriod,
  updatePayrollPeriod,
  deletePayrollPeriod,
  changePayrollPeriodStatus
} from "../controllers/payroll-finance/payrollPeriodsController.js";

import {
  generatePayroll,
  listPayrollRecords,
  getPayrollRecord,
  updatePayrollRecord,
  createPayrollItem,
  updatePayrollItem,
  deletePayrollItem
} from "../controllers/payroll-finance/payrollController.js";

const router = express.Router();

// HOME
router.get("/", homePage);

// AUTHENTICATION
router.get("/login", loginPage);
router.get("/register", registerPage);
router.get("/forgot-password", forgotPasswordPage);
router.get("/dashboard", requireAuth, dashboardPage);
router.post("/api/register", register);
router.post("/api/login", login);
router.post("/api/logout", logout);

// USER PROFILE - Logged-in users only
router.get("/api/profile", requireAuth, (req, res) => {
  res.json({
    message: "Authenticated",
    userId: req.session.userId
  });
});

// ADMIN - System Administrator only
router.get(
  "/api/admin",
  allowRoles("System Administrator"),
  (req, res) => {
    res.json({
      message: "Welcome, Admin!"
    });
  }
);

// WORKER - Worker only
router.get(
  "/api/worker",
  allowRoles("Worker"),
  (req, res) => {
    res.json({
      message: "Welcome, Worker!"
    });
  }
);


 // WORKER MANAGEMENT API

// View all workers
router.get(
  "/api/workers",
  allowRoles("System Administrator", "Site Supervisor"),
  getWorkers
);

// View one worker
router.get(
  "/api/workers/:id",
  allowRoles("System Administrator", "Site Supervisor"),
  getWorker
);

// Add a worker
router.post(
  "/api/workers",
  allowRoles("System Administrator", "Site Supervisor"),
  addWorker
);

// Update worker information
router.put(
  "/api/workers/:id",
  allowRoles("System Administrator", "Site Supervisor"),
  updateWorker
);

// Delete a worker - Admin only
router.delete(
  "/api/workers/:id",
  allowRoles("System Administrator"),
  deleteWorker
);


// PROJECT MANAGEMENT API

// View all projects
router.get(
  "/api/projects",
  requireAuth,
  getProjects
);

// View one project
router.get(
  "/api/projects/:id",
  requireAuth,
  getProject
);

// Create project
router.post(
  "/api/projects",
  requireAuth,
  allowRoles("System Administrator", "Project Manager"),
  addProject
);

// Update project
router.put(
  "/api/projects/:id",
  requireAuth,
  allowRoles("System Administrator", "Project Manager"),
  updateProject
);

// Delete project
router.delete(
  "/api/projects/:id",
  requireAuth,
  allowRoles("System Administrator", "Project Manager"),
  deleteProject
);

router.get(
  "/payroll-finance/pay-rates",
  allowPermissions("payroll.manage"),
  listPayRates
);
router.get(
  "/payroll-finance/pay-rates/new",
  allowPermissions("payroll.manage"),
  newPayRate
);
router.post(
  "/payroll-finance/pay-rates",
  allowPermissions("payroll.manage"),
  createPayRate
);
router.get(
  "/payroll-finance/pay-rates/:id/edit",
  allowPermissions("payroll.manage"),
  editPayRate
);
router.post(
  "/payroll-finance/pay-rates/:id/edit",
  allowPermissions("payroll.manage"),
  updatePayRate
);
router.post(
  "/payroll-finance/pay-rates/:id/delete",
  allowPermissions("payroll.manage"),
  deletePayRate
);

router.get(
  "/payroll-finance/periods",
  allowPermissions("payroll.manage"),
  listPayrollPeriods
);
router.get(
  "/payroll-finance/periods/new",
  allowPermissions("payroll.manage"),
  newPayrollPeriod
);
router.post(
  "/payroll-finance/periods",
  allowPermissions("payroll.manage"),
  createPayrollPeriod
);
router.get(
  "/payroll-finance/periods/:id/edit",
  allowPermissions("payroll.manage"),
  editPayrollPeriod
);
router.post(
  "/payroll-finance/periods/:id/edit",
  allowPermissions("payroll.manage"),
  updatePayrollPeriod
);
router.post(
  "/payroll-finance/periods/:id/delete",
  allowPermissions("payroll.manage"),
  deletePayrollPeriod
);
router.post(
  "/payroll-finance/periods/:id/status",
  allowPermissions("payroll.manage"),
  changePayrollPeriodStatus
);
router.post(
  "/payroll-finance/periods/:id/generate",
  allowPermissions("payroll.manage"),
  generatePayroll
);
router.get(
  "/payroll-finance/payroll",
  allowPermissions("payroll.manage"),
  listPayrollRecords
);
router.get(
  "/payroll-finance/payroll/:id",
  allowPermissions("payroll.manage"),
  getPayrollRecord
);
router.post(
  "/payroll-finance/payroll/:id",
  allowPermissions("payroll.manage"),
  updatePayrollRecord
);
router.post(
  "/payroll-finance/payroll/:id/items",
  allowPermissions("payroll.manage"),
  createPayrollItem
);
router.post(
  "/payroll-finance/payroll/:id/items/:itemId/edit",
  allowPermissions("payroll.manage"),
  updatePayrollItem
);
router.post(
  "/payroll-finance/payroll/:id/items/:itemId/delete",
  allowPermissions("payroll.manage"),
  deletePayrollItem
);

export default router;

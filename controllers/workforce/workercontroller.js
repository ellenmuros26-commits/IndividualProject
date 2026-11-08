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

import { Worker } from "../../models/workforce/Worker.js";
import { UniqueConstraintError, ForeignKeyConstraintError } from "sequelize";

// GET ALL WORKERS
export const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.findAll({
      order: [["id", "DESC"]]
    });

    res.json(workers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get workers" });
  }
};

// GET ONE WORKER
export const getWorker = async (req, res) => {
  try {
    const worker = await Worker.findByPk(req.params.id);

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.json(worker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get worker" });
  }
};

// ADD WORKER
export const addWorker = async (req, res) => {
  try {
    const {
      worker_code,
      first_name,
      middle_name,
      last_name,
      contact_number,
      address,
      date_of_birth,
      employment_type,
      hire_date,
      employment_status
    } = req.body;

    if (!worker_code || !first_name || !last_name || !hire_date) {
      return res.status(400).json({
        message: "Worker code, first name, last name and hire date are required"
      });
    }

    const worker = await Worker.create({
      worker_code,
      first_name,
      middle_name,
      last_name,
      contact_number,
      address,
      date_of_birth,
      employment_type,
      hire_date,
      employment_status
    });

    res.status(201).json({
      message: "Worker added successfully",
      worker
    });
  } catch (error) {
    console.error(error);

    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message: "Worker code already exists"
      });
    }

    res.status(500).json({ message: "Failed to add worker" });
  }
};

// UPDATE WORKER
export const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findByPk(req.params.id);

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const allowedFields = [
      "worker_code",
      "first_name",
      "middle_name",
      "last_name",
      "contact_number",
      "address",
      "date_of_birth",
      "employment_type",
      "hire_date",
      "employment_status"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    await worker.update(updates);

    res.json({
      message: "Worker updated successfully",
      worker
    });
  } catch (error) {
    console.error(error);

    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message: "Worker code already exists"
      });
    }

    res.status(500).json({ message: "Failed to update worker" });
  }
};

// DELETE WORKER
export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByPk(req.params.id);

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    await worker.destroy();

    res.json({ message: "Worker deleted successfully" });
  } catch (error) {
    console.error(error);

    if (error instanceof ForeignKeyConstraintError) {
      return res.status(409).json({
        message: "Worker has related records and cannot be deleted"
      });
    }

    res.status(500).json({ message: "Failed to delete worker" });
  }
};

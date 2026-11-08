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
import { Project } from "../../models/project-resource/Project.js";

// GET ALL PROJECTS
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      order: [["id", "DESC"]]
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE PROJECT
export const getProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE PROJECT
export const addProject = async (req, res) => {
  try {
    const {
      project_code,
      project_name,
      description,
      location,
      client_name,
      start_date,
      expected_end_date,
      project_manager_id
    } = req.body;

    if (
      !project_code ||
      !project_name ||
      !start_date ||
      !expected_end_date ||
      !project_manager_id
    ) {
      return res.status(400).json({
        message: "Required project fields are missing"
      });
    }

    const project = await Project.create({
      project_code,
      project_name,
      description,
      location,
      client_name,
      start_date,
      expected_end_date,
      project_manager_id
    });

    res.status(201).json({
      message: "Project added successfully",
      project
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Project code already exists"
      });
    }

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        message: "Project manager does not exist"
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// UPDATE PROJECT
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    const allowedFields = [
      "project_code",
      "project_name",
      "description",
      "location",
      "client_name",
      "start_date",
      "expected_end_date",
      "actual_end_date",
      "project_status",
      "project_manager_id"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    await project.update(updates);

    res.json({
      message: "Project updated successfully",
      project
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Project code already exists"
      });
    }

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        message: "Invalid project manager"
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// DELETE PROJECT
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    await project.destroy();

    res.json({
      message: "Project deleted successfully"
    });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        message: "Cannot delete a project with related records"
      });
    }

    res.status(500).json({ message: error.message });
  }
};
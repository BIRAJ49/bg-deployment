import express from "express";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
} from "../controllers/tasksController.js";

export const tasksRouter = express.Router();

tasksRouter.get("/", listTasks);
tasksRouter.get("/:id", getTask);
tasksRouter.post("/", createTask);
tasksRouter.put("/:id", updateTask);
tasksRouter.patch("/:id", updateTask);
tasksRouter.delete("/:id", deleteTask);

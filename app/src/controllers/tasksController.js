import { dataStore } from "../db.js";

const parseId = (rawId) => {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? null : id;
};

export async function listTasks(req, res, next) {
  try {
    const tasks = await dataStore.listTasks();
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
}

export async function getTask(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "Invalid task id" });
    }
    const task = await dataStore.getTask(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ task });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    const task = await dataStore.createTask({ title, description });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "Invalid task id" });
    }
    const { title, description, completed } = req.body;
    const task = await dataStore.updateTask(id, { title, description, completed });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ task });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "Invalid task id" });
    }
    const deleted = await dataStore.deleteTask(id);
    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

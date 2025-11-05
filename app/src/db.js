import { Pool } from "pg";
import { config } from "./config.js";
import { logger } from "./logger.js";

class InMemoryStore {
  constructor() {
    this.tasks = new Map();
    this.nextId = 1;
    logger.warn("DATABASE_URL not provided. Falling back to in-memory task store.");
  }

  async init() {
    return true;
  }

  async listTasks() {
    return Array.from(this.tasks.values());
  }

  async getTask(id) {
    return this.tasks.get(id) ?? null;
  }

  async createTask({ title, description }) {
    const id = this.nextId++;
    const now = new Date();
    const task = { id, title, description, completed: false, created_at: now, updated_at: now };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id, { title, description, completed }) {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }
    const updated = {
      ...task,
      title: title ?? task.title,
      description: description ?? task.description,
      completed: typeof completed === "boolean" ? completed : task.completed,
      updated_at: new Date()
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id) {
    return this.tasks.delete(id);
  }
}

class PostgresStore {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      statement_timeout: 5000,
      query_timeout: 5000,
      max: Number(process.env.PG_POOL_MAX ?? 10),
      ssl: config.databaseSsl
        ? { rejectUnauthorized: config.databaseSslRejectUnauthorized }
        : false
    });
  }

  async init() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS set_updated_at_trigger ON tasks;
      CREATE TRIGGER set_updated_at_trigger
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    `;

    // Run in a single connection to avoid pool-level timeouts.
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(createTableSQL);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listTasks() {
    const { rows } = await this.pool.query(
      "SELECT id, title, description, completed, created_at, updated_at FROM tasks ORDER BY id ASC"
    );
    return rows;
  }

  async getTask(id) {
    const { rows } = await this.pool.query(
      "SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE id = $1",
      [id]
    );
    return rows[0] ?? null;
  }

  async createTask({ title, description }) {
    const { rows } = await this.pool.query(
      `INSERT INTO tasks (title, description)
       VALUES ($1, $2)
       RETURNING id, title, description, completed, created_at, updated_at`,
      [title, description ?? null]
    );
    return rows[0];
  }

  async updateTask(id, { title, description, completed }) {
    const { rows } = await this.pool.query(
      `UPDATE tasks
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           completed = COALESCE($4, completed)
       WHERE id = $1
       RETURNING id, title, description, completed, created_at, updated_at`,
      [id, title, description, completed]
    );
    return rows[0] ?? null;
  }

  async deleteTask(id) {
    const { rowCount } = await this.pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    return rowCount > 0;
  }
}

export const dataStore = config.databaseUrl ? new PostgresStore(config.databaseUrl) : new InMemoryStore();

export async function initializeDataStore() {
  try {
    await dataStore.init();
    logger.info("Task store initialized");
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize data store");
    throw error;
  }
}

import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { initializeDataStore } from "./db.js";
import { tasksRouter } from "./routes/tasks.js";
import { logger } from "./logger.js";

async function bootstrap() {
  try {
    await initializeDataStore();
  } catch (error) {
    logger.error(error, "Unable to initialize data store. Exiting.");
    process.exit(1);
  }

  const app = express();

  app.use(express.json());
  app.use(
    morgan(config.requestLogFormat, {
      stream: {
        write: (message) => {
          logger.info(message.trim());
        }
      }
    })
  );

  app.get("/", (req, res) => {
    res.json({
      message: "Blue/Green Deployment Demo - Task Service",
      deployment: config.deploymentLabel,
      version: config.version
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      deployment: config.deploymentLabel
    });
  });

  app.get("/version", (req, res) => {
    res.json({
      version: config.version,
      deployment: config.deploymentLabel
    });
  });

  app.use("/tasks", tasksRouter);

  // Generic error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error({ err }, "Unhandled application error");
    res.status(500).json({ error: "Internal Server Error" });
  });

  const server = app.listen(config.port, "0.0.0.0", () => {
    logger.info(
      {
        port: config.port,
        version: config.version,
        deployment: config.deploymentLabel,
        nodeEnv: config.nodeEnv
      },
      "Server started"
    );
  });

  const shutdownSignals = ["SIGINT", "SIGTERM"];
  shutdownSignals.forEach((signal) => {
    process.on(signal, () => {
      logger.info({ signal }, "Received shutdown signal");
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });
  });
}

bootstrap();

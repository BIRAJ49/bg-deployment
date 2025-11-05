import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (config.nodeEnv === "production" ? "info" : "debug"),
  transport:
    config.nodeEnv === "development"
      ? {
          target: "pino-pretty",
          options: {
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        }
      : undefined
});

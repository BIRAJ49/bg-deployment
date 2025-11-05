import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = 3000;
const databaseUrl = process.env.DATABASE_URL ?? "";

const deriveDatabaseSsl = () => {
  const override = process.env.DATABASE_SSL?.toLowerCase();
  if (override === "true") {
    return true;
  }
  if (override === "false") {
    return false;
  }
  return databaseUrl.includes("sslmode=require") || databaseUrl.includes("ssl=true");
};

export const config = {
  port: Number.parseInt(process.env.PORT ?? DEFAULT_PORT, 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  version: process.env.VERSION ?? "blue",
  deploymentLabel: process.env.DEPLOYMENT_LABEL ?? "Blue",
  databaseUrl,
  databaseSsl: deriveDatabaseSsl(),
  databaseSslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  requestLogFormat: process.env.REQUEST_LOG_FORMAT ?? "combined"
};

if (Number.isNaN(config.port)) {
  throw new Error("PORT environment variable must be a number");
}

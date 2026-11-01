import "dotenv/config";
import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { APP_CONFIG, type AppConfig } from "./config/app-config.js";
import { configureApp } from "./configure-app.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);
  configureApp(app, config);
  app.enableShutdownHooks();

  await app.listen(config.port);
  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://localhost:${config.port}/api`);
  if (config.nodeEnv !== "production") logger.log(`Swagger UI: http://localhost:${config.port}/api/docs`);
  if (config.signingProvider === "mock") logger.warn("Mock signing provider: documents are TEST / NOT LEGALLY SIGNED");
}

void bootstrap();

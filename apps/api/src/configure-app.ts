import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { SESSION_COOKIE } from "./common/auth-context.js";
import type { AppConfig } from "./config/app-config.js";

// Shared by main.ts and the e2e tests so both run the same middleware.
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.set("trust proxy", config.trustProxyHops);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cookieParser());
  // API responses contain personal data and change often: never cache them.
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.setGlobalPrefix("api");
  app.enableCors({ origin: config.webBaseUrl, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  if (config.nodeEnv !== "production") {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("AHEU UniDocs API")
        .setDescription(
          "Certificate requests, approval workflow, signing and public verification. " +
            "State-changing requests need the X-CSRF-Token header from GET /api/auth/me.",
        )
        .setVersion("1.0")
        .addCookieAuth(SESSION_COOKIE)
        .build(),
    );
    SwaggerModule.setup("api/docs", app, document);
  }
}

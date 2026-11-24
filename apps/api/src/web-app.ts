import { existsSync } from "node:fs";
import path from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";

// Serves the built React app from the same origin as the API, so the session
// cookie stays first-party and the browser only ever calls relative /api URLs.
export function serveWebApp(app: NestExpressApplication, webDistDir: string): void {
  const indexFile = path.join(webDistDir, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error(`WEB_DIST_DIR does not contain index.html: ${webDistDir}`);
  }

  app.useStaticAssets(webDistDir, { index: false, maxAge: "1h" });

  // Client-side routes (/dashboard, /verify/...) all load index.html; React Router takes over.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isPageRequest = request.method === "GET" && request.accepts("html") === "html";
    if (!isPageRequest || isApiPath(request.path)) {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-cache");
    response.sendFile(indexFile);
  });
}

export function isApiPath(requestPath: string): boolean {
  return requestPath === "/api" || requestPath.startsWith("/api/");
}

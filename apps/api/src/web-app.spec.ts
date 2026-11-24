import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isApiPath, serveWebApp } from "./web-app.js";

@Controller("ping")
class PingController {
  @Get()
  ping(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [PingController] })
class TestModule {}

describe("serveWebApp", () => {
  let app: NestExpressApplication;
  let distDir: string;

  beforeAll(async () => {
    distDir = await mkdtemp(path.join(os.tmpdir(), "unidocs-web-"));
    await writeFile(path.join(distDir, "index.html"), "<!doctype html><title>UniDocs</title>");
    await writeFile(path.join(distDir, "app.js"), "console.log('app');");

    const moduleRef = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix("api");
    serveWebApp(app, distDir);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  });

  it("serves index.html for client-side routes", async () => {
    const response = await request(app.getHttpServer()).get("/verify/abc").set("Accept", "text/html").expect(200);
    expect(response.text).toContain("<title>UniDocs</title>");
  });

  it("serves built static files", async () => {
    const response = await request(app.getHttpServer()).get("/app.js").expect(200);
    expect(response.text).toContain("console.log");
  });

  it("leaves API routes to the API", async () => {
    await request(app.getHttpServer()).get("/api/ping").set("Accept", "text/html").expect(200, { ok: true });
    const missing = await request(app.getHttpServer()).get("/api/missing").set("Accept", "text/html").expect(404);
    expect(missing.text).not.toContain("<title>UniDocs</title>");
  });

  it("refuses a folder without index.html", async () => {
    const emptyDir = await mkdtemp(path.join(os.tmpdir(), "unidocs-empty-"));
    try {
      const moduleRef = await Test.createTestingModule({ imports: [TestModule] }).compile();
      const other = moduleRef.createNestApplication<NestExpressApplication>();
      expect(() => serveWebApp(other, emptyDir)).toThrow(/index\.html/);
      await other.close();
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});

describe("isApiPath", () => {
  it("matches only the /api prefix", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/health")).toBe(true);
    expect(isApiPath("/apiary")).toBe(false);
    expect(isApiPath("/dashboard")).toBe(false);
  });
});

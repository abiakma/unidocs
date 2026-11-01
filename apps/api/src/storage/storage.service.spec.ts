import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppConfig, loadConfig } from "../config/app-config.js";
import { StorageService } from "./storage.service.js";

describe("StorageService", () => {
  let dir: string;
  let storage: StorageService;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "unidocs-storage-"));
    const config: AppConfig = loadConfig({ DATABASE_URL: "postgresql://unused", STORAGE_DIR: dir });
    storage = new StorageService(config);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("saves and reads files with generated names", async () => {
    const relative = await storage.savePdf("signed", Buffer.from("%PDF-test"));
    expect(relative).toMatch(/^signed\/[0-9a-f-]{36}\.pdf$/);
    expect((await storage.read(relative)).toString()).toBe("%PDF-test");
  });

  it.each(["../secret.txt", "../../etc/passwd", "signed/../../x", "/etc/passwd", ""])("refuses path %j", (bad) => {
    expect(() => storage.resolveInside(bad)).toThrow("File not found");
  });

  it("returns 404 for missing files", async () => {
    await expect(storage.read("signed/missing.pdf")).rejects.toThrow("File not found");
  });
});

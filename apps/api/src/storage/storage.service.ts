import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";

export type StorageFolder = "previews" | "signed";

// Stores generated files under STORAGE_DIR. File names are always generated
// server-side, and every read is checked to stay inside the storage directory.
@Injectable()
export class StorageService {
  private readonly baseDir: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.baseDir = config.storageDir;
  }

  async savePdf(folder: StorageFolder, content: Buffer): Promise<string> {
    const relativePath = `${folder}/${randomUUID()}.pdf`;
    const absolutePath = this.resolveInside(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, { flag: "wx" });
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    try {
      return await readFile(this.resolveInside(relativePath));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException("File not found");
    }
  }

  resolveInside(relativePath: string): string {
    const absolutePath = path.resolve(this.baseDir, relativePath);
    const fromBase = path.relative(this.baseDir, absolutePath);
    if (!fromBase || fromBase.startsWith("..") || path.isAbsolute(fromBase)) {
      throw new NotFoundException("File not found");
    }
    return absolutePath;
  }
}

import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../config/app-config.js";
import type {
  StudentAcademicProfile,
  StudentAcademicStatus,
  StudentDataProvider,
  StudentIdentity,
} from "../student-data.types.js";
import { getJsonWithRetry, UpstreamHttpError } from "./http-client.js";

/**
 * Read-only adapter for the official Platonus student API.
 *
 * DISABLED until the university provides official API documentation and credentials.
 * No Platonus endpoint is assumed here: once the documentation is available,
 * implement `fetchStudent` with the documented URL and `mapStudent` with the
 * documented response format. See docs/platonus-integration.md.
 */
@Injectable()
export class PlatonusStudentDataProvider implements StudentDataProvider {
  readonly source = "platonus" as const;
  private readonly logger = new Logger(PlatonusStudentDataProvider.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async getStudentById(externalStudentId: string): Promise<StudentAcademicProfile | null> {
    const raw = await this.fetchStudent(externalStudentId);
    return raw === null ? null : this.mapStudent(raw);
  }

  async getCurrentStudent(identity: StudentIdentity): Promise<StudentAcademicProfile> {
    const student = await this.getStudentById(identity.externalStudentId);
    if (!student) throw new ServiceUnavailableException("Student record is not available in Platonus");
    return student;
  }

  async getStudentAcademicStatus(externalStudentId: string): Promise<StudentAcademicStatus | null> {
    const student = await this.getStudentById(externalStudentId);
    if (!student) return null;
    return {
      externalStudentId,
      educationStatus: student.educationStatus,
      checkedAt: new Date().toISOString(),
      source: this.source,
    };
  }

  private assertConfigured(): { baseUrl: string; token: string } {
    const { apiBaseUrl, apiToken } = this.config.platonus;
    if (!apiBaseUrl || !apiToken) {
      throw new ServiceUnavailableException(
        "Platonus student API is not configured. Official documentation and credentials are required.",
      );
    }
    return { baseUrl: apiBaseUrl, token: apiToken };
  }

  private async fetchStudent(externalStudentId: string): Promise<unknown> {
    const { baseUrl, token } = this.assertConfigured();
    const documentedPath = this.studentPath(externalStudentId);

    try {
      return await getJsonWithRetry(new URL(documentedPath, baseUrl).toString(), {
        timeoutMs: this.config.platonus.apiTimeoutMs,
        maxRetries: this.config.platonus.apiMaxRetries,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (error instanceof UpstreamHttpError && error.status === 404) return null;
      this.logger.warn(`Platonus request failed: ${error instanceof Error ? error.message : "unknown error"}`);
      // Never fall back to stale data: issuing must stop while Platonus is unavailable.
      throw new ServiceUnavailableException("Platonus is temporarily unavailable. Please try again later.");
    }
  }

  // TODO(platonus-docs): replace with the documented student endpoint.
  private studentPath(_externalStudentId: string): string {
    throw new ServiceUnavailableException("Platonus student endpoint is not documented yet");
  }

  // TODO(platonus-docs): map the documented response format to StudentAcademicProfile.
  private mapStudent(_raw: unknown): StudentAcademicProfile {
    throw new ServiceUnavailableException("Platonus response mapping is not implemented yet");
  }
}

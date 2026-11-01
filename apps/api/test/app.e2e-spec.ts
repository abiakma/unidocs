import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "reflect-metadata";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { APP_CONFIG, loadConfig } from "../src/config/app-config.js";
import { configureApp } from "../src/configure-app.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const databaseUrl = inject("e2eDatabaseUrl");

type Agent = ReturnType<typeof request.agent>;

interface Session {
  agent: Agent;
  csrf: string;
  userId: string;
}

describe.skipIf(!databaseUrl)("API end-to-end (mock integrations)", () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let storageDir: string;

  async function login(identity: string): Promise<Session> {
    const agent = request.agent(app.getHttpServer());
    const start = await agent.get("/api/auth/login").expect(302);
    const state = new URL(start.headers.location as string).searchParams.get("state");
    const callback = await agent.get(`/api/auth/callback?code=${identity}&state=${state}`).expect(302);
    expect(callback.headers.location).toBe("http://localhost:5173/dashboard");
    const me = await agent.get("/api/auth/me").expect(200);
    return { agent, csrf: me.body.csrfToken as string, userId: me.body.user.id as string };
  }

  function post(session: Session, url: string, body: object = {}): request.Test {
    return session.agent.post(url).set("X-CSRF-Token", session.csrf).send(body);
  }

  async function submitRequest(student: Session): Promise<string> {
    const response = await post(student, "/api/requests", {
      certificateType: "ENROLLMENT_CERTIFICATE",
      purpose: "EMPLOYMENT",
      language: "RU",
    }).expect(201);
    return response.body.id as string;
  }

  async function approveAll(requestId: string, specialist: Session, accountant: Session, signer: Session): Promise<void> {
    await post(specialist, `/api/staff/requests/${requestId}/approve`).expect(200);
    await post(accountant, `/api/staff/requests/${requestId}/approve`).expect(200);
    const final = await post(signer, `/api/staff/requests/${requestId}/approve`).expect(200);
    expect(final.body.status).toBe("AWAITING_SIGNATURE");
  }

  async function documentIdFor(requestId: string): Promise<string> {
    const document = await prisma.document.findUniqueOrThrow({ where: { requestId } });
    return document.id;
  }

  beforeAll(async () => {
    storageDir = await mkdtemp(path.join(os.tmpdir(), "unidocs-e2e-"));
    const config = loadConfig({
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl ?? "",
      STORAGE_DIR: storageDir,
      WEB_BASE_URL: "http://localhost:5173",
      VERIFICATION_BASE_URL: "http://localhost:5173",
      AUTH_PROVIDER: "mock",
      STUDENT_DATA_PROVIDER: "mock",
      SIGNING_PROVIDER: "mock",
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app, config);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  describe("authentication", () => {
    it("rejects anonymous access to private routes", async () => {
      await request(app.getHttpServer()).get("/api/auth/me").expect(401);
      await request(app.getHttpServer()).get("/api/requests/my").expect(401);
    });

    it("logs a student in through the mock Platonus flow and sets an HttpOnly cookie", async () => {
      const agent = request.agent(app.getHttpServer());
      const start = await agent.get("/api/auth/login").expect(302);
      expect(start.headers.location).toMatch(/^http:\/\/localhost:5173\/dev\/mock-login\?state=/);
      const state = new URL(start.headers.location as string).searchParams.get("state");
      const callback = await agent.get(`/api/auth/callback?code=PL-100003&state=${state}`).expect(302);
      const cookies = ([] as string[]).concat(callback.headers["set-cookie"] ?? []);
      expect(cookies.find((cookie) => cookie.startsWith("unidocs_sid="))).toMatch(/HttpOnly/i);
      const me = await agent.get("/api/auth/me").expect(200);
      expect(me.body.user.roles).toEqual(["STUDENT"]);
    });

    it("rejects a forged login state", async () => {
      const response = await request(app.getHttpServer()).get("/api/auth/callback?code=staff-admin&state=forged").expect(302);
      expect(response.headers.location).toBe("http://localhost:5173/login?error=state");
    });

    it("does not auto-create staff accounts", async () => {
      await prisma.user.deleteMany({ where: { externalUserId: "staff-accountant-unprovisioned" } });
      const agent = request.agent(app.getHttpServer());
      const start = await agent.get("/api/auth/login");
      const state = new URL(start.headers.location as string).searchParams.get("state");
      // Unknown to the mock provider and never provisioned → denied.
      const response = await agent.get(`/api/auth/callback?code=staff-accountant-unprovisioned&state=${state}`).expect(302);
      expect(response.headers.location).toBe("http://localhost:5173/login?error=denied");
    });

    it("requires a CSRF token for state-changing requests and ends the session on logout", async () => {
      const student = await login("PL-100002");
      await student.agent.post("/api/requests").send({ certificateType: "ENROLLMENT_CERTIFICATE", purpose: "BANK" }).expect(403);
      await student.agent.post("/api/auth/logout").set("X-CSRF-Token", student.csrf).expect(204);
      await student.agent.get("/api/auth/me").expect(401);
    });
  });

  describe("certificate workflow", () => {
    let studentA: Session;
    let studentB: Session;
    let specialist: Session;
    let accountant: Session;
    let signer: Session;
    let admin: Session;

    beforeAll(async () => {
      [studentA, studentB, specialist, accountant, signer, admin] = await Promise.all([
        login("PL-100001"),
        login("PL-100002"),
        login("staff-specialist"),
        login("staff-accountant"),
        login("staff-signer"),
        login("staff-admin"),
      ]);
    });

    it("shows the student their live academic profile", async () => {
      const response = await studentA.agent.get("/api/students/me").expect(200);
      expect(response.body).toMatchObject({ externalStudentId: "PL-100001", course: 3, educationStatus: "ACTIVE" });
    });

    it("validates request input", async () => {
      await post(studentA, "/api/requests", { certificateType: "NOPE", purpose: "BANK" }).expect(400);
      await post(studentA, "/api/requests", { certificateType: "ENROLLMENT_CERTIFICATE", purpose: "BANK", extra: 1 }).expect(400);
    });

    it("refuses certificates the student's status does not allow", async () => {
      const onLeave = await login("PL-100004");
      await post(onLeave, "/api/requests", { certificateType: "ENROLLMENT_CERTIFICATE", purpose: "BANK" }).expect(422);
    });

    it("keeps requests private to their owner (IDOR)", async () => {
      const requestId = await submitRequest(studentA);
      await studentA.agent.get(`/api/requests/${requestId}`).expect(200);
      await studentB.agent.get(`/api/requests/${requestId}`).expect(404);
      const mine = await studentB.agent.get("/api/requests/my").expect(200);
      expect(mine.body.map((item: { id: string }) => item.id)).not.toContain(requestId);
    });

    it("blocks students from staff and admin routes", async () => {
      await studentA.agent.get("/api/staff/requests").expect(403);
      await studentA.agent.get("/api/admin/users").expect(403);
      await post(studentA, "/api/documents/00000000-0000-4000-8000-000000000000/sign").expect(403);
    });

    it("enforces the order and roles of the approval chain", async () => {
      const requestId = await submitRequest(studentA);

      await post(accountant, `/api/staff/requests/${requestId}/approve`).expect(403);
      await post(signer, `/api/staff/requests/${requestId}/approve`).expect(403);
      await post(admin, `/api/staff/requests/${requestId}/approve`).expect(403);

      const list = await specialist.agent.get("/api/staff/requests").expect(200);
      expect(list.body.map((item: { id: string }) => item.id)).toContain(requestId);

      const step1 = await post(specialist, `/api/staff/requests/${requestId}/approve`, { comment: "Enrolled" }).expect(200);
      expect(step1.body).toMatchObject({ status: "UNDER_REVIEW", currentStepIndex: 1 });
      await post(specialist, `/api/staff/requests/${requestId}/approve`).expect(403);

      await post(accountant, `/api/staff/requests/${requestId}/reject`, { comment: "Unpaid tuition fee" }).expect(200);
      const rejected = await studentA.agent.get(`/api/requests/${requestId}`).expect(200);
      expect(rejected.body.status).toBe("REJECTED");
      expect(rejected.body.approvals.at(-1)).toMatchObject({ decision: "REJECTED", comment: "Unpaid tuition fee" });
      await post(accountant, `/api/staff/requests/${requestId}/approve`).expect(403);
    });

    it("issues, verifies and revokes a test-signed certificate", async () => {
      const requestId = await submitRequest(studentA);
      await approveAll(requestId, specialist, accountant, signer);
      const documentId = await documentIdFor(requestId);

      // Not available to the student before signing.
      await studentA.agent.get(`/api/documents/${documentId}/download`).expect(404);

      const signed = await post(signer, `/api/documents/${documentId}/sign`).expect(200);
      expect(signed.body).toMatchObject({ status: "ISSUED", isTest: true });
      await post(signer, `/api/documents/${documentId}/sign`).expect(409);

      const first = await studentA.agent.get(`/api/documents/${documentId}/download`).expect(200);
      expect(first.headers["content-type"]).toBe("application/pdf");
      const second = await studentA.agent.get(`/api/documents/${documentId}/download`).expect(200);
      expect(Buffer.compare(first.body as Buffer, second.body as Buffer)).toBe(0);
      await studentB.agent.get(`/api/documents/${documentId}/download`).expect(404);

      const token = (signed.body.verificationUrl as string).split("/").pop();
      const verification = await request(app.getHttpServer()).get(`/api/documents/verify/${token}`).expect(200);
      expect(verification.body.status).toBe("SIGNATURE_NOT_VERIFIED");
      expect(verification.body.document).toMatchObject({ signatureCheck: "TEST_ONLY", isTestDocument: true });
      expect(JSON.stringify(verification.body)).not.toContain("Сейітова");

      const audit = await prisma.auditLog.findMany({ where: { entityId: documentId } });
      expect(audit.map((entry) => entry.action)).toEqual(
        expect.arrayContaining(["document.prepared", "document.signed", "document.downloaded"]),
      );

      await post(studentA, `/api/admin/documents/${documentId}/revoke`, { reason: "Test revocation" }).expect(403);
      await post(admin, `/api/admin/documents/${documentId}/revoke`, { reason: "Test revocation" }).expect(200);
      const revoked = await request(app.getHttpServer()).get(`/api/documents/verify/${token}`).expect(200);
      expect(revoked.body.status).toBe("REVOKED");
    });

    it("gives every certificate its own unguessable token and reports expiry", async () => {
      const tokens: string[] = [];
      for (let index = 0; index < 2; index++) {
        const requestId = await submitRequest(studentB);
        await approveAll(requestId, specialist, accountant, signer);
        const documentId = await documentIdFor(requestId);
        await post(signer, `/api/documents/${documentId}/sign`).expect(200);
        const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
        expect(document.verificationToken).not.toBe(document.id);
        tokens.push(document.verificationToken);
      }
      expect(new Set(tokens).size).toBe(2);

      await prisma.document.update({ where: { verificationToken: tokens[0] }, data: { validUntil: new Date("2020-01-01") } });
      const expired = await request(app.getHttpServer()).get(`/api/documents/verify/${tokens[0]}`).expect(200);
      expect(expired.body.status).toBe("EXPIRED");

      const unknown = await request(app.getHttpServer()).get("/api/documents/verify/not-a-token").expect(200);
      expect(unknown.body).toEqual({ status: "NOT_FOUND", document: null });
    });

    it("lets the student list their issued documents", async () => {
      const documents = await studentB.agent.get("/api/documents/my").expect(200);
      expect(documents.body.length).toBeGreaterThanOrEqual(2);
      expect(documents.body.every((document: { status: string }) => document.status !== "AWAITING_SIGNATURE")).toBe(true);
    });
  });

  describe("administration", () => {
    it("never lets an administrator change their own roles or status", async () => {
      const admin = await login("staff-admin");
      await admin.agent
        .patch(`/api/admin/users/${admin.userId}/roles`)
        .set("X-CSRF-Token", admin.csrf)
        .send({ roles: ["SYSTEM_ADMIN", "AUTHORIZED_SIGNER"] })
        .expect(403);
      await admin.agent
        .patch(`/api/admin/users/${admin.userId}/status`)
        .set("X-CSRF-Token", admin.csrf)
        .send({ isActive: false })
        .expect(403);
    });

    it("never gives staff roles to student accounts", async () => {
      const admin = await login("staff-admin");
      const student = await login("PL-100003");
      await admin.agent
        .patch(`/api/admin/users/${student.userId}/roles`)
        .set("X-CSRF-Token", admin.csrf)
        .send({ roles: ["AUTHORIZED_SIGNER"] })
        .expect(400);
    });

    it("validates workflow configuration", async () => {
      const admin = await login("staff-admin");
      await admin.agent
        .put("/api/admin/workflow")
        .set("X-CSRF-Token", admin.csrf)
        .send({ steps: [{ role: "SPECIALIST", name: "Only specialist" }] })
        .expect(400);
      const updated = await admin.agent
        .put("/api/admin/workflow")
        .set("X-CSRF-Token", admin.csrf)
        .send({
          certificateType: "VISA_SUPPORT_LETTER",
          steps: [
            { role: "SPECIALIST", name: "ENROLLMENT_VERIFICATION" },
            { role: "AUTHORIZED_SIGNER", name: "FINAL_APPROVAL" },
          ],
        })
        .expect(200);
      expect(updated.body.overrides.VISA_SUPPORT_LETTER).toHaveLength(2);
      const logs = await admin.agent.get("/api/admin/audit-logs?action=workflow.updated").expect(200);
      expect(logs.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("rate limiting", () => {
    it("limits the public verification endpoint", async () => {
      const server = app.getHttpServer();
      let limited = false;
      for (let index = 0; index < 40 && !limited; index++) {
        const response = await request(server).get("/api/documents/verify/00000000-0000-4000-8000-000000000000");
        limited = response.status === 429;
      }
      expect(limited).toBe(true);
    });
  });
});

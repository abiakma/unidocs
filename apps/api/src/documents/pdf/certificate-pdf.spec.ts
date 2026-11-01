import { describe, expect, it } from "vitest";
import { MOCK_STUDENTS } from "../../students/providers/mock-students.js";
import { type CertificatePdfInput, formatDate, renderCertificatePdf } from "./certificate-pdf.js";
import { buildVerificationUrl, renderQrPng } from "./qr-code.js";

const student = MOCK_STUDENTS[0]!;

function input(overrides: Partial<CertificatePdfInput> = {}): CertificatePdfInput {
  return {
    mode: "TEST_SIGNED",
    language: "KK",
    documentNumber: "AHEU-2026-000001",
    certificateType: "ENROLLMENT_CERTIFICATE",
    purpose: "BANK",
    purposeDetails: null,
    student,
    issueDate: new Date("2026-11-01T00:00:00Z"),
    validUntil: new Date("2027-01-30T00:00:00Z"),
    signer: { name: "Тестова Гүлнар", jobTitle: "Проректор (ТЕСТ)" },
    verificationUrl: "https://certificate.example.kz/verify/1dc9e41a-5783-47f8-960a-09f7d3b210c7",
    ...overrides,
  };
}

describe("renderCertificatePdf", () => {
  it.each(["KK", "RU", "EN"] as const)("renders a PDF in %s", async (language) => {
    const pdf = await renderCertificatePdf(input({ language }));
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10_000);
  });

  it("renders previews and graduation certificates", async () => {
    const graduate = MOCK_STUDENTS.find((item) => item.educationStatus === "GRADUATED")!;
    const pdf = await renderCertificatePdf(
      input({ mode: "PREVIEW", signer: null, student: graduate, certificateType: "GRADUATION_CONFIRMATION" }),
    );
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("embeds the Kazakh-capable font", async () => {
    const pdf = await renderCertificatePdf(input());
    expect(pdf.toString("latin1")).toContain("DejaVuSans");
  });
});

describe("QR code", () => {
  it("builds the verification URL from the configured base", () => {
    expect(buildVerificationUrl("https://certificate.aheu.kz", "abc")).toBe("https://certificate.aheu.kz/verify/abc");
  });

  it("renders a PNG image", async () => {
    const png = await renderQrPng("https://certificate.aheu.kz/verify/abc");
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  });
});

describe("formatDate", () => {
  it("formats as dd.MM.yyyy in UTC", () => {
    expect(formatDate("2023-09-01")).toBe("01.09.2023");
  });
});

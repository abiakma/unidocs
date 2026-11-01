import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import type { CertificatePurpose, CertificateType, DocumentLanguage } from "../../generated/prisma/enums.js";
import type { StudentAcademicProfile } from "../../students/student-data.types.js";
import {
  CERTIFICATE_TITLES,
  LABELS,
  PURPOSE_TEXTS,
  studentBody,
  UNIVERSITY_NAME,
} from "./certificate-texts.js";
import { renderQrPng } from "./qr-code.js";

// DejaVu Sans covers Cyrillic and all Kazakh letters (ә ғ қ ң ө ұ ү һ і).
const require = createRequire(import.meta.url);
const FONT_REGULAR = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const FONT_BOLD = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

const NAVY = "#1e3a8a";
const GOLD = "#c59d3f";
const MUTED = "#4b5563";
const RED = "#b91c1c";

/**
 * PREVIEW      – unsigned copy for the signer to review.
 * TEST_SIGNED  – produced by the mock signing provider; clearly marked as not legally signed.
 * OFFICIAL     – content to be signed by the official signing provider.
 */
export type PdfMode = "PREVIEW" | "TEST_SIGNED" | "OFFICIAL";

export interface CertificatePdfInput {
  mode: PdfMode;
  language: DocumentLanguage;
  documentNumber: string;
  certificateType: CertificateType;
  purpose: CertificatePurpose;
  purposeDetails: string | null;
  student: StudentAcademicProfile;
  issueDate: Date;
  validUntil: Date | null;
  signer: { name: string; jobTitle: string } | null;
  verificationUrl: string;
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

function languageKey(language: DocumentLanguage): "kk" | "ru" | "en" {
  return language === "KK" ? "kk" : language === "RU" ? "ru" : "en";
}

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const qrPng = await renderQrPng(input.verificationUrl);
  const lang = input.language;
  const key = languageKey(lang);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 40, left: 64, right: 64 },
    info: {
      Title: `${CERTIFICATE_TITLES[input.certificateType][lang]} ${input.documentNumber}`,
      Author: UNIVERSITY_NAME[lang],
      Subject: input.mode === "TEST_SIGNED" ? "TEST / NOT LEGALLY SIGNED" : input.documentNumber,
    },
  });
  doc.registerFont("Regular", FONT_REGULAR);
  doc.registerFont("Bold", FONT_BOLD);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  // Logo placeholder until official branding is provided.
  doc.circle(left + 28, 84, 28).lineWidth(2).strokeColor(NAVY).stroke();
  doc.font("Bold").fontSize(9).fillColor(NAVY).text("AHEU", left, 76, { width: 56, align: "center" });
  doc.font("Regular").fontSize(5).fillColor(MUTED).text(LABELS.logoPlaceholder[lang], left, 88, { width: 56, align: "center" });

  doc.font("Bold").fontSize(14).fillColor(NAVY)
    .text(UNIVERSITY_NAME[lang], left + 70, 70, { width: width - 70, align: "center" });
  doc.moveTo(left, 128).lineTo(left + width, 128).lineWidth(2).strokeColor(GOLD).stroke();

  doc.font("Bold").fontSize(16).fillColor("#111827")
    .text(CERTIFICATE_TITLES[input.certificateType][lang], left, 160, { width, align: "center" });

  doc.moveDown(1.2).font("Regular").fontSize(10).fillColor(MUTED);
  doc.text(`${LABELS.documentNumber[lang]}: ${input.documentNumber}`, left, doc.y, { width });
  doc.text(`${LABELS.issueDate[lang]}: ${formatDate(input.issueDate)}`, { width });
  if (input.validUntil) doc.text(`${LABELS.validUntil[lang]}: ${formatDate(input.validUntil)}`, { width });

  const student = input.student;
  const body = studentBody(lang, input.certificateType === "GRADUATION_CONFIRMATION", {
    name: student.fullName,
    university: UNIVERSITY_NAME[lang],
    faculty: student.faculty[key],
    specialty: student.specialty[key],
    course: student.course,
    group: student.group,
    studyForm: student.studyForm[key],
    enrollmentDate: formatDate(student.enrollmentDate),
    graduationDate: student.graduationDate ? formatDate(student.graduationDate) : "—",
  });
  doc.moveDown(2).font("Regular").fontSize(12).fillColor("#111827")
    .text(body, { width, align: "justify", lineGap: 4 });

  const purposeText = input.purposeDetails
    ? `${PURPOSE_TEXTS[input.purpose][lang]} (${input.purposeDetails})`
    : PURPOSE_TEXTS[input.purpose][lang];
  doc.moveDown(1).text(`${LABELS.purpose[lang]}: ${purposeText}.`, { width, lineGap: 4 });

  // Signature block
  const signatureTop = Math.max(doc.y + 40, 520);
  doc.font("Regular").fontSize(11).fillColor("#111827")
    .text(LABELS.signer[lang], left, signatureTop, { width: width / 2 });
  if (input.signer) {
    doc.font("Bold").text(input.signer.jobTitle, { width: width / 2 });
    doc.font("Regular").text(input.signer.name, { width: width / 2 });
    if (input.mode === "TEST_SIGNED") {
      doc.fillColor(RED).fontSize(9).text(LABELS.testSignatureNote[lang], { width: width / 2 });
    }
  } else {
    doc.moveDown(1.5).text("______________________", { width: width / 2 });
  }

  // QR code with verification link
  const qrSize = 120;
  const qrX = left + width - qrSize;
  doc.image(qrPng, qrX, signatureTop, { width: qrSize, height: qrSize });
  doc.font("Regular").fontSize(7).fillColor(MUTED)
    .text(LABELS.scanToVerify[lang], qrX - 40, signatureTop + qrSize + 4, { width: qrSize + 40, align: "center" });

  // Footer status line
  const footerY = doc.page.height - 90;
  const footer =
    input.mode === "TEST_SIGNED"
      ? LABELS.testFooter[lang]
      : input.mode === "PREVIEW"
        ? LABELS.previewFooter[lang]
        : LABELS.officialFooter[lang];
  doc.rect(left, footerY, width, 34).fill(input.mode === "OFFICIAL" ? "#eef2ff" : "#fef2f2");
  doc.font("Bold").fontSize(9).fillColor(input.mode === "OFFICIAL" ? NAVY : RED)
    .text(footer, left + 8, footerY + 11, { width: width - 16, align: "center" });

  // Diagonal watermark for anything that is not officially signed
  if (input.mode !== "OFFICIAL") {
    const watermark = input.mode === "TEST_SIGNED" ? LABELS.testWatermark[lang] : LABELS.previewWatermark[lang];
    doc.save();
    doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.font("Bold").fontSize(40).fillColor(RED).fillOpacity(0.12)
      .text(watermark, 0, doc.page.height / 2 - 20, { width: doc.page.width, align: "center" });
    doc.restore();
  }

  doc.end();
  return finished;
}

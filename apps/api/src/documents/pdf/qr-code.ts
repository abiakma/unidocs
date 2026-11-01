import QRCode from "qrcode";

export function buildVerificationUrl(verificationBaseUrl: string, verificationToken: string): string {
  return `${verificationBaseUrl}/verify/${encodeURIComponent(verificationToken)}`;
}

export async function renderQrPng(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 360 });
}

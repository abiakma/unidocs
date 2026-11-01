# QR codes and public verification

## Token

- Each document gets a **random UUID v4** (`crypto.randomUUID()`) as `documents.verification_token`, with a `UNIQUE` constraint.
- The token is created once, when the document is prepared, and never changes; downloading the certificate again returns the same stored file and token.
- Internal IDs and document numbers are never used as verification credentials.

URL printed in the QR code:

```
{VERIFICATION_BASE_URL}/verify/{verificationToken}
e.g. https://certificate.aheu.kz/verify/1dc9e41a-5783-47f8-960a-09f7d3b210c7
```

`VERIFICATION_BASE_URL` is configurable and must be HTTPS in production. The QR image is generated server-side (`qrcode`, error correction M) and embedded in the PDF next to the signature block.

## Public page `/verify/:token`

No login. The page calls `GET /api/documents/verify/:token` and shows:

| Shown | Not shown |
| --- | --- |
| University name, document number, certificate type | Student name, IIN, Platonus ID |
| Issue date, validity date, revocation date | Faculty, group, grades |
| Signer's **designation** (job title) | Purpose details |
| Signature status | Internal IDs |

`/verify` without a token shows a form where a code or a pasted link can be entered.

## Statuses

Evaluated in this order (`apps/api/src/documents/verification.ts`):

| Status | When |
| --- | --- |
| `NOT_FOUND` | Unknown or malformed token, or document not yet signed |
| `REVOKED` | An administrator revoked the document |
| `EXPIRED` | `valid_until` has passed |
| `VALID` | Signature cryptographically verified by the official provider |
| `SIGNATURE_NOT_VERIFIED` | Anything else, including every mock-signed test document |

"Signature verified" is displayed only for `signatureCheck = VERIFIED`, which only a real verification can return. Test documents additionally show "Test document — not officially verified".

## Abuse protection

- Tokens have 122 random bits, so guessing is not practical.
- Malformed tokens get the same `NOT_FOUND` answer as unknown ones (no oracle).
- 30 requests per minute per IP; `Cache-Control: no-store`.
- Behind a proxy, set `TRUST_PROXY_HOPS` so the rate limit sees the real client IP.

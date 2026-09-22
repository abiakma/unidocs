UniDocs Specifications
Project Problem

Students often need official university documents for employment, internships, visa applications, scholarships, banks, and other organizations.

In many universities, students need to contact different departments or wait several days to receive these documents.

UniDocs provides a digital system where students can request documents online.

User Roles
Student

The student can:

log in;
request a document;
select a document type;
track request status;
download an approved document.
University Administrator

The administrator can:

view student requests;
approve requests;
reject requests;
generate documents;
manage document templates;
revoke documents.
Verifier

A verifier can be an employer, embassy, university, or other organization.

The verifier can scan a QR code or enter a document ID to check whether the document is authentic.

Use Case 1: Request Document
Student logs into the system.
Student selects a document type.
Student fills in the required information.
Student submits the request.
The system saves the request.
Request status becomes PENDING.
Use Case 2: Approve Document
Administrator logs into the system.
Administrator opens pending requests.
Administrator reviews the request.
Administrator approves or rejects it.
If approved, the document can be generated.
Use Case 3: Generate Document
The system receives an approved request.
Student information is added to the university template.
The system creates a unique document ID.
A QR code is generated.
The final document is created.
Use Case 4: Verify Document
A verifier scans the QR code.
The system finds the document.
The system checks its status.
The verification page shows:
VALID
REVOKED
EXPIRED
NOT FOUND
Document Status Flow

DRAFT → PENDING → APPROVED → ISSUED

Alternative states:

PENDING → REJECTED

ISSUED → REVOKED

ISSUED → EXPIRED

Non-Functional Requirements
Response time should normally be less than 1.5 seconds.
The website must work on desktop, tablet, and mobile.
TypeScript strict mode must be enabled.
Explicit any should not be used.
Target test coverage should be at least 80%.
Sensitive student information must be protected.
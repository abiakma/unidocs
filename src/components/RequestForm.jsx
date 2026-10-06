import { useRef, useState } from "react";
import { DOCUMENT_TYPES, PURPOSES } from "../constants.js";

export default function RequestForm({ onSubmitRequest }) {
  const [documentType, setDocumentType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Used to move focus to the first field with an error.
  const documentTypeRef = useRef(null);
  const purposeRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage("");

    const newErrors = {};
    if (documentType === "") newErrors.documentType = "Please select a document type.";
    if (purpose === "") newErrors.purpose = "Please select a purpose.";
    setErrors(newErrors);

    if (newErrors.documentType) {
      documentTypeRef.current.focus();
      return;
    }
    if (newErrors.purpose) {
      purposeRef.current.focus();
      return;
    }

    const requestId = onSubmitRequest(documentType, purpose);
    setDocumentType("");
    setPurpose("");
    setSuccessMessage(`Request #${requestId} submitted. Current step: Submitted.`);
  }

  return (
    <section id="request-section" className="panel" aria-labelledby="request-title">
      <h2 id="request-title">Request Document</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="document-type">Document type</label>
          <select
            id="document-type"
            ref={documentTypeRef}
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            required
            aria-invalid={Boolean(errors.documentType)}
            aria-describedby="document-type-error"
          >
            <option value="">Select a document type</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <p id="document-type-error" className="field-error" aria-live="polite">
            {errors.documentType}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="purpose">Purpose</label>
          <select
            id="purpose"
            ref={purposeRef}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            required
            aria-invalid={Boolean(errors.purpose)}
            aria-describedby="purpose-error"
          >
            <option value="">Select a purpose</option>
            {PURPOSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <p id="purpose-error" className="field-error" aria-live="polite">
            {errors.purpose}
          </p>
        </div>

        <button type="submit" className="button button-primary">Submit request</button>

        {successMessage && (
          <p className="status status-success" role="status">{successMessage}</p>
        )}
      </form>
    </section>
  );
}

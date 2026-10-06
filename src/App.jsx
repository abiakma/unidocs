import { useEffect, useState } from "react";
import { USERS_URL } from "./constants.js";
import {
  approveRequest,
  createInitialRequests,
  createRequest,
  rejectRequest,
} from "./requests.js";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import StudentDashboard from "./components/StudentDashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";

export default function App() {
  // ===== Application state =====
  const [role, setRole] = useState("student"); // "student" or "admin"
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0); // "Try again" increases it

  // ===== Load users from the API =====
  useEffect(() => {
    // Cancels the request if the component unmounts or reloads.
    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(USERS_URL, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();
        setUsers(data);
        setRequests(createInitialRequests(data));
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Could not load data. ${err.message}`);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();
    return () => controller.abort();
  }, [reloadCount]);

  // The first user is the signed-in student.
  const currentStudent = users[0];

  // ===== Actions =====
  function handleSubmitRequest(documentType, purpose) {
    const newRequest = createRequest(requests.length + 1, currentStudent, documentType, purpose);
    setRequests([...requests, newRequest]);
    return newRequest.id;
  }

  function handleApprove(requestId) {
    setRequests((current) =>
      current.map((request) => (request.id === requestId ? approveRequest(request) : request))
    );
  }

  function handleReject(requestId) {
    setRequests((current) =>
      current.map((request) => (request.id === requestId ? rejectRequest(request) : request))
    );
  }

  // ===== Page =====
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header role={role} onRoleChange={setRole} />

      <main id="main-content" className="container">
        {isLoading && (
          <p className="status status-loading" role="status">
            Loading…
          </p>
        )}

        {error && (
          <div className="status status-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setReloadCount(reloadCount + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && role === "student" && (
          <StudentDashboard
            student={currentStudent}
            requests={requests.filter((request) => request.studentId === currentStudent.id)}
            onSubmitRequest={handleSubmitRequest}
          />
        )}

        {!isLoading && !error && role === "admin" && (
          <AdminDashboard requests={requests} onApprove={handleApprove} onReject={handleReject} />
        )}
      </main>

      <Footer />
    </>
  );
}

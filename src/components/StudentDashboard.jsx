import ProfileCard from "./ProfileCard.jsx";
import RequestForm from "./RequestForm.jsx";
import RequestCard from "./RequestCard.jsx";

export default function StudentDashboard({ student, requests, onSubmitRequest }) {
  // Newest first
  const sortedRequests = [...requests].reverse();

  return (
    <div className="view">
      <h1>Student Dashboard</h1>

      <div className="student-grid">
        <ProfileCard student={student} />
        <RequestForm onSubmitRequest={onSubmitRequest} />
      </div>

      <section id="my-requests" className="panel" aria-labelledby="my-requests-title">
        <h2 id="my-requests-title">My Requests</h2>
        <div className="card-list">
          {sortedRequests.length === 0 && <p className="empty-text">You have no requests yet.</p>}
          {sortedRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </section>
    </div>
  );
}

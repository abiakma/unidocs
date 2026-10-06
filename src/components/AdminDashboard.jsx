import RequestCard from "./RequestCard.jsx";

export default function AdminDashboard({ requests, onApprove, onReject }) {
  const pending = requests.filter((request) => request.status === "IN_PROGRESS");
  const closed = requests.filter((request) => request.status !== "IN_PROGRESS");

  return (
    <div className="view">
      <h1>University Admin Dashboard</h1>

      <section id="pending-requests" className="panel" aria-labelledby="pending-title">
        <h2 id="pending-title">Pending document requests</h2>
        <div className="card-list">
          {pending.length === 0 && <p className="empty-text">No pending requests.</p>}
          {pending.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              showStudent
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      </section>

      <section id="closed-requests" className="panel" aria-labelledby="closed-title">
        <h2 id="closed-title">Completed and rejected</h2>
        <div className="card-list">
          {closed.length === 0 && <p className="empty-text">Nothing here yet.</p>}
          {closed.map((request) => (
            <RequestCard key={request.id} request={request} showStudent />
          ))}
        </div>
      </section>
    </div>
  );
}

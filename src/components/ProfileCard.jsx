export default function ProfileCard({ student }) {
  const rows = [
    ["Name", student.name],
    ["Student ID", `STU-${String(student.id).padStart(4, "0")}`],
    ["Email", student.email],
    ["City", student.address.city],
  ];

  return (
    <section className="panel" aria-labelledby="profile-title">
      <h2 id="profile-title">My profile</h2>
      <dl className="profile">
        {rows.map(([label, value]) => (
          <div key={label} className="profile-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

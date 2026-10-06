const NAV_LINKS = {
  student: [
    { href: "#request-section", text: "Request Document" },
    { href: "#my-requests", text: "My Requests" },
  ],
  admin: [
    { href: "#pending-requests", text: "Pending" },
    { href: "#closed-requests", text: "History" },
  ],
};

const ROLES = [
  { value: "student", label: "Student" },
  { value: "admin", label: "Admin" },
];

export default function Header({ role, onRoleChange }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="logo" href="#main-content" aria-label="UniDocs home">
          <span className="logo-mark" aria-hidden="true">U</span>
          <span>UniDocs</span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <ul>
            {NAV_LINKS[role].map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.text}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="role-switch" role="group" aria-labelledby="role-switch-label">
          <span id="role-switch-label" className="role-label">View as</span>
          {ROLES.map((item) => (
            <button
              key={item.value}
              type="button"
              className="role-button"
              aria-pressed={role === item.value}
              onClick={() => onRoleChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

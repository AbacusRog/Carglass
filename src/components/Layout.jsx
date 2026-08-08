import { supabase } from '../supabaseClient'

const NAV_ITEMS = [
  { key: 'timesheet', label: 'Monthly Timesheet' },
  { key: 'employees', label: 'Employees' },
  { key: 'holiday', label: 'Holiday Report' },
]

export default function Layout({ page, setPage, userEmail, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Carglass</div>
          <div className="brand-sub">Wage & Timesheet</div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-email">{userEmail}</div>
          <button className="signout-btn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}

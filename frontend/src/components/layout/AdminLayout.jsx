import { useState } from 'react'
import { FiMenu } from 'react-icons/fi'
import clsx from 'clsx'
import Sidebar from './Sidebar.jsx'

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={clsx(
          'flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300',
        )}
      >
        <header className="flex h-14 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
            aria-expanded={mobileOpen}
          >
            <FiMenu size={22} aria-hidden />
          </button>
          <span className="font-display text-lg font-semibold text-[var(--text-primary)]">
            Admin
          </span>
        </header>

        <main className="flex-1 min-h-screen overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

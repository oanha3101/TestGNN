import type { AppView } from '../../types/app'
import type { SafeUser } from '../../types/social'

type AppHeaderProps = {
  selectedDataset: string
  activeView: AppView
  currentUser: SafeUser | null
  onViewChange: (view: AppView) => void
  onRequireAuth: () => void
  onLogout: () => Promise<void>
}

export function AppHeader({
  selectedDataset,
  activeView,
  currentUser,
  onViewChange,
  onRequireAuth,
  onLogout,
}: AppHeaderProps) {
  const workspaceViews: { id: AppView; label: string }[] = [
    { id: 'lab', label: 'Lab' },
    { id: 'community', label: 'Community' },
    { id: 'vault', label: 'Vault' },
    { id: 'profile', label: 'Profile' },
  ]

  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <h1 className="brand-title">GNN Neural Platform</h1>
            <p className="topbar-dataset">
              {activeView === 'lab' ? `Lab workspace - ${selectedDataset}` : `Workspace - ${activeView}`}
            </p>
          </div>
        </div>

        <nav className="topbar-nav" aria-label="Workspace navigation">
          <div className="topbar-nav-group">
            <span className="topbar-nav-label">Workspace</span>
            <div className="topbar-nav-cluster">
              {workspaceViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`topbar-nav-button ${activeView === view.id ? 'is-active' : ''}`}
                  onClick={() => onViewChange(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {currentUser?.role === 'admin' ? (
            <div className="topbar-nav-group is-admin">
              <span className="topbar-nav-label">Operations</span>
              <div className="topbar-nav-cluster">
                <button
                  type="button"
                  className={`topbar-nav-button topbar-admin-button ${activeView === 'admin' ? 'is-active' : ''}`}
                  onClick={() => onViewChange('admin')}
                >
                  Admin Console
                </button>
              </div>
            </div>
          ) : null}
        </nav>
      </div>

      <div className="topbar-right">
        <div className="topbar-auth">
          {currentUser ? (
            <>
              <span className="topbar-chip role-badge">
                {currentUser.displayName}
                <span className="role-badge-tag">{currentUser.role}</span>
              </span>
              <button type="button" className="chip topbar-logout-button" onClick={() => void onLogout()}>
                Logout
              </button>
            </>
          ) : (
            <button type="button" className="chip chip-active topbar-login-button" onClick={onRequireAuth}>
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

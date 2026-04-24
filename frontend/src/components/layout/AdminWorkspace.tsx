import { Activity, FlaskConical, LogOut, MessageSquareWarning, Shield, UserCircle2, Users } from 'lucide-react'
import { AdminPanel } from '../social/AdminPanel'
import { adminTabs, type AdminTab } from '../social/adminTabs'
import type { AppView } from '../../types/app'
import type { TrainingRunRecord } from '../../types/gnn'
import type { AdminOverview, SafeUser, TrainingPost, UserRole, UserStatus } from '../../types/social'

type AdminWorkspaceProps = {
  currentUser: SafeUser
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  onViewChange: (view: AppView) => void
  onLogout: () => Promise<void>
  overview: AdminOverview | null
  users: SafeUser[]
  posts: TrainingPost[]
  trainingRuns: TrainingRunRecord[]
  onSetUserRole: (userId: string, role: UserRole) => Promise<void>
  onSetUserStatus: (userId: string, status: UserStatus) => Promise<void>
  onRemovePost: (postId: string) => Promise<void>
}

const workspaceLinks: { id: AppView; label: string; icon: typeof FlaskConical }[] = [
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'community', label: 'Community', icon: MessageSquareWarning },
  { id: 'vault', label: 'Vault', icon: Shield },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
]

const operationIcons: Record<AdminTab, typeof Shield> = {
  overview: Shield,
  users: Users,
  moderation: MessageSquareWarning,
  training: Activity,
}

export function AdminWorkspace({
  currentUser,
  activeTab,
  onTabChange,
  onViewChange,
  onLogout,
  overview,
  users,
  posts,
  trainingRuns,
  onSetUserRole,
  onSetUserStatus,
  onRemovePost,
}: AdminWorkspaceProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-mark">G</div>
          <div>
            <strong>Admin GNN</strong>
            <span>Operations center</span>
          </div>
        </div>

        <div className="admin-sidebar-section">
          <span className="admin-sidebar-label">Operations</span>
          <div className="admin-sidebar-nav">
            {adminTabs.map((tab) => {
              const Icon = operationIcons[tab.id]
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`admin-sidebar-button ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="admin-sidebar-section">
          <span className="admin-sidebar-label">Workspace</span>
          <div className="admin-sidebar-nav">
            {workspaceLinks.map((link) => {
              const Icon = link.icon
              return (
                <button
                  key={link.id}
                  type="button"
                  className="admin-sidebar-button is-ghost"
                  onClick={() => onViewChange(link.id)}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span>{currentUser.displayName}</span>
            <strong>{currentUser.email}</strong>
          </div>
          <button type="button" className="admin-sidebar-button admin-logout-button" onClick={() => void onLogout()}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-main-header">
          <div>
            <span className="admin-main-kicker">Administrative workspace</span>
            <h1>Platform operations</h1>
            <p>Role-gated controls for access, moderation, and training oversight.</p>
          </div>
          <div className="admin-main-badge">Signed in as admin</div>
        </header>

        <AdminPanel
          activeTab={activeTab}
          overview={overview}
          users={users}
          posts={posts}
          trainingRuns={trainingRuns}
          onSetUserRole={onSetUserRole}
          onSetUserStatus={onSetUserStatus}
          onRemovePost={onRemovePost}
        />
      </main>
    </div>
  )
}

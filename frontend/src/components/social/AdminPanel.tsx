import { useMemo, useState } from 'react'
import { Shield, Users, FileBarChart2, UserCog, Trash2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AdminOverview, SafeUser, TrainingPost, UserRole, UserStatus } from '../../types/social'

type AdminPanelProps = {
  overview: AdminOverview | null
  users: SafeUser[]
  posts: TrainingPost[]
  onSetUserRole: (userId: string, role: UserRole) => Promise<void>
  onSetUserStatus: (userId: string, status: UserStatus) => Promise<void>
  onRemovePost: (postId: string) => Promise<void>
}

type AdminTab = 'overview' | 'users' | 'moderation'

const adminTabs: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Access' },
  { id: 'moderation', label: 'Moderation' },
]

export function AdminPanel({
  overview,
  users,
  posts,
  onSetUserRole,
  onSetUserStatus,
  onRemovePost,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  const summary = overview ?? {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === 'active').length,
    suspendedUsers: users.filter((user) => user.status === 'suspended').length,
    totalPosts: posts.length,
    publicPosts: posts.filter((post) => post.isPublic).length,
    privatePosts: posts.filter((post) => !post.isPublic).length,
  }

  const roleBreakdown = useMemo(
    () => [
      { label: 'Users', value: users.filter((user) => user.role === 'user').length, color: '#5b76fe' },
      { label: 'Admins', value: users.filter((user) => user.role === 'admin').length, color: '#ff7a59' },
    ],
    [users],
  )

  const postBreakdown = useMemo(
    () => [
      { label: 'Public', value: summary.publicPosts, color: '#00b473' },
      { label: 'Private', value: summary.privatePosts, color: '#ffd166' },
    ],
    [summary.privatePosts, summary.publicPosts],
  )

  const moderationQueue = useMemo(
    () =>
      [...posts]
        .sort((left, right) => right.likeUserIds.length - left.likeUserIds.length)
        .slice(0, 8),
    [posts],
  )

  return (
    <section className="panel social-panel admin-console">
      <div className="admin-console-head">
        <div>
          <h2 className="panel-title">
            <Shield size={18} />
            Admin Console
          </h2>
          <p className="panel-subtitle">
            Separate operations workspace for governance, access control, and platform moderation.
          </p>
        </div>
        <div className="topbar-chip role-badge">Restricted workspace</div>
      </div>

      <div className="admin-tabs">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`topbar-nav-button ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="admin-overview-grid">
          <div className="admin-kpi-grid">
            <article className="metric-card">
              <span className="metric-label">Total users</span>
              <strong>{summary.totalUsers}</strong>
              <span className="metric-delta">
                <Users size={14} />
                {summary.activeUsers} active
              </span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Suspended</span>
              <strong>{summary.suspendedUsers}</strong>
              <span className="metric-delta muted">Accounts currently blocked</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Total posts</span>
              <strong>{summary.totalPosts}</strong>
              <span className="metric-delta">
                <FileBarChart2 size={14} />
                {summary.publicPosts} public
              </span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Admin accounts</span>
              <strong>{roleBreakdown[1].value}</strong>
              <span className="metric-delta muted">Protected governance layer</span>
            </article>
          </div>

          <div className="admin-chart-grid">
            <article className="admin-chart-card">
              <header>
                <strong>Access distribution</strong>
                <span>User roles</span>
              </header>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roleBreakdown} barSize={44}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                    {roleBreakdown.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="admin-chart-card">
              <header>
                <strong>Content visibility</strong>
                <span>Public vs private</span>
              </header>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={postBreakdown} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={4}>
                    {postBreakdown.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {postBreakdown.map((entry) => (
                  <span key={entry.label}>
                    <i style={{ backgroundColor: entry.color }} />
                    {entry.label}: {entry.value}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <div className="admin-grid">
          <article className="admin-card">
            <header className="admin-card-head">
              <strong>User access control</strong>
              <span>Promote, demote, suspend, or reactivate accounts</span>
            </header>
            <div className="admin-list">
              {users.map((user) => (
                <div key={user.id} className="admin-row">
                  <div className="admin-row-copy">
                    <strong>{user.displayName}</strong>
                    <p>{user.email}</p>
                  </div>
                  <div className="admin-actions">
                    <span className={`admin-pill ${user.role === 'admin' ? 'is-admin' : ''}`}>{user.role}</span>
                    <span className={`admin-pill ${user.status === 'active' ? 'is-active' : 'is-suspended'}`}>
                      {user.status}
                    </span>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onSetUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                    >
                      <UserCog size={12} />
                      {user.role === 'admin' ? 'Set user' : 'Promote admin'}
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onSetUserStatus(user.id, user.status === 'active' ? 'suspended' : 'active')}
                    >
                      {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === 'moderation' ? (
        <div className="admin-grid">
          <article className="admin-card">
            <header className="admin-card-head">
              <strong>Moderation queue</strong>
              <span>Highest-engagement posts first</span>
            </header>
            <div className="admin-list">
              {moderationQueue.map((post) => (
                <div key={post.id} className="admin-row">
                  <div className="admin-row-copy">
                    <strong>{post.title}</strong>
                    <p>
                      {post.isPublic ? 'Public post' : 'Private post'} | {post.likeUserIds.length} likes |{' '}
                      {post.training.model}
                    </p>
                  </div>
                  <div className="admin-actions">
                    <span className={`admin-pill ${post.isPublic ? 'is-active' : 'is-suspended'}`}>
                      {post.isPublic ? 'public' : 'private'}
                    </span>
                    <button type="button" className="chip danger-chip" onClick={() => onRemovePost(post.id)}>
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}

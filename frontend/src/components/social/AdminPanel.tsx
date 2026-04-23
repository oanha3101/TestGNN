import { useMemo } from 'react'
import { Shield, Users, FileBarChart2, UserCog, Trash2, Activity } from 'lucide-react'
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
import type { TrainingRunRecord } from '../../types/gnn'

export type AdminTab = 'overview' | 'users' | 'moderation' | 'training'

export const adminTabs: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Access' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'training', label: 'Training Runs' },
]

type AdminPanelProps = {
  activeTab: AdminTab
  overview: AdminOverview | null
  users: SafeUser[]
  posts: TrainingPost[]
  trainingRuns: TrainingRunRecord[]
  onSetUserRole: (userId: string, role: UserRole) => Promise<void>
  onSetUserStatus: (userId: string, status: UserStatus) => Promise<void>
  onRemovePost: (postId: string) => Promise<void>
}

const toClock = (timestamp: number | null) => {
  if (!timestamp) return 'Pending'
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminPanel({
  activeTab,
  overview,
  users,
  posts,
  trainingRuns,
  onSetUserRole,
  onSetUserStatus,
  onRemovePost,
}: AdminPanelProps) {
  const summary = overview ?? {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === 'active').length,
    suspendedUsers: users.filter((user) => user.status === 'suspended').length,
    totalPosts: posts.length,
    publicPosts: posts.filter((post) => post.isPublic).length,
    privatePosts: posts.filter((post) => !post.isPublic).length,
  }

  const activeAdmins = users.filter((user) => user.role === 'admin' && user.status === 'active').length
  const activeRuns = trainingRuns.filter((run) => run.status === 'queued' || run.status === 'running').length

  const roleBreakdown = useMemo(
    () => [
      { label: 'Users', value: users.filter((user) => user.role === 'user').length, color: '#7d8dff' },
      { label: 'Admins', value: users.filter((user) => user.role === 'admin').length, color: '#18c29c' },
    ],
    [users],
  )

  const postBreakdown = useMemo(
    () => [
      { label: 'Public', value: summary.publicPosts, color: '#7d8dff' },
      { label: 'Private', value: summary.privatePosts, color: '#ff996d' },
    ],
    [summary.privatePosts, summary.publicPosts],
  )

  const datasetBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const run of trainingRuns) {
      counts.set(run.datasetName, (counts.get(run.datasetName) ?? 0) + 1)
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }))
  }, [trainingRuns])

  const moderationQueue = useMemo(
    () =>
      [...posts]
        .sort((left, right) => right.likeUserIds.length - left.likeUserIds.length)
        .slice(0, 8),
    [posts],
  )

  const recentRuns = useMemo(() => trainingRuns.slice(0, 8), [trainingRuns])

  return (
    <section className="panel social-panel admin-console admin-theme-panel">
      <div className="admin-console-head">
        <div>
          <h2 className="panel-title">
            <Shield size={18} />
            Admin Console
          </h2>
          <p className="panel-subtitle">
            Dedicated governance workspace for user access, moderation, and platform operations.
          </p>
        </div>
        <div className="admin-header-tag">Restricted workspace</div>
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
              <span className="metric-label">Active admins</span>
              <strong>{activeAdmins}</strong>
              <span className="metric-delta muted">Protected accounts online</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Total posts</span>
              <strong>{summary.totalPosts}</strong>
              <span className="metric-delta">
                <FileBarChart2 size={14} />
                {summary.privatePosts} private
              </span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Active jobs</span>
              <strong>{activeRuns}</strong>
              <span className="metric-delta">
                <Activity size={14} />
                {trainingRuns.length} tracked runs
              </span>
            </article>
          </div>

          <div className="admin-chart-grid">
            <article className="admin-chart-card">
              <header>
                <strong>Access distribution</strong>
                <span>Current role mix</span>
              </header>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roleBreakdown} barSize={42}>
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
                <strong>Visibility split</strong>
                <span>Public vs private content</span>
              </header>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={postBreakdown} dataKey="value" innerRadius={52} outerRadius={82} paddingAngle={4}>
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

          <div className="admin-grid">
            <article className="admin-card">
              <header className="admin-card-head">
                <strong>Dataset activity</strong>
                <span>Most used training datasets</span>
              </header>
              {datasetBreakdown.length === 0 ? (
                <div className="empty-state">
                  <p>No training runs available yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={datasetBreakdown} layout="vertical" margin={{ left: 12, right: 8 }}>
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7d8dff" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </article>

            <article className="admin-card">
              <header className="admin-card-head">
                <strong>Latest run queue</strong>
                <span>Most recent training activity</span>
              </header>
              <div className="admin-list">
                {recentRuns.length === 0 ? (
                  <div className="empty-state">
                    <p>No training jobs have been created yet.</p>
                  </div>
                ) : (
                  recentRuns.slice(0, 4).map((run) => (
                    <div key={run.id} className="admin-row">
                      <div className="admin-row-copy">
                        <strong>
                          {run.modelType} on {run.datasetName}
                        </strong>
                        <p>
                          Epoch {run.epochCurrent}/{run.epochTotal} | {toClock(run.createdAt)}
                        </p>
                      </div>
                      <div className="admin-actions">
                        <span className={`admin-pill admin-status-pill is-${run.status}`}>{run.status}</span>
                      </div>
                    </div>
                  ))
                )}
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
              {moderationQueue.length === 0 ? (
                <div className="empty-state">
                  <p>No community posts are available for moderation.</p>
                </div>
              ) : (
                moderationQueue.map((post) => (
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
                ))
              )}
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === 'training' ? (
        <div className="admin-grid">
          <article className="admin-card">
            <header className="admin-card-head">
              <strong>Training run ledger</strong>
              <span>Recent jobs across the platform</span>
            </header>
            <div className="admin-list">
              {recentRuns.length === 0 ? (
                <div className="empty-state">
                  <p>No training runs are available yet.</p>
                </div>
              ) : (
                recentRuns.map((run) => {
                  const owner = users.find((user) => user.id === run.userId)
                  return (
                    <div key={run.id} className="admin-row">
                      <div className="admin-row-copy">
                        <strong>
                          #{run.id} {run.modelType} on {run.datasetName}
                        </strong>
                        <p>
                          {owner?.displayName ?? 'Unknown owner'} | Epoch {run.epochCurrent}/{run.epochTotal} |{' '}
                          {toClock(run.createdAt)}
                        </p>
                        <p>
                          Best accuracy {run.bestAccuracy !== null ? `${run.bestAccuracy.toFixed(1)}%` : '--'} | Best
                          loss {run.bestLoss !== null ? run.bestLoss.toFixed(3) : '--'}
                        </p>
                      </div>
                      <div className="admin-actions">
                        <span className={`admin-pill admin-status-pill is-${run.status}`}>{run.status}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}

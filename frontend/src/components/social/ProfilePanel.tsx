import { Activity, Award, Camera, Clock, Edit3, Mail, Settings, ShieldCheck } from 'lucide-react'
import { useRef, useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import type { SafeUser, TrainingPost } from '../../types/social'
import './social-pages.css'

type ProfilePanelProps = {
  currentUser: SafeUser
  myPosts: TrainingPost[]
  onSaveProfile: (input: { displayName: string; bio: string }) => Promise<void>
  onUploadAvatar: (file: File) => Promise<void>
}

export function ProfilePanel({ currentUser, myPosts, onSaveProfile, onUploadAvatar }: ProfilePanelProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName)
  const [bio, setBio] = useState(currentUser.bio)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const publicCount = myPosts.filter((post) => post.isPublic).length
  const privateCount = myPosts.length - publicCount

  const performanceData = useMemo(() => {
    return myPosts.map((post, index) => ({
      name: `#${index + 1}`,
      accuracy: Number((post.training.bestAccuracy * 100).toFixed(1)),
      loss: post.training.bestLoss,
    })).slice(-10)
  }, [myPosts])

  const modelStats = useMemo(() => {
    const counts: Record<string, number> = {}
    myPosts.forEach(p => {
      counts[p.training.model] = (counts[p.training.model] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [myPosts])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSaveProfile({ displayName, bio })
    setIsEditing(false)
  }

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await onUploadAvatar(file)
  }

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=7c6cff&color=fff&size=128&bold=true`
  const avatarSrc = currentUser.avatarUrl || fallbackAvatar

  return (
    <section className="sp-root sp-profile">
      {/* Cover + Avatar */}
      <div className="sp-profile-cover">
        <div className="sp-profile-avatar-wrap">
          <img src={avatarSrc} alt="Avatar" className="sp-profile-avatar" />
          <button type="button" className="sp-avatar-upload-btn" onClick={handleAvatarClick} title="Upload photo">
            <Camera size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </div>
      </div>

      <div className="sp-body">
        {/* Identity */}
        <div className="sp-profile-identity">
          <div>
            <h1 className="sp-profile-name">
              {currentUser.displayName}
              {currentUser.role === 'admin' && <ShieldCheck size={18} className="sp-badge-icon" />}
            </h1>
            <p className="sp-profile-email"><Mail size={13} /> {currentUser.email}</p>
            <p className="sp-profile-bio">{currentUser.bio || 'No bio yet — click Edit to add one.'}</p>
          </div>
          <button type="button" className="sp-outline-btn" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel' : <><Edit3 size={14} /> Edit Profile</>}
          </button>
        </div>

        {/* Edit form */}
        {isEditing && (
          <form className="sp-edit-form" onSubmit={handleSubmit}>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Professional bio" />
            <button className="cta" type="submit" style={{ width: 'auto', alignSelf: 'flex-start' }}>Save</button>
          </form>
        )}

        {/* Metrics */}
        <div className="sp-metrics-row">
          <div className="sp-metric-card">
            <span className="sp-metric-label"><Award size={13} /> Role</span>
            <strong>{currentUser.role === 'admin' ? 'Admin' : 'Researcher'}</strong>
            <span className="sp-metric-sub">Since {new Date(currentUser.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="sp-metric-card">
            <span className="sp-metric-label"><Activity size={13} /> Experiments</span>
            <strong>{myPosts.length}</strong>
            <span className="sp-metric-sub">{publicCount} public · {privateCount} private</span>
          </div>
          <div className="sp-metric-card">
            <span className="sp-metric-label"><Clock size={13} /> Avg Accuracy</span>
            <strong>
              {myPosts.length
                ? ((myPosts.reduce((a, c) => a + c.training.bestAccuracy, 0) / myPosts.length) * 100).toFixed(1)
                : '—'}%
            </strong>
            <span className="sp-metric-sub">Across all models</span>
          </div>
        </div>

        {/* Charts */}
        <div className="sp-charts-grid">
          <div className="sp-chart-card">
            <h3>Accuracy Trend</h3>
            {performanceData.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="profAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <RechartsTooltip contentStyle={{ background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', borderRadius: 8, color: 'var(--text)' }} />
                    <Area type="monotone" dataKey="accuracy" stroke="var(--success)" strokeWidth={2} fill="url(#profAcc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="sp-empty-mini">No training data yet.</p>
            )}
          </div>
          <div className="sp-chart-card">
            <h3>Model Usage</h3>
            {modelStats.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelStats} layout="vertical" margin={{ left: 20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--surface-border)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ background: 'var(--surface-strong)', border: '1px solid var(--surface-border)', borderRadius: 8, color: 'var(--text)' }} />
                    <Bar dataKey="count" fill="var(--brand)" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="sp-empty-mini">No models trained yet.</p>
            )}
          </div>
        </div>

        {/* Recent experiments */}
        {myPosts.length > 0 && (
          <div className="sp-section">
            <h3 className="sp-section-title"><Settings size={16} /> Recent Experiments</h3>
            <div className="sp-experiments-list">
              {myPosts.slice(0, 6).map((post) => (
                <article key={post.id} className="sp-experiment-row">
                  <div className="sp-experiment-info">
                    <strong>{post.title}</strong>
                    <span>{post.training.model} · {post.training.dataset} · Epoch {post.training.epoch}</span>
                  </div>
                  <div className="sp-experiment-stats">
                    <span className="sp-stat-good">{(post.training.bestAccuracy * 100).toFixed(1)}%</span>
                    <span className={post.isPublic ? 'sp-tag-public' : 'sp-tag-private'}>{post.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

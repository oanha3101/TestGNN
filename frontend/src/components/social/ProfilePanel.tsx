import { IdCard } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { SafeUser, TrainingPost } from '../../types/social'

type ProfilePanelProps = {
  currentUser: SafeUser
  myPosts: TrainingPost[]
  onSaveProfile: (input: { displayName: string; bio: string }) => Promise<void>
}

export function ProfilePanel({ currentUser, myPosts, onSaveProfile }: ProfilePanelProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName)
  const [bio, setBio] = useState(currentUser.bio)

  const publicCount = myPosts.filter((post) => post.isPublic).length
  const privateCount = myPosts.length - publicCount

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSaveProfile({ displayName, bio })
  }

  return (
    <section className="panel social-panel profile-panel">
      <div className="social-panel-head">
        <div>
          <h2 className="panel-title">
            <IdCard size={18} />
            Profile
          </h2>
          <p className="panel-subtitle">Manage your personal identity, author bio, and training-post footprint.</p>
        </div>
      </div>

      <div className="metric-strip profile-metrics">
        <article className="metric-card">
          <span className="metric-label">Account</span>
          <strong>{currentUser.role === 'admin' ? 'Admin' : 'User'}</strong>
          <span className="metric-delta muted">{currentUser.email}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Published posts</span>
          <strong>{myPosts.length}</strong>
          <span className="metric-delta">{publicCount} public</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Private drafts</span>
          <strong>{privateCount}</strong>
          <span className="metric-delta muted">Visible only to you and admins</span>
        </article>
      </div>

      <form className="composer-grid profile-form" onSubmit={handleSubmit}>
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
        <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Short professional bio" />
        <button className="cta" type="submit">
          Save profile
        </button>
      </form>

      <div className="social-feed">
        {myPosts.length === 0 ? (
          <div className="empty-state">
            <p>Your profile is ready. Publish a training note to start building your public track record.</p>
          </div>
        ) : (
          myPosts.map((post) => (
            <article key={post.id} className="social-post social-post-compact">
              <h4>{post.title}</h4>
              <p>{post.summary}</p>
              <div className="post-training-meta">
                <span>{post.training.model}</span>
                <span>Epoch {post.training.epoch}</span>
                <span>{post.isPublic ? 'Public' : 'Private'}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

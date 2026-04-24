import { useMemo, useState } from 'react'
import { Megaphone, Users, Edit3, Send, Hash, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { PostCard } from './PostCard'
import type { ModelType, TrainingPoint } from '../../types/gnn'
import type { SafeUser, TrainingPost, UpdatePostInput } from '../../types/social'
import './social-pages.css'

type CommunityPanelProps = {
  currentUser: SafeUser | null
  users: SafeUser[]
  posts: TrainingPost[]
  vaultPostIds: Set<string>
  currentTrainingRunId: string | null
  model: ModelType
  selectedDataset: string
  currentEpoch: number
  trainingHistory: TrainingPoint[]
  onCreatePost: (input: {
    title: string
    summary: string
    content: string
    tags: string[]
    isPublic: boolean
    training: {
      runId?: string
      model: ModelType
      dataset: string
      epoch: number
      bestAccuracy: number
      bestLoss: number
    }
  }) => Promise<void>
  onUpdatePost: (input: UpdatePostInput) => Promise<void>
  onDeletePost: (postId: string) => Promise<void>
  onToggleVault: (postId: string) => Promise<void>
  onToggleLike: (postId: string) => Promise<void>
}

const parseTags = (value: string) =>
  value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)

const bestStats = (history: TrainingPoint[]) => {
  if (history.length === 0) return { bestAccuracy: 0, bestLoss: 0 }
  return {
    bestAccuracy: Math.max(...history.map((i) => i.accuracy)) / 100,
    bestLoss: Math.min(...history.map((i) => i.loss)),
  }
}

export function CommunityPanel({
  currentUser,
  users,
  posts,
  vaultPostIds,
  currentTrainingRunId,
  model,
  selectedDataset,
  currentEpoch,
  trainingHistory,
  onCreatePost,
  onUpdatePost,
  onDeletePost,
  onToggleVault,
  onToggleLike,
}: CommunityPanelProps) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('training, gnn')
  const [isPublic, setIsPublic] = useState(true)
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  const stats = useMemo(() => bestStats(trainingHistory), [trainingHistory])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onCreatePost({
      title: title.trim() || `Training update - ${model}`,
      summary: summary.trim() || `Run snapshot on ${selectedDataset}`,
      content:
        content.trim() ||
        `Model ${model} reached epoch ${currentEpoch}. Sharing a concise update from the latest training session.`,
      tags: parseTags(tags),
      isPublic,
      training: {
        runId: currentTrainingRunId ?? undefined,
        model,
        dataset: selectedDataset,
        epoch: currentEpoch,
        bestAccuracy: stats.bestAccuracy,
        bestLoss: stats.bestLoss,
      },
    })
    setTitle('')
    setSummary('')
    setContent('')
    setIsComposerOpen(false)
  }

  const fallbackAvatar = currentUser
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=7c6cff&color=fff&size=64&bold=true`
    : ''
  const avatarSrc = currentUser?.avatarUrl || fallbackAvatar

  const publicPosts = posts.filter((p) => p.isPublic)

  return (
    <section className="sp-root sp-community">
      {/* Header */}
      <div className="sp-header-card">
        <div className="sp-header-text">
          <h2><Users size={22} className="sp-header-icon" /> Community Feed</h2>
          <p>Explore published training results and experiments shared by the research community.</p>
        </div>
        {currentUser && (
          <button type="button" className="sp-outline-btn" onClick={() => setIsComposerOpen(!isComposerOpen)}>
            {isComposerOpen ? 'Close' : <><Edit3 size={14} /> Share Result</>}
          </button>
        )}
      </div>

      {/* Composer */}
      {currentUser && isComposerOpen && (
        <div className="sp-composer-card">
          <img src={avatarSrc} alt="" className="sp-composer-avatar" />
          <form className="sp-composer-form" onSubmit={handleCreate}>
            <h3><Sparkles size={16} className="sp-header-icon" /> Publish training result</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title for your experiment…" />
            <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="TL;DR summary…" />
            <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder={`What did you learn from ${model} on ${selectedDataset}?`} />
            <div className="sp-composer-tag-wrap">
              <Hash size={14} className="sp-tag-icon" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
            </div>
            <div className="sp-composer-footer">
              <label className="sp-toggle-label">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public to community
              </label>
              <button className="cta sp-publish-btn" type="submit"><Send size={14} /> Publish</button>
            </div>
          </form>
        </div>
      )}

      {/* Feed */}
      <div className="sp-feed">
        {publicPosts.length === 0 ? (
          <div className="sp-empty-card">
            <Megaphone size={40} />
            <h3>No public posts yet</h3>
            <p>Be the first to share your training results with the community!</p>
          </div>
        ) : (
          publicPosts.map((post) => {
            const author = users.find((u) => u.id === post.authorId)
            const canManage = Boolean(currentUser) && (currentUser?.role === 'admin' || currentUser?.id === post.authorId)
            return (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                authorName={author?.displayName ?? 'Unknown'}
                saved={vaultPostIds.has(post.id)}
                canManage={canManage}
                onLike={onToggleLike}
                onToggleVault={onToggleVault}
                onUpdate={onUpdatePost}
                onDelete={onDeletePost}
              />
            )
          })
        )}
      </div>
    </section>
  )
}

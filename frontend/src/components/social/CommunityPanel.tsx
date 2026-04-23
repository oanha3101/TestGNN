import { useMemo, useState } from 'react'
import { Megaphone } from 'lucide-react'
import type { FormEvent } from 'react'
import { PostCard } from './PostCard'
import type { ModelType, TrainingPoint } from '../../types/gnn'
import type { SafeUser, TrainingPost, UpdatePostInput } from '../../types/social'

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

const parseTags = (value: string) => {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

const bestStats = (history: TrainingPoint[]) => {
  if (history.length === 0) return { bestAccuracy: 0, bestLoss: 0 }
  const bestAccuracy = Math.max(...history.map((item) => item.accuracy)) / 100
  const bestLoss = Math.min(...history.map((item) => item.loss))
  return { bestAccuracy, bestLoss }
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
  }

  return (
    <section className="panel social-panel">
      <h2 className="panel-title">
        <Megaphone size={18} />
        Community Feed
      </h2>
      <p className="panel-subtitle">Publish training updates, share results, and discuss experiments with the community.</p>

      {currentUser ? (
        <form className="composer-grid" onSubmit={handleCreate}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Training post title"
          />
          <input
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Short summary"
          />
          <textarea
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share insights from this training run..."
          />
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tag1, tag2, tag3" />
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            Share publicly with the community
          </label>
          <button className="cta" type="submit">
            Publish training post
          </button>
        </form>
      ) : null}

      <div className="social-feed">
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No posts yet.</p>
          </div>
        ) : (
          posts.map((post) => {
            const author = users.find((user) => user.id === post.authorId)
            const canManage =
              Boolean(currentUser) && (currentUser?.role === 'admin' || currentUser?.id === post.authorId)
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

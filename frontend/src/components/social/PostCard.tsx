import { Bookmark, Heart, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { SafeUser, TrainingPost, UpdatePostInput } from '../../types/social'

type PostCardProps = {
  post: TrainingPost
  currentUser: SafeUser | null
  authorName: string
  saved: boolean
  canManage: boolean
  onLike: (postId: string) => Promise<void>
  onToggleVault: (postId: string) => Promise<void>
  onUpdate: (input: UpdatePostInput) => Promise<void>
  onDelete: (postId: string) => Promise<void>
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const parseTags = (value: string) => {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

export function PostCard({
  post,
  currentUser,
  authorName,
  saved,
  canManage,
  onLike,
  onToggleVault,
  onUpdate,
  onDelete,
}: PostCardProps) {
  const [editMode, setEditMode] = useState(false)
  const [title, setTitle] = useState(post.title)
  const [summary, setSummary] = useState(post.summary)
  const [content, setContent] = useState(post.content)
  const [tags, setTags] = useState(post.tags.join(', '))
  const [isPublic, setIsPublic] = useState(post.isPublic)

  const liked = useMemo(() => {
    if (!currentUser) return false
    return post.likeUserIds.includes(currentUser.id)
  }, [currentUser, post.likeUserIds])

  return (
    <article className="social-post">
      <header className="social-post-head">
        <div>
          <h4>{post.title}</h4>
          <p>
            {authorName} | {formatDate(post.updatedAt)} | {post.isPublic ? 'Public' : 'Private'}
          </p>
        </div>
        <div className="chip-row">
          {post.tags.map((tag) => (
            <span key={`${post.id}-${tag}`} className="chip-mini">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {editMode ? (
        <div className="post-edit-grid">
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
          <input value={summary} onChange={(event) => setSummary(event.target.value)} />
          <textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} />
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tag1, tag2" />
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            Share publicly
          </label>
          <div className="chip-row">
            <button
              type="button"
              className="toggle toggle-active"
              onClick={async () => {
                await onUpdate({
                  postId: post.id,
                  title,
                  summary,
                  content,
                  tags: parseTags(tags),
                  isPublic,
                })
                setEditMode(false)
              }}
            >
              Save changes
            </button>
            <button type="button" className="toggle" onClick={() => setEditMode(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="social-post-body">
          <p className="post-summary">{post.summary}</p>
          <p>{post.content}</p>
          <div className="post-training-meta">
            <span>{post.training.model}</span>
            <span>{post.training.dataset}</span>
            <span>Epoch {post.training.epoch}</span>
            <span>Acc {(post.training.bestAccuracy * 100).toFixed(1)}%</span>
            <span>Loss {post.training.bestLoss.toFixed(3)}</span>
          </div>
        </div>
      )}

      <footer className="social-post-actions">
        <button type="button" className={liked ? 'chip chip-active' : 'chip'} onClick={() => onLike(post.id)}>
          <Heart size={14} />
          {post.likeUserIds.length}
        </button>
        {currentUser ? (
          <button type="button" className={saved ? 'chip chip-active' : 'chip'} onClick={() => onToggleVault(post.id)}>
            <Bookmark size={14} />
            {saved ? 'Saved' : 'Save to Vault'}
          </button>
        ) : null}
        {canManage ? (
          <>
            <button type="button" className="chip" onClick={() => setEditMode((prev) => !prev)}>
              <Pencil size={14} />
              Edit
            </button>
            <button type="button" className="chip" onClick={() => onDelete(post.id)}>
              <Trash2 size={14} />
              Delete
            </button>
          </>
        ) : null}
      </footer>
    </article>
  )
}

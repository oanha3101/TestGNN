import { Archive, FolderOpen, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { PostCard } from './PostCard'
import type { SafeUser, TrainingPost, UpdatePostInput, VaultItem } from '../../types/social'
import './social-pages.css'

type VaultPanelProps = {
  currentUser: SafeUser
  users: SafeUser[]
  posts: TrainingPost[]
  vault: VaultItem[]
  onToggleVault: (postId: string) => Promise<void>
  onToggleLike: (postId: string) => Promise<void>
  onUpdatePost: (input: UpdatePostInput) => Promise<void>
  onDeletePost: (postId: string) => Promise<void>
}

export function VaultPanel({
  currentUser,
  users,
  posts,
  vault,
  onToggleVault,
  onToggleLike,
  onUpdatePost,
  onDeletePost,
}: VaultPanelProps) {
  const [search, setSearch] = useState('')

  const savedPostIds = new Set(vault.filter((item) => item.userId === currentUser.id).map((item) => item.postId))
  const allSaved = posts.filter((post) => savedPostIds.has(post.id))

  // The vault is YOUR personal storage — includes both private and public posts you authored or bookmarked.
  const filteredPosts = useMemo(() => {
    if (!search.trim()) return allSaved
    const q = search.toLowerCase()
    return allSaved.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.training.model.toLowerCase().includes(q) ||
        p.training.dataset.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [allSaved, search])

  const completedRuns = allSaved.filter((p) => p.training.bestAccuracy > 0).length
  const avgAccuracy = allSaved.length
    ? (allSaved.reduce((a, c) => a + c.training.bestAccuracy, 0) / allSaved.length * 100).toFixed(1)
    : '—'

  return (
    <section className="sp-root sp-vault">
      {/* Dark header */}
      <div className="sp-vault-header">
        <div>
          <h2><Archive size={24} /> Research Vault</h2>
          <p>Your personal storage for training results, bookmarked experiments, and saved research.</p>
        </div>
        <div className="sp-vault-stats-row">
          <div className="sp-vault-stat">
            <span className="sp-vault-stat-num">{allSaved.length}</span>
            <span className="sp-vault-stat-label">Saved</span>
          </div>
          <div className="sp-vault-stat">
            <span className="sp-vault-stat-num">{completedRuns}</span>
            <span className="sp-vault-stat-label">Trained</span>
          </div>
          <div className="sp-vault-stat">
            <span className="sp-vault-stat-num">{avgAccuracy}%</span>
            <span className="sp-vault-stat-label">Avg Acc</span>
          </div>
        </div>
      </div>

      {/* Search */}
      {allSaved.length > 0 && (
        <div className="sp-vault-search-wrap">
          <Search size={16} className="sp-vault-search-icon" />
          <input
            className="sp-vault-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault by title, model, dataset, or tag…"
          />
        </div>
      )}

      {/* Feed */}
      <div className="sp-feed sp-vault-feed">
        {filteredPosts.length === 0 ? (
          <div className="sp-empty-card">
            <FolderOpen size={40} />
            <h3>{search ? 'No matches found' : 'Your vault is empty'}</h3>
            <p>{search
              ? 'Try a different search term.'
              : 'Bookmark posts from Community or save your own training results here.'}</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const author = users.find((u) => u.id === post.authorId)
            const canManage = currentUser.role === 'admin' || currentUser.id === post.authorId
            return (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                authorName={author?.displayName ?? 'Unknown'}
                saved
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

import { Archive } from 'lucide-react'
import { PostCard } from './PostCard'
import type { SafeUser, TrainingPost, UpdatePostInput, VaultItem } from '../../types/social'

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
  const savedPostIds = new Set(vault.filter((item) => item.userId === currentUser.id).map((item) => item.postId))
  const savedPosts = posts.filter((post) => savedPostIds.has(post.id))

  return (
    <section className="panel social-panel vault-panel">
      <div className="social-panel-head">
        <div>
          <h2 className="panel-title">
            <Archive size={18} />
            Research Vault
          </h2>
          <p className="panel-subtitle">Private bookmark space for high-signal training posts and reusable references.</p>
        </div>
        <div className="topbar-chip">{savedPosts.length} saved items</div>
      </div>

      <div className="social-feed">
        {savedPosts.length === 0 ? (
          <div className="empty-state">
            <p>Your vault is empty. Save a post from Community to build a curated knowledge shelf.</p>
          </div>
        ) : (
          savedPosts.map((post) => {
            const author = users.find((user) => user.id === post.authorId)
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

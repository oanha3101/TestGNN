import type {
  AuthResult,
  AdminOverview,
  CreatePostInput,
  SafeUser,
  SocialSnapshot,
  TrainingPost,
  UpdatePostInput,
  UpdateProfileInput,
  UserRole,
  UserStatus,
  VaultItem,
} from '../types/social'
import {
  TOKEN_STORAGE_KEY as TOKEN_KEY,
  apiClient as api,
  extractErrorMessage,
} from './client'

type ApiUser = {
  id: number
  email: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  created_at: string
}

type ApiAuthResponse = {
  access_token: string
  token_type: string
  user: ApiUser
}

type ApiPost = {
  id: number
  title: string
  summary: string
  content: string
  tags: string[]
  is_public: boolean
  moderation_status: string
  author: ApiUser
  like_count: number
  liked: boolean
  bookmarked: boolean
  training: {
    run_id: number | null
    model: 'GCN' | 'GAT' | 'GraphSAGE' | 'GraphTransformer'
    dataset: string
    epoch: number
    best_accuracy: number
    best_loss: number
  }
  created_at: string
  updated_at: string
}

type ApiBookmark = {
  id: number
  post: ApiPost
  note: string | null
  created_at: string
}

type ApiAdminOverview = {
  total_users: number
  active_users: number
  suspended_users: number
  total_posts: number
  public_posts: number
  private_posts: number
}

const toSafeUser = (user: ApiUser): SafeUser => ({
  id: String(user.id),
  email: user.email,
  displayName: user.display_name,
  bio: user.bio ?? '',
  avatarUrl: user.avatar_url ?? null,
  role: user.role,
  status: user.status,
  createdAt: new Date(user.created_at).getTime(),
})

const toAdminOverview = (overview: ApiAdminOverview): AdminOverview => ({
  totalUsers: overview.total_users,
  activeUsers: overview.active_users,
  suspendedUsers: overview.suspended_users,
  totalPosts: overview.total_posts,
  publicPosts: overview.public_posts,
  privatePosts: overview.private_posts,
})

const toTrainingPost = (post: ApiPost): TrainingPost => {
  const likedIds = post.liked ? ['__self__', ...Array.from({ length: Math.max(0, post.like_count - 1) }, (_, index) => `__other_${index}`)] : Array.from({ length: post.like_count }, (_, index) => `__other_${index}`)
  return {
    id: String(post.id),
    authorId: String(post.author.id),
    title: post.title,
    summary: post.summary,
    content: post.content,
    tags: post.tags ?? [],
    isPublic: post.is_public,
    likeUserIds: likedIds,
    training: {
      runId: post.training.run_id ? String(post.training.run_id) : undefined,
      model: post.training.model,
      dataset: post.training.dataset,
      epoch: post.training.epoch,
      bestAccuracy: post.training.best_accuracy,
      bestLoss: post.training.best_loss,
    },
    createdAt: new Date(post.created_at).getTime(),
    updatedAt: new Date(post.updated_at).getTime(),
  }
}

const setToken = (token: string | null) => {
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY)
    return
  }
  window.localStorage.setItem(TOKEN_KEY, token)
}

const loadCurrentUser = async () => {
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  try {
    const response = await api.get<ApiAuthResponse>('/auth/me')
    setToken(response.data.access_token)
    return toSafeUser(response.data.user)
  } catch {
    setToken(null)
    return null
  }
}

type ApiPage<T> = { items: T[]; total: number; limit: number; offset: number }

const loadPosts = async (): Promise<ApiPost[]> => {
  // Backend paginates; we pull the max page (100) for the community feed.
  const response = await api.get<ApiPage<ApiPost>>('/posts', {
    params: { limit: 100, offset: 0 },
  })
  return response.data.items
}

const loadBookmarks = async (): Promise<ApiBookmark[]> => {
  const response = await api.get<ApiBookmark[]>('/bookmarks')
  return response.data
}

const loadAdminUsers = async () => {
  const response = await api.get<ApiPage<ApiUser>>('/admin/users', {
    params: { limit: 100, offset: 0 },
  })
  return response.data.items
}

const loadAdminOverview = async () => {
  const response = await api.get<ApiAdminOverview>('/admin/overview')
  return response.data
}

export const getSocialSnapshot = async (): Promise<SocialSnapshot> => {
  const currentUser = await loadCurrentUser()
  if (!currentUser) {
    return { currentUser: null, users: [], posts: [], vault: [], adminOverview: null }
  }

  try {
    const postsRaw = await loadPosts()
    const posts = postsRaw.map(toTrainingPost)

    const usersMap = new Map<string, SafeUser>()
    usersMap.set(currentUser.id, currentUser)
    for (const post of postsRaw) {
      usersMap.set(String(post.author.id), toSafeUser(post.author))
    }

    let adminOverview: AdminOverview | null = null
    if (currentUser.role === 'admin') {
      const adminUsers = await loadAdminUsers()
      for (const user of adminUsers) {
        usersMap.set(String(user.id), toSafeUser(user))
      }
      adminOverview = toAdminOverview(await loadAdminOverview())
    }

    const bookmarksRaw = await loadBookmarks()
    const vault: VaultItem[] = bookmarksRaw.map((item) => ({
      id: String(item.id),
      userId: currentUser.id,
      postId: String(item.post.id),
      note: item.note ?? '',
      createdAt: new Date(item.created_at).getTime(),
    }))

    return {
      currentUser,
      users: Array.from(usersMap.values()),
      posts,
      vault,
      adminOverview,
    }
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const registerUser = async ({
  email,
  password,
  displayName,
  acceptTerms,
}: {
  email: string
  password: string
  displayName: string
  acceptTerms: boolean
}): Promise<AuthResult> => {
  try {
    const response = await api.post<ApiAuthResponse>('/auth/register', {
      email,
      password,
      display_name: displayName,
      accept_terms: acceptTerms,
    })
    setToken(response.data.access_token)
    return { user: toSafeUser(response.data.user) }
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export type ForgotPasswordResponse = {
  message: string
  delivery: 'email' | 'log-only' | 'none'
  reset_url: string | null
}

export const requestPasswordReset = async (email: string): Promise<ForgotPasswordResponse> => {
  try {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const submitPasswordReset = async ({
  token,
  password,
}: {
  token: string
  password: string
}): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      password,
    })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const loginUser = async ({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<AuthResult> => {
  try {
    const response = await api.post<ApiAuthResponse>('/auth/login', { email, password })
    setToken(response.data.access_token)
    return { user: toSafeUser(response.data.user) }
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout')
  } catch {
    // no-op on logout
  } finally {
    setToken(null)
  }
}

export const createTrainingPost = async (input: CreatePostInput): Promise<TrainingPost> => {
  try {
    const response = await api.post<ApiPost>('/posts', {
      title: input.title,
      summary: input.summary,
      content: input.content,
      tags: input.tags,
      is_public: input.isPublic,
      training: {
        run_id: input.training.runId ? Number(input.training.runId) : null,
        model: input.training.model,
        dataset: input.training.dataset,
        epoch: input.training.epoch,
        best_accuracy: input.training.bestAccuracy,
        best_loss: input.training.bestLoss,
      },
    })
    return toTrainingPost(response.data)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const updateTrainingPost = async (input: UpdatePostInput): Promise<TrainingPost> => {
  try {
    const response = await api.patch<ApiPost>(`/posts/${Number(input.postId)}`, {
      title: input.title,
      summary: input.summary,
      content: input.content,
      tags: input.tags,
      is_public: input.isPublic,
    })
    return toTrainingPost(response.data)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const deleteTrainingPost = async (postId: string) => {
  try {
    await api.delete(`/posts/${Number(postId)}`)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const likePost = async (postId: string) => {
  try {
    await api.post(`/posts/${Number(postId)}/like`)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const toggleVaultPost = async ({
  postId,
}: {
  postId: string
  note?: string
}) => {
  try {
    await api.post(`/posts/${Number(postId)}/bookmark`)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const updateProfile = async (input: UpdateProfileInput): Promise<SafeUser> => {
  try {
    const response = await api.patch<ApiUser>('/profile', {
      display_name: input.displayName,
      bio: input.bio,
      avatar_url: input.avatarUrl ?? undefined,
    })
    return toSafeUser(response.data)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const uploadAvatar = async (file: File): Promise<SafeUser> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<ApiUser>('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return toSafeUser(response.data)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const adminSetUserRole = async ({
  userId,
  role,
}: {
  userId: string
  role: UserRole
}) => {
  try {
    await api.patch(`/admin/users/${Number(userId)}/role`, { role })
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const adminSetUserStatus = async ({
  userId,
  status,
}: {
  userId: string
  status: UserStatus
}) => {
  try {
    await api.patch(`/admin/users/${Number(userId)}/status`, { status })
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const adminDeletePost = async (postId: string) => {
  try {
    await api.delete(`/admin/posts/${Number(postId)}`)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

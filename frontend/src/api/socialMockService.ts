import type {
  AuthResult,
  CreatePostInput,
  SafeUser,
  SocialSnapshot,
  SocialStatePayload,
  TrainingPost,
  UpdatePostInput,
  UpdateProfileInput,
  UserAccount,
  UserRole,
  UserStatus,
  VaultItem,
} from '../types/social'

const STORAGE_KEY = 'gnnvp-social-v1'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const toSafeUser = (user: UserAccount): SafeUser => {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  }
}

const parseStorage = (): SocialStatePayload | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SocialStatePayload
  } catch {
    return null
  }
}

const sampleSeed = (): SocialStatePayload => {
  const now = Date.now()
  const admin: UserAccount = {
    id: 'u-admin',
    email: 'admin@gnn-vp.local',
    password: 'admin123',
    displayName: 'Admin GNN',
    bio: 'System administrator for GNN-VP.',
    role: 'admin',
    status: 'active',
    createdAt: now - 1000 * 60 * 60 * 24 * 10,
  }
  const researcher: UserAccount = {
    id: 'u-researcher',
    email: 'researcher@gnn-vp.local',
    password: 'research123',
    displayName: 'Research Demo',
    bio: 'Working on explainability experiments for graph learning.',
    role: 'user',
    status: 'active',
    createdAt: now - 1000 * 60 * 60 * 24 * 4,
  }

  const post: TrainingPost = {
    id: 'p-seed-1',
    authorId: researcher.id,
    title: 'GAT run with higher confidence on class-2 nodes',
    summary: 'Sharing a quick snapshot from my latest training session on Cora.',
    content:
      'Epoch 120 gave stable convergence with strong edge attention around central hubs. I used this run to compare explainability outputs between two thresholds.',
    tags: ['gat', 'cora', 'attention'],
    isPublic: true,
    likeUserIds: [admin.id],
    training: {
      model: 'GAT',
      dataset: 'Cora Citation Network',
      epoch: 120,
      bestAccuracy: 0.887,
      bestLoss: 0.238,
    },
    createdAt: now - 1000 * 60 * 60 * 9,
    updatedAt: now - 1000 * 60 * 60 * 9,
  }

  return {
    users: [admin, researcher],
    posts: [post],
    vault: [],
    currentUserId: researcher.id,
  }
}

const readState = (): SocialStatePayload => {
  const existing = parseStorage()
  if (existing) return existing
  const seeded = sampleSeed()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

const writeState = (state: SocialStatePayload) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const mapSnapshot = (state: SocialStatePayload): SocialSnapshot => {
  const users = state.users.map(toSafeUser)
  const currentUser = state.users.find((user) => user.id === state.currentUserId)
  const totalPosts = state.posts.length
  const publicPosts = state.posts.filter((post) => post.isPublic).length
  return {
    users,
    posts: [...state.posts].sort((a, b) => b.updatedAt - a.updatedAt),
    vault: [...state.vault].sort((a, b) => b.createdAt - a.createdAt),
    currentUser: currentUser ? toSafeUser(currentUser) : null,
    adminOverview: currentUser?.role === 'admin'
      ? {
          totalUsers: users.length,
          activeUsers: users.filter((user) => user.status === 'active').length,
          suspendedUsers: users.filter((user) => user.status === 'suspended').length,
          totalPosts,
          publicPosts,
          privatePosts: totalPosts - publicPosts,
        }
      : null,
  }
}

const requireCurrentUser = (state: SocialStatePayload) => {
  const user = state.users.find((item) => item.id === state.currentUserId)
  if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.')
  if (user.status !== 'active') throw new Error('Tài khoản đang bị tạm khóa.')
  return user
}

const sanitizeTags = (tags: string[]) => {
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .slice(0, 8)
}

export const getSocialSnapshot = async (): Promise<SocialSnapshot> => {
  await delay(120)
  return mapSnapshot(readState())
}

export const registerUser = async ({
  email,
  password,
  displayName,
}: {
  email: string
  password: string
  displayName: string
}): Promise<AuthResult> => {
  await delay(180)
  const state = readState()
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail.includes('@')) throw new Error('Email không hợp lệ.')
  if (password.trim().length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự.')
  if (state.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Email đã tồn tại.')
  }

  const user: UserAccount = {
    id: `u-${Math.random().toString(36).slice(2, 9)}`,
    email: normalizedEmail,
    password,
    displayName: displayName.trim() || 'New User',
    bio: 'New member in GNN-VP community.',
    role: 'user',
    status: 'active',
    createdAt: Date.now(),
  }
  state.users.push(user)
  state.currentUserId = user.id
  writeState(state)
  return { user: toSafeUser(user) }
}

export const loginUser = async ({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<AuthResult> => {
  await delay(150)
  const state = readState()
  const normalizedEmail = email.trim().toLowerCase()
  const user = state.users.find((item) => item.email.toLowerCase() === normalizedEmail)
  if (!user || user.password !== password) {
    throw new Error('Sai email hoặc mật khẩu.')
  }
  if (user.status !== 'active') {
    throw new Error('Tài khoản đang bị tạm khóa.')
  }
  state.currentUserId = user.id
  writeState(state)
  return { user: toSafeUser(user) }
}

export const logoutUser = async () => {
  await delay(80)
  const state = readState()
  state.currentUserId = null
  writeState(state)
}

export const createTrainingPost = async (input: CreatePostInput): Promise<TrainingPost> => {
  await delay(140)
  const state = readState()
  const user = requireCurrentUser(state)
  if (!input.title.trim()) throw new Error('Tiêu đề bài viết là bắt buộc.')
  if (!input.content.trim()) throw new Error('Nội dung bài viết không được để trống.')

  const now = Date.now()
  const post: TrainingPost = {
    id: `p-${Math.random().toString(36).slice(2, 10)}`,
    authorId: user.id,
    title: input.title.trim(),
    summary: input.summary.trim() || 'Training update',
    content: input.content.trim(),
    tags: sanitizeTags(input.tags),
    isPublic: input.isPublic,
    likeUserIds: [],
    training: input.training,
    createdAt: now,
    updatedAt: now,
  }
  state.posts.unshift(post)
  writeState(state)
  return post
}

export const updateTrainingPost = async (input: UpdatePostInput): Promise<TrainingPost> => {
  await delay(140)
  const state = readState()
  const user = requireCurrentUser(state)
  const post = state.posts.find((item) => item.id === input.postId)
  if (!post) throw new Error('Không tìm thấy bài viết.')
  if (post.authorId !== user.id && user.role !== 'admin') {
    throw new Error('Bạn không có quyền sửa bài viết này.')
  }

  post.title = input.title.trim() || post.title
  post.summary = input.summary.trim() || post.summary
  post.content = input.content.trim() || post.content
  post.tags = sanitizeTags(input.tags)
  post.isPublic = input.isPublic
  post.updatedAt = Date.now()
  writeState(state)
  return post
}

export const deleteTrainingPost = async (postId: string) => {
  await delay(120)
  const state = readState()
  const user = requireCurrentUser(state)
  const post = state.posts.find((item) => item.id === postId)
  if (!post) throw new Error('Không tìm thấy bài viết.')
  if (post.authorId !== user.id && user.role !== 'admin') {
    throw new Error('Bạn không có quyền xóa bài viết này.')
  }
  state.posts = state.posts.filter((item) => item.id !== postId)
  state.vault = state.vault.filter((item) => item.postId !== postId)
  writeState(state)
}

export const likePost = async (postId: string) => {
  await delay(80)
  const state = readState()
  const user = requireCurrentUser(state)
  const post = state.posts.find((item) => item.id === postId)
  if (!post) throw new Error('Không tìm thấy bài viết.')
  if (post.likeUserIds.includes(user.id)) {
    post.likeUserIds = post.likeUserIds.filter((id) => id !== user.id)
  } else {
    post.likeUserIds.push(user.id)
  }
  post.updatedAt = Date.now()
  writeState(state)
}

export const toggleVaultPost = async ({
  postId,
  note,
}: {
  postId: string
  note?: string
}) => {
  await delay(90)
  const state = readState()
  const user = requireCurrentUser(state)
  const existing = state.vault.find((item) => item.userId === user.id && item.postId === postId)
  if (existing) {
    state.vault = state.vault.filter((item) => item.id !== existing.id)
  } else {
    const item: VaultItem = {
      id: `v-${Math.random().toString(36).slice(2, 9)}`,
      userId: user.id,
      postId,
      note: note?.trim() ?? '',
      createdAt: Date.now(),
    }
    state.vault.push(item)
  }
  writeState(state)
}

export const updateProfile = async (input: UpdateProfileInput): Promise<SafeUser> => {
  await delay(120)
  const state = readState()
  const user = requireCurrentUser(state)
  user.displayName = input.displayName.trim() || user.displayName
  user.bio = input.bio.trim() || ''
  writeState(state)
  return toSafeUser(user)
}

export const adminSetUserRole = async ({
  userId,
  role,
}: {
  userId: string
  role: UserRole
}) => {
  await delay(90)
  const state = readState()
  const current = requireCurrentUser(state)
  if (current.role !== 'admin') throw new Error('Chỉ admin mới có quyền thao tác.')
  const target = state.users.find((item) => item.id === userId)
  if (!target) throw new Error('Không tìm thấy user.')
  target.role = role
  writeState(state)
}

export const adminSetUserStatus = async ({
  userId,
  status,
}: {
  userId: string
  status: UserStatus
}) => {
  await delay(90)
  const state = readState()
  const current = requireCurrentUser(state)
  if (current.role !== 'admin') throw new Error('Chỉ admin mới có quyền thao tác.')
  const target = state.users.find((item) => item.id === userId)
  if (!target) throw new Error('Không tìm thấy user.')
  target.status = status
  if (status === 'suspended' && state.currentUserId === userId) {
    state.currentUserId = null
  }
  writeState(state)
}

export const adminDeletePost = async (postId: string) => {
  await deleteTrainingPost(postId)
}

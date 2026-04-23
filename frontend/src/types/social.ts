import type { ModelType } from './gnn'

export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'suspended'

export type AdminOverview = {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  totalPosts: number
  publicPosts: number
  privatePosts: number
}

export type UserAccount = {
  id: string
  email: string
  password: string
  displayName: string
  bio: string
  role: UserRole
  status: UserStatus
  createdAt: number
}

export type SafeUser = Omit<UserAccount, 'password'>

export type TrainingSnapshot = {
  runId?: string
  model: ModelType
  dataset: string
  epoch: number
  bestAccuracy: number
  bestLoss: number
}

export type TrainingPost = {
  id: string
  authorId: string
  title: string
  summary: string
  content: string
  tags: string[]
  isPublic: boolean
  likeUserIds: string[]
  training: TrainingSnapshot
  createdAt: number
  updatedAt: number
}

export type VaultItem = {
  id: string
  userId: string
  postId: string
  note: string
  createdAt: number
}

export type SocialStatePayload = {
  users: UserAccount[]
  posts: TrainingPost[]
  vault: VaultItem[]
  currentUserId: string | null
}

export type AuthResult = {
  user: SafeUser
}

export type SocialSnapshot = {
  users: SafeUser[]
  posts: TrainingPost[]
  vault: VaultItem[]
  currentUser: SafeUser | null
  adminOverview: AdminOverview | null
}

export type CreatePostInput = {
  title: string
  summary: string
  content: string
  tags: string[]
  isPublic: boolean
  training: TrainingSnapshot
}

export type UpdatePostInput = {
  postId: string
  title: string
  summary: string
  content: string
  tags: string[]
  isPublic: boolean
}

export type UpdateProfileInput = {
  displayName: string
  bio: string
}

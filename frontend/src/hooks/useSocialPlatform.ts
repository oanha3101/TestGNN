import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminDeletePost,
  adminSetUserRole,
  adminSetUserStatus,
  createTrainingPost,
  deleteTrainingPost,
  getSocialSnapshot,
  likePost,
  loginUser,
  logoutUser,
  registerUser,
  toggleVaultPost,
  updateProfile,
  updateTrainingPost,
  uploadAvatar as uploadAvatarApi,
} from '../api/socialApiService'
import type {
  AdminOverview,
  CreatePostInput,
  SafeUser,
  TrainingPost,
  UpdatePostInput,
  UserRole,
  UserStatus,
  VaultItem,
} from '../types/social'

type AuthLoginInput = { email: string; password: string }
type AuthRegisterInput = {
  displayName: string
  email: string
  password: string
  acceptTerms: boolean
}
type UpdateProfileInput = { displayName: string; bio: string; avatarUrl?: string | null }

export function useSocialPlatform() {
  const [users, setUsers] = useState<SafeUser[]>([])
  const [posts, setPosts] = useState<TrainingPost[]>([])
  const [vault, setVault] = useState<VaultItem[]>([])
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null)
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const snapshot = await getSocialSnapshot()
    setUsers(snapshot.users)
    setPosts(snapshot.posts)
    setVault(snapshot.vault)
    setCurrentUser(snapshot.currentUser)
    setAdminOverview(snapshot.adminOverview)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const snapshot = await getSocialSnapshot()
        if (!active) return
        setUsers(snapshot.users)
        setPosts(snapshot.posts)
        setVault(snapshot.vault)
        setCurrentUser(snapshot.currentUser)
        setAdminOverview(snapshot.adminOverview)
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const withAction = useCallback(
    async (action: () => Promise<void>) => {
      setIsBusy(true)
      setError(null)
      try {
        await action()
      } catch (actionError) {
        const fallbackMessage = 'Something went wrong.'
        const message = actionError instanceof Error ? actionError.message : fallbackMessage
        setError(message)
      } finally {
        setIsBusy(false)
      }
    },
    [],
  )

  const login = useCallback(
    async (input: AuthLoginInput) => {
      await withAction(async () => {
        await loginUser(input)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const register = useCallback(
    async (input: AuthRegisterInput) => {
      await withAction(async () => {
        await registerUser(input)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const logout = useCallback(async () => {
    await withAction(async () => {
      await logoutUser()
      await refresh()
    })
  }, [refresh, withAction])

  const createPost = useCallback(
    async (input: CreatePostInput) => {
      await withAction(async () => {
        await createTrainingPost(input)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const updatePost = useCallback(
    async (input: UpdatePostInput) => {
      await withAction(async () => {
        await updateTrainingPost(input)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const deletePost = useCallback(
    async (postId: string) => {
      await withAction(async () => {
        await deleteTrainingPost(postId)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const toggleVault = useCallback(
    async (postId: string) => {
      await withAction(async () => {
        await toggleVaultPost({ postId })
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const toggleLike = useCallback(
    async (postId: string) => {
      await withAction(async () => {
        await likePost(postId)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const saveProfile = useCallback(
    async (input: UpdateProfileInput) => {
      await withAction(async () => {
        await updateProfile(input)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const uploadAvatarAction = useCallback(
    async (file: File) => {
      await withAction(async () => {
        await uploadAvatarApi(file)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const setUserRole = useCallback(
    async (userId: string, role: UserRole) => {
      await withAction(async () => {
        await adminSetUserRole({ userId, role })
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const setUserStatus = useCallback(
    async (userId: string, status: UserStatus) => {
      await withAction(async () => {
        await adminSetUserStatus({ userId, status })
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const removePostAsAdmin = useCallback(
    async (postId: string) => {
      await withAction(async () => {
        await adminDeletePost(postId)
        await refresh()
      })
    },
    [refresh, withAction],
  )

  const vaultPostIds = useMemo(() => {
    if (!currentUser) return new Set<string>()
    return new Set(vault.filter((item) => item.userId === currentUser.id).map((item) => item.postId))
  }, [currentUser, vault])

  const myPosts = useMemo(() => {
    if (!currentUser) return []
    return posts.filter((post) => post.authorId === currentUser.id)
  }, [currentUser, posts])

  const visiblePosts = useMemo(() => {
    if (!currentUser) return posts.filter((post) => post.isPublic)
    return posts.filter((post) => post.isPublic || post.authorId === currentUser.id || currentUser.role === 'admin')
  }, [currentUser, posts])

  return {
    users,
    posts: visiblePosts,
    allPosts: posts,
    myPosts,
    vault,
    vaultPostIds,
    currentUser,
    adminOverview,
    isLoading,
    isBusy,
    error,
    clearError: () => setError(null),
    login,
    register,
    logout,
    createPost,
    updatePost,
    deletePost,
    toggleVault,
    toggleLike,
    saveProfile,
    uploadAvatar: uploadAvatarAction,
    setUserRole,
    setUserStatus,
    removePostAsAdmin,
  }
}

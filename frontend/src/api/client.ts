import axios, { AxiosError, type AxiosInstance } from 'axios'

/**
 * Shared axios client for the whole frontend.
 *
 * Before this file existed, phase1MockService and socialApiService each
 * constructed their own axios instance, duplicating the baseURL normalization,
 * the token interceptor, and the error-detail extraction. They silently drifted
 * — for example only phase1 set a 10s timeout. Everything now flows through
 * this one instance.
 */

export const TOKEN_STORAGE_KEY = 'gnnvp-access-token'

export const API_HTTP_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`
})()

/** Same origin as the HTTP API, rewritten to ws:// or wss://. */
export const API_WS_BASE = API_HTTP_BASE.replace(/^http/, 'ws')

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_HTTP_BASE,
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ detail?: unknown }>
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string }
      if (first?.msg) return first.msg
    }
    return err.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

export const getAccessToken = (): string | null =>
  window.localStorage.getItem(TOKEN_STORAGE_KEY)

export const setAccessToken = (token: string | null): void => {
  if (token === null) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }
}

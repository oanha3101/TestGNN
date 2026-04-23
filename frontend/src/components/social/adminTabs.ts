// Separated from AdminPanel.tsx so that file can export only the component,
// keeping Vite's Fast Refresh happy (see react-refresh/only-export-components).

export type AdminTab = 'overview' | 'users' | 'moderation' | 'training'

export const adminTabs: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Access' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'training', label: 'Training Runs' },
]

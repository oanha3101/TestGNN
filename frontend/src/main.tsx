import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './workspace.css'
import App from './App.tsx'
import { UniverseBackground } from './components/background/UniverseBackground'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UniverseBackground />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

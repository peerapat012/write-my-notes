import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dev-only component sheet at /dev/ui; the ternary drops it (and its chunk) from production builds.
const DevUi = import.meta.env.DEV && location.pathname === '/dev/ui' ? lazy(() => import('./DevUi')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {DevUi ? (
      <Suspense>
        <DevUi />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

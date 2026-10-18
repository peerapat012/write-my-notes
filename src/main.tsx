import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/desktop'
import App from './App.tsx'

// Dev-only component sheet at /dev/ui; the ternary drops it (and its chunk) from production builds.
const DevUi = import.meta.env.DEV && location.pathname === '/dev/ui' ? lazy(() => import('./DevUi')) : null
const DevUiAffine = import.meta.env.DEV && location.pathname === '/dev/ui/affine' ? lazy(() => import('./DevUiAffine')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {DevUi || DevUiAffine ? (
      <Suspense>{DevUi ? <DevUi /> : DevUiAffine ? <DevUiAffine /> : null}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

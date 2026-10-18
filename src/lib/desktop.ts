import { isTauri } from './fs'

/** Webview defaults that get in the way of the app, switched off in the desktop build only. */
if (isTauri) {
  // Reload (F5, Ctrl+R) would drop unsaved edits and the open page. Capture phase: before the editors see the key.
  addEventListener(
    'keydown',
    (e) => {
      if (e.code === 'F5' || ((e.ctrlKey || e.metaKey) && e.code === 'KeyR')) e.preventDefault()
    },
    true,
  )
  // The browser context menu (Reload, Inspect...) makes no sense outside text, where copy and paste still need it.
  addEventListener('contextmenu', (e) => {
    if (!(e.target as Element).closest('input, textarea, [contenteditable="true"]')) e.preventDefault()
  })
}

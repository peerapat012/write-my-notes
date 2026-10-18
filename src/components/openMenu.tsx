import { createRoot } from 'react-dom/client'
import Menu, { type MenuGroup } from './Menu'

/** Opens a Menu below `trigger` from plain-DOM code (ProseMirror widgets); focus returns to the trigger on close. */
export function openMenu(trigger: HTMLElement, label: string, groups: MenuGroup[]) {
  const host = document.body.appendChild(document.createElement('div'))
  const root = createRoot(host)
  trigger.setAttribute('aria-expanded', 'true')
  const close = () => {
    trigger.setAttribute('aria-expanded', 'false')
    queueMicrotask(() => {
      root.unmount()
      host.remove()
    })
    if (document.activeElement === document.body || !document.activeElement) trigger.focus()
  }
  root.render(<Menu label={label} groups={groups} anchor={trigger.getBoundingClientRect()} onClose={close} />)
}

import { useEffect, useState } from 'react'
import type { Heading } from './outline'

const HEADINGS = '.milkdown :is(h1,h2,h3,h4,h5,h6)'

/** Heading list of the open doc. Click scrolls to the heading; the one in view is highlighted. */
export default function Outline({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(0)
  const heads = () => [...document.querySelectorAll<HTMLElement>(HEADINGS)]

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    // The last heading that has reached the top of the scroll area.
    const update = () => {
      const top = main.getBoundingClientRect().top + 80
      setActive(Math.max(0, heads().findLastIndex((el) => el.getBoundingClientRect().top <= top)))
    }
    update()
    main.addEventListener('scroll', update, { passive: true })
    return () => main.removeEventListener('scroll', update)
  }, [headings])

  if (!headings.length) return <p className="px-2 py-1 text-neutral-500">No headings yet. Start a line with # to add one.</p>
  const min = Math.min(...headings.map((h) => h.level))
  return (
    <nav aria-label="Outline">
      {headings.map((h, i) => (
        <button
          key={i}
          title={h.text}
          aria-current={i === active ? 'location' : undefined}
          style={{ paddingLeft: 8 + (h.level - min) * 12 }}
          className={`block h-7 w-full truncate rounded-md pr-2 text-left transition-colors duration-150 ${i === active ? 'bg-accent-soft font-medium text-accent' : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'}`}
          onClick={() => {
            setActive(i)
            heads()[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {h.text}
        </button>
      ))}
    </nav>
  )
}

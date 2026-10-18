import { useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Dev-only (`/dev/ui/affine`): AFFiNE's UI re-drawn from its source (AFFiNE @ 0b69a6da21).
 * Sizes/radii/spacing: read from `*.css.ts` / Lit styles. Colors: `@toeverything/theme` v2 (toeverything/design repo).
 * `~` = value not found in either, approximated.
 */

type Theme = Record<string, string>
const LIGHT: Theme = {
  bg: '#ffffff', bg2: '#f5f5f5', bg3: '#f3f3f3', hoverOverlay: '#0000000d', panel: '#ffffff', border: '#e6e6e6', primaryBorder: '#1e96eb', blackBorder: '#0000001a',
  text: '#141414', text2: '#7a7a7a', text3: '#929292', placeholder: '#929292', link: '#035f9f', disable: '#7a7a7a', emphasis: '#1e96eb',
  icon: '#7a7a7a', icon2: '#b3b3b3', btn: '#1e96eb', btn2: '#ffffff', error: '#ed3f3f', success: '#44b931', hover: 'rgba(0,0,0,0.04)',
  inputBorder: '#0000001a', tabDivider: '#00000012', chip: '#e6e6e6', shadowMenu: '0px 10px 18px rgba(0,0,0,0.14), 0px -1px 12px rgba(0,0,0,0.08)',
  shadowPopover: '0px 0px 30px rgba(75,75,75,0.2), 0px 0px 4px rgba(75,75,75,0.3)', shadowBtn: '0px 0px 1px 0px rgba(0,0,0,0.12), 0px 1px 5px 0px rgba(0,0,0,0.12)',
  errorBg: '#ed3f3f1a', tipBg: '#141414', tipFg: '#ffffff', toggleOff: '#b3b3b3', overlay: '#00000066',
}
const DARK: Theme = {
  bg: '#141414', bg2: '#252525', bg3: '#565656', hoverOverlay: '#ffffff17', panel: '#252525', border: '#414141', primaryBorder: '#1e96eb', blackBorder: '#ffffff0d',
  text: '#e6e6e6', text2: '#929292', text3: '#7a7a7a', placeholder: '#7a7a7a', link: '#7ac8ff', disable: '#565656', emphasis: '#29a3fa',
  icon: '#f3f3f3', icon2: '#cdcdcd', btn: '#1e96eb', btn2: '#ffffff17', error: '#c83030', success: '#1d9c07', hover: 'rgba(255,255,255,0.1)',
  inputBorder: '#ffffff0d', tabDivider: '#ffffff21', chip: '#414141', shadowMenu: '0px 10px 18px rgba(0,0,0,0.14), 0px -1px 12px rgba(0,0,0,0.08)',
  shadowPopover: '0px 0px 30px 0px rgba(0,0,0,0.1), 0px 0px 8px 0px rgba(0,0,0,0.18), 0px 0px 0px 0.5px #303030 inset', shadowBtn: '0px 0px 1px 0px rgba(0,0,0,0.2), 0px 1px 5px 0px rgba(0,0,0,0.2)',
  errorBg: '#c830301f', tipBg: '#e6e6e6', tipFg: '#141414', toggleOff: '#565656', overlay: '#000000a6',
}

const INTER = "Inter, 'Source Sans 3', Poppins, system-ui, sans-serif"

export default function DevUiAffine() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 bg-white p-6 text-sm text-neutral-900">
      <header>
        <h1 className="text-2xl font-semibold">AFFiNE UI, re-drawn from source</h1>
        <p className="mt-1 text-neutral-500">
          Every size, radius, gap and animation below is read from AFFiNE's <code>*.css.ts</code> / Lit styles. Colors are the real v2 tokens from <code>toeverything/design</code>{' '}
          (fetched by a summarizer — spot-check hex before copying). <b>~</b> = not found, approximated. Left = light, right = dark.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen name="Light" t={LIGHT} />
        <Specimen name="Dark" t={DARK} />
      </div>
      <Layers />
    </div>
  )
}

function Specimen({ name, t }: { name: string; t: Theme }) {
  return (
    <div className="space-y-8 rounded-xl border p-6" style={{ background: t.bg, color: t.text, borderColor: t.border, fontFamily: INTER, fontSize: 15 }}>
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: t.text2 }}>
        {name}
      </div>
      <Palette t={t} />
      <Type t={t} />
      <Buttons t={t} />
      <Inputs t={t} />
      <MenuAndTooltip t={t} />
      <TabsAndModal t={t} />
      <Editor t={t} />
      <DataTable t={t} />
      <Sidebar t={t} />
    </div>
  )
}

function Block({ title, spec, t, children }: { title: string; spec: string; t: Theme; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 mt-0.5 text-xs" style={{ color: t.text2 }}>
        {spec}
      </p>
      {children}
    </section>
  )
}

/* ---------- tokens ---------- */
function Palette({ t }: { t: Theme }) {
  const groups: [string, string[]][] = [
    ['layer/background', ['bg', 'bg2', 'bg3', 'panel', 'hoverOverlay']],
    ['layer/insideBorder', ['border', 'primaryBorder', 'blackBorder']],
    ['text', ['text', 'text2', 'text3', 'link', 'emphasis', 'disable']],
    ['icon + button', ['icon', 'icon2', 'btn', 'btn2', 'error', 'success']],
  ]
  return (
    <Block title="Color tokens (v2)" spec="cssVarV2('group/name'). Brand #1E96EB in both themes; error/success darken in dark." t={t}>
      <div className="space-y-2">
        {groups.map(([g, keys]) => (
          <div key={g} className="flex items-center gap-2">
            <div className="w-32 shrink-0 text-xs" style={{ color: t.text2 }}>
              {g}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keys.map((k) => (
                <div key={k} title={`${k} ${t[k]}`} className="flex flex-col items-center gap-0.5">
                  <div className="size-8 rounded-md border" style={{ background: t[k], borderColor: t.border }} />
                  <div className="text-[9px]" style={{ color: t.text3 }}>
                    {t[k].replace('#', '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Block>
  )
}

function Type({ t }: { t: Theme }) {
  const rows: [string, number, number | string, string][] = [
    ['fontH1', 28, 700, 'mt 18 / mb 10, lh 1em+8'],
    ['fontH2', 26, 600, 'mt 14'],
    ['fontH3', 24, 600, 'mt 12'],
    ['fontH4', 22, 600, ''],
    ['fontH5', 20, 600, ''],
    ['fontH6', 18, 600, ''],
    ['fontBase', 15, 400, 'body'],
    ['fontSm', 14, 400, 'menus, tooltips, table header'],
    ['fontXs', 12, 500, 'buttons, group labels'],
  ]
  return (
    <Block title="Type scale" spec="Inter (variable) → Source Sans 3 → Poppins → system. lineHeight = calc(1em + 8px). Mono: Source Code Pro. Specimens fall back if Inter is missing." t={t}>
      <div className="space-y-1">
        {rows.map(([k, s, w, n]) => (
          <div key={k} className="flex items-baseline gap-3">
            <span style={{ fontSize: s, fontWeight: w as number, lineHeight: `calc(1em + 8px)` }}>Write my notes</span>
            <span className="ml-auto text-[11px]" style={{ color: t.text2 }}>
              {k} · {s}px · {w} {n && `· ${n}`}
            </span>
          </div>
        ))}
      </div>
    </Block>
  )
}

/* ---------- button ---------- */
const SIZES = {
  default: { h: 28, pad: '4px 12px', fs: 12, fw: 500, lh: '20px', icon: 16 },
  large: { h: 32, pad: '4px 12px', fs: 15, fw: 500, lh: '24px', icon: 20 },
  extraLarge: { h: 40, pad: '8px 18px', fs: 15, fw: 600, lh: '24px', icon: 24 },
} as const

function Btn({ t, variant, size = 'default', disabled, children }: { t: Theme; variant: string; size?: keyof typeof SIZES; disabled?: boolean; children: ReactNode }) {
  const s = SIZES[size]
  const v: Record<string, [string, string]> = {
    primary: [t.btn, '#fff'],
    secondary: [t.btn2, t.text],
    plain: ['transparent', t.text],
    error: [t.error, '#fff'],
    success: [t.success, '#fff'],
  }
  const [bg, fg] = v[variant]
  const [hover, setHover] = useState(false)
  const style: CSSProperties = {
    height: s.h, padding: s.pad, fontSize: s.fs, fontWeight: s.fw, lineHeight: s.lh, background: bg, color: fg, borderRadius: 8,
    border: variant === 'plain' ? 'none' : `1px solid ${t.blackBorder}`, opacity: disabled ? 0.5 : 1, position: 'relative', overflow: 'hidden',
    cursor: disabled ? 'default' : 'pointer', transition: 'all .3s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  }
  return (
    <button style={style} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {hover && !disabled && <span style={{ position: 'absolute', inset: 0, background: t.hoverOverlay, pointerEvents: 'none' }} />}
      {children}
    </button>
  )
}

function Buttons({ t }: { t: Theme }) {
  return (
    <Block title="Button" spec="h 28/32/40 · padding 4×12 / 4×12 / 8×18 · font 12/15/15 · weight 500/500/600 · radius 8 · border 1px blackBorder · hover = ::before overlay (hoverOverlay) · disabled opacity .5 · icon 16/20/24" t={t}>
      <div className="space-y-3">
        {(['default', 'large', 'extraLarge'] as const).map((sz) => (
          <div key={sz} className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-[11px]" style={{ color: t.text2 }}>
              {sz} {SIZES[sz].h}px
            </span>
            {['primary', 'secondary', 'plain', 'error', 'success'].map((v) => (
              <Btn key={v} t={t} variant={v} size={sz}>
                {v}
              </Btn>
            ))}
            <Btn t={t} variant="primary" size={sz} disabled>
              disabled
            </Btn>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="w-20 text-[11px]" style={{ color: t.text2 }}>
            icon button
          </span>
          {['plain', 'solid', 'danger'].map((v, i) => (
            <span
              key={v}
              className="inline-flex size-7 items-center justify-center rounded"
              style={{ padding: 2, background: v === 'solid' ? t.panel : v === 'danger' && i === 2 ? t.errorBg : 'transparent', color: v === 'danger' ? t.error : t.icon, boxShadow: v === 'solid' ? t.shadowBtn : 'none' }}
            >
              ✎
            </span>
          ))}
          <span className="text-[11px]" style={{ color: t.text2 }}>
            radius 4 · padding 2 (24px: 4) · plain / solid (buttonShadow) / danger (hover → errorColor on errorBg ~)
          </span>
        </div>
      </div>
    </Block>
  )
}

/* ---------- inputs ---------- */
function Field({ t, h, fw, border, ring, children }: { t: Theme; h: number; fw?: number; border?: string; ring?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        height: h, border: `1px solid ${border ?? t.inputBorder}`, borderRadius: 8, fontWeight: fw, fontSize: 15, lineHeight: '22px', display: 'flex', alignItems: 'center', padding: '0 12px',
        background: 'transparent', boxShadow: ring ? '0 0 0 2px rgba(30,150,235,0.30)' : 'none', color: t.text,
      }}
    >
      {children}
    </div>
  )
}

function Inputs({ t }: { t: Theme }) {
  return (
    <Block title="Input, switch, checkbox" spec="input h 28/32/40 · radius 8 · 15px · padding 0×12 · focus: border #1E96EB + 0 0 0 2px rgba(30,150,235,.30) · error border input/border/error · switch 26px tall, 3px pad, dot 20, radius 37, spring easing cubic-bezier(.27,.2,.25,1.51)" t={t}>
      <div className="grid max-w-md gap-2">
        <Field t={t} h={28}>
          default 28
        </Field>
        <Field t={t} h={32} border={t.btn} ring>
          focused 32
        </Field>
        <Field t={t} h={40} fw={600} border={t.error}>
          error 40
        </Field>
        <Field t={t} h={32}>
          <span style={{ color: t.placeholder }}>placeholder</span>
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <Switch on t={t} />
        <Switch t={t} />
        <label className="flex items-center gap-2">
          <span className="flex size-4 items-center justify-center rounded text-[10px] text-white" style={{ background: t.btn }}>
            ✓
          </span>
          checked
        </label>
        <label className="flex items-center gap-2">
          <span className="size-4 rounded border" style={{ borderColor: t.icon2 }} /> unchecked
        </label>
      </div>
    </Block>
  )
}

function Switch({ on, t }: { on?: boolean; t: Theme }) {
  const [v, set] = useState(!!on)
  return (
    <button onClick={() => set(!v)} aria-pressed={v} style={{ position: 'relative', height: 26, width: 46, borderRadius: 37, background: v ? t.btn : t.toggleOff, transition: '200ms all' }}>
      <span style={{ position: 'absolute', left: 0, top: '50%', width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: `translate(${v ? 23 : 3}px,-50%)`, transition: 'all .2s cubic-bezier(0.27,0.2,0.25,1.51)' }} />
    </button>
  )
}

/* ---------- menu / tooltip ---------- */
function MenuAndTooltip({ t }: { t: Theme }) {
  const items: [string, string, string?][] = [['T', 'Text'], ['H', 'Heading 1', 'Ctrl+Alt+1'], ['•', 'Bulleted list'], ['❝', 'Quote']]
  return (
    <Block title="Menu and tooltip" spec="menu: min-w 180 · radius 8 · padding 8 · gap 4 · 14px · menuShadow · item: padding 4, radius 4, lh 22, gap 8, icon 20, hover=hoverColor · separator 8px tall w/ half-px hairline · tooltip: padding 5×12, 14px, lh 22, radius 4, max 280, scale .85→1 in 200ms" t={t}>
      <div className="flex flex-wrap items-start gap-8">
        <div style={{ minWidth: 180, borderRadius: 8, padding: 8, fontSize: 14, background: t.panel, boxShadow: t.shadowMenu, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(([i, l, s], n) => (
            <div key={l} className="flex items-center justify-between" style={{ gap: 8, padding: 4, borderRadius: 4, lineHeight: '22px', background: n === 1 ? t.hover : 'transparent' }}>
              <span className="flex items-center" style={{ gap: 8 }}>
                <span className="flex size-5 items-center justify-center" style={{ color: t.icon, fontSize: 14 }}>
                  {i}
                </span>
                {l}
              </span>
              {s && <span style={{ color: t.text2, fontSize: 12 }}>{s}</span>}
            </div>
          ))}
          <div style={{ height: 8, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', height: 1, width: '100%', background: t.border, transform: 'translateY(-50%) scaleY(0.5)' }} />
          </div>
          <div className="flex items-center" style={{ gap: 8, padding: 4, borderRadius: 4, lineHeight: '22px', color: t.error, background: t.errorBg }}>
            <span className="flex size-5 items-center justify-center">🗑</span>Delete <span style={{ fontSize: 11, color: t.text2 }}>(danger hover)</span>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 10, background: t.tipBg, color: t.tipFg, padding: '5px 12px', fontSize: 14, lineHeight: '22px', borderRadius: 4, maxWidth: 280 }}>
          Bold
          <span className="flex gap-0.5">
            {['Ctrl', 'B'].map((k) => (
              <span key={k} className="flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', fontSize: 12, height: 16, minWidth: 16, padding: '0 4px', borderRadius: 4 }}>
                {k}
              </span>
            ))}
          </span>
        </div>
      </div>
    </Block>
  )
}

/* ---------- tabs / modal ---------- */
function TabsAndModal({ t }: { t: Theme }) {
  const [tab, setTab] = useState(0)
  return (
    <Block title="Tabs and modal" spec="tabs: gap 12 · trigger padding 6×4, 14px/500, secondary→primary, 2px bottom border primary · list underline 1px · modal: radius 12, padding 20×24, 15px/1.6, popoverShadow, enter 150ms fade + translateY(-2%) scale(.96→1), overlay 150ms fade" t={t}>
      <div className="relative flex gap-3" style={{ borderBottom: `1px solid ${t.border}` }}>
        {['General', 'Appearance', 'Shortcuts'].map((l, i) => (
          <button key={l} onClick={() => setTab(i)} style={{ padding: '6px 4px', fontSize: 14, fontWeight: 500, color: tab === i ? t.text : t.text2, borderBottom: `2px solid ${tab === i ? t.btn : 'transparent'}`, marginBottom: -1 }}>
            {l}
          </button>
        ))}
      </div>
      <div className="relative mt-4 flex h-52 items-center justify-center overflow-hidden rounded-lg" style={{ background: t.overlay }}>
        <div style={{ width: 340, padding: '20px 24px', borderRadius: 12, background: t.panel, boxShadow: t.shadowPopover, lineHeight: 1.6, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 14, right: 16, color: t.icon }}>✕</span>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Delete page?</div>
          <div style={{ color: t.text2, fontSize: 14 }}>This can’t be undone.</div>
          <div className="mt-3 flex justify-end gap-2">
            <Btn t={t} variant="secondary" size="large">
              Cancel
            </Btn>
            <Btn t={t} variant="error" size="large">
              Delete
            </Btn>
          </div>
        </div>
      </div>
    </Block>
  )
}

/* ---------- editor ---------- */
function Editor({ t }: { t: Theme }) {
  const group = (n: string) => (
    <div style={{ padding: '2px 8px', fontSize: 12, fontWeight: 500, color: t.text2 }}>{n}</div>
  )
  const item = (ic: string, l: string, active?: boolean) => (
    <div className="flex items-center" style={{ gap: 10, padding: '2px 8px', borderRadius: 4, height: 44 - 8, background: active ? t.hover : 'transparent' }}>
      <span className="flex items-center justify-center" style={{ width: 28, height: 28, padding: 4, border: `1px solid ${t.border}`, borderRadius: 4, color: t.icon, background: t.panel, fontSize: 13 }}>
        {ic}
      </span>
      {l}
    </div>
  )
  return (
    <Block title="Editor: headings, callout, slash menu" spec="h1 28/700 mt18 mb10 · h2 26/600 · h3 24/600 · body 15 · callout padding 5×10, radius 8, emoji 24px, margin 8×0 · slash menu 280w, padding 8/4/8/8, radius 8, max-h 390, group label 12/500, item icon 28×28 radius 4 w/ 1px border, gap 10" t={t}>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 'calc(1em + 8px)', marginTop: 4, marginBottom: 10 }}>Heading 1</div>
          <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 'calc(1em + 10px)', marginTop: 14, marginBottom: 10 }}>Heading 2</div>
          <p style={{ fontSize: 15, padding: '0 4px 2px', lineHeight: 'calc(1em + 8px)' }}>Body text at 15px with 4px side padding.</p>
          <div className="flex items-start" style={{ margin: '8px 0', padding: '5px 10px', borderRadius: 8, background: t.bg2 }}>
            <span className="flex items-center justify-center" style={{ width: 24, height: 24, fontSize: '1.2em' }}>
              💡
            </span>
            <span style={{ paddingLeft: 10 }}>Callout block</span>
          </div>
        </div>
        <div style={{ width: 280, padding: '8px 4px 8px 8px', borderRadius: 8, background: t.panel, boxShadow: t.shadowMenu }}>
          {group('Basic')}
          {item('T', 'Text')}
          {item('H', 'Heading 1', true)}
          {item('☑', 'To-do list')}
          {group('Content & Media')}
          {item('▦', 'Table view')}
        </div>
      </div>
    </Block>
  )
}

/* ---------- data table ---------- */
function DataTable({ t }: { t: Theme }) {
  const cols = [['Aa', 'Title'], ['◉', 'Status'], ['#', 'Tags'], ['▭', 'Progress']]
  const rows: [string, string, string, number][] = [['Write spec', 'Done', 'docs', 100], ['Build table', 'Doing', 'ui', 40]]
  const cell = { width: 180, padding: '0 6px', flexShrink: 0 } as const
  return (
    <Block title="Data table view" spec="column 180 (min 100) · header 34 · stats bar 34 · left drag rail 24 · add-col min 40 · header cell padding 6, 14px secondary, hover fill · borders layer/insideBorder · h-scrollbar 8px, thumb only on hover" t={t}>
      <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${t.border}` }}>
        <div className="w-fit min-w-full" style={{ fontSize: 14 }}>
          <div className="flex items-center" style={{ height: 34, borderBottom: `1px solid ${t.border}`, color: t.text2 }}>
            <div style={{ width: 24 }} />
            {cols.map(([i, n]) => (
              <div key={n} style={{ ...cell, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11 }}>{i}</span>
                {n}
              </div>
            ))}
            <div className="flex flex-1 justify-center" style={{ minWidth: 40 }}>
              +
            </div>
          </div>
          {rows.map(([a, s, tag, p]) => (
            <div key={a} className="flex items-center" style={{ minHeight: 34, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: 24, color: t.icon2, textAlign: 'center' }}>⠿</div>
              <div style={cell}>{a}</div>
              <div style={cell}>
                <span style={{ background: s === 'Done' ? t.success + '33' : t.btn + '33', padding: '1px 8px', borderRadius: 4, fontSize: 12 }}>{s}</span>
              </div>
              <div style={cell}>
                <span style={{ background: t.chip, padding: '1px 8px', borderRadius: 4, fontSize: 12 }}>{tag}</span>
              </div>
              <div style={{ ...cell, display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: t.border }}>
                  <div style={{ width: `${p}%`, height: '100%', borderRadius: 3, background: t.btn }} />
                </div>
                {p}%
              </div>
            </div>
          ))}
          <div className="flex items-center" style={{ height: 34, color: t.text2, fontSize: 12 }}>
            <div style={{ width: 24 }} />
            <div style={cell}>+ New record</div>
          </div>
        </div>
      </div>
    </Block>
  )
}

/* ---------- sidebar ---------- */
function Sidebar({ t }: { t: Theme }) {
  return (
    <Block title="App sidebar" spec="default width 248 · header 52 (padding 0×8) · border-right .5px layer/insideBorder · floating: radius 6 + popover shadow + noise.avif overlay (50px tile)" t={t}>
      <div style={{ width: 248, height: 200, background: t.bg, borderRight: `0.5px solid ${t.border}`, outline: `1px dashed ${t.border}` }}>
        <div className="flex items-center justify-between" style={{ height: 52, padding: '0 8px' }}>
          <span className="font-medium">Workspace</span>
          <span style={{ color: t.icon }}>⇤</span>
        </div>
        {['Search', 'All docs', 'Journals', 'Settings'].map((l, i) => (
          <div key={l} style={{ margin: '0 8px', padding: '4px 8px', borderRadius: 4, fontSize: 14, lineHeight: '22px', background: i === 1 ? t.hover : 'transparent' }}>
            {l}
          </div>
        ))}
      </div>
    </Block>
  )
}

/* ---------- layer map (names only) ---------- */
function Layers() {
  return (
    <section className="rounded-xl border border-neutral-200 p-6">
      <h2 className="text-sm font-semibold">Where each piece lives (names only; not re-drawn)</h2>
      <ul className="mt-2 space-y-1 text-xs text-neutral-500">
        <li>ui/ (34): also avatar, popover, toast, notification, skeleton, progress, slider, radio, date-picker, icon-picker, dnd, masonry, table, scrollbar, lottie</li>
        <li>components/: setting-components, auth-components, card, notification-center, rename-modal, resize-panel</li>
        <li>core/modules (~70): workbench, peek-view, quicksearch, explorer, share-menu, theme-editor, …</li>
        <li>blocksuite: blocks (code, list, table, database, image, attachment, bookmark, latex, frame, embed), widgets (drag-handle, toolbar, linked-doc, edgeless-toolbar), gfx (brush, connector, shape, mindmap)</li>
        <li>data-view: table (pc, pc-virtual, mobile), kanban, calendar · props: text number select multi-select checkbox date progress image</li>
      </ul>
    </section>
  )
}

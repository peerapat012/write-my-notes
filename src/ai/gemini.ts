import { loadSettings } from '@/features/settings/settings'

export const NO_KEY = 'Add Gemini key in Settings'

/** The Settings key wins; the env key is a dev-only fallback (`dev` is injected so tests stay pure). */
export const resolveKey = (saved: string, dev: boolean, env?: string) => saved || (dev ? env : '') || ''

/** Key for the next request. In production builds the `DEV` branch is dead code, so Vite never inlines the env key. */
export const geminiKey = () =>
  resolveKey(loadSettings().key, import.meta.env.DEV, import.meta.env.DEV ? import.meta.env.VITE_GEMINI_API_KEY : undefined)

/** Asks Gemini for JSON matching `schema` (OpenAPI subset) and returns the parsed result. */
export async function generate<T>(model: string, prompt: string, schema: object): Promise<T> {
  const key = geminiKey()
  if (!key) throw new Error(NO_KEY)
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message ?? `Gemini request failed (${res.status})`)
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no answer.')
  return JSON.parse(text)
}

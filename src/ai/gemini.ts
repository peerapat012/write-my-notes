import { loadSettings } from '@/features/settings/settings'

export const NO_KEY = 'Add Gemini key in Settings'

/** The Settings key wins; the env key is a dev-only fallback (`dev` is injected so tests stay pure). */
export const resolveKey = (saved: string, dev: boolean, env?: string) => saved || (dev ? env : '') || ''

/** Key for the next request. In production builds the `DEV` branch is dead code, so Vite never inlines the env key. */
export const geminiKey = () =>
  resolveKey(loadSettings().key, import.meta.env.DEV, import.meta.env.DEV ? import.meta.env.VITE_GEMINI_API_KEY : undefined)

/** Asks Gemini for JSON matching `schema` (OpenAPI subset) and returns the parsed result. */
export async function generate<T>(model: string, prompt: string, schema: object): Promise<T> {
  return JSON.parse(await ask(model, prompt, { responseMimeType: 'application/json', responseSchema: schema }))
}

/** Asks Gemini for plain (markdown) text, no response schema. */
export const generateText = (model: string, prompt: string) => ask(model, prompt, {})

async function post(model: string, body: object) {
  const key = geminiKey()
  if (!key) throw new Error(NO_KEY)
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message ?? `Gemini request failed (${res.status})`)
  return json
}

async function ask(model: string, prompt: string, generationConfig: object): Promise<string> {
  const json = await post(model, { contents: [{ parts: [{ text: prompt }] }], generationConfig })
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no answer.')
  return text
}

export type Part = {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}
export type Content = { role: 'user' | 'model'; parts: Part[] }

/** A function the model may call: `parameters` is an OpenAPI-subset schema. */
export type FunctionDeclaration = { name: string; description: string; parameters: object }

/** One chat turn with function calling: the model's reply, which holds text and/or function calls. */
export async function chatTurn(model: string, system: string, contents: Content[], functions: FunctionDeclaration[]): Promise<Content> {
  const json = await post(model, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools: [{ functionDeclarations: functions }],
  })
  const parts: Part[] | undefined = json.candidates?.[0]?.content?.parts
  if (!parts?.length) throw new Error('Gemini returned no answer.')
  return { role: 'model', parts }
}

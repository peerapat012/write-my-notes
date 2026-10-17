export const NO_KEY = 'Gemini key missing: set VITE_GEMINI_API_KEY in .env.local and restart the dev server.'

/** Asks Gemini for JSON matching `schema` (OpenAPI subset) and returns the parsed result. */
export async function generate<T>(model: string, prompt: string, schema: object): Promise<T> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
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

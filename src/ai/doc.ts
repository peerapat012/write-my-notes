import { generateText } from './gemini'

/** Prompt for `/ai` in docs: edit `selection` (markdown) by `input`, or, with no selection, write what `input` asks for. */
export function docPrompt(input: string, selection = '') {
  const rules = 'Reply with Markdown only: no preamble, no explanation, no code fence around the whole answer.'
  return selection.trim()
    ? `Apply this instruction to the Markdown below and reply with the result, which replaces it.\n${rules}\n\nInstruction: ${input}\n\nMarkdown:\n${selection}`
    : `Write Markdown for this request. It is inserted into a document at the cursor.\n${rules}\n\nRequest: ${input}`
}

export const docAi = async (model: string, input: string, selection?: string) => (await generateText(model, docPrompt(input, selection))).trim()

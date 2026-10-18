// Usage: node scripts/set-version.mjs 2.0.0 — writes the version into package.json and src-tauri/tauri.conf.json (the installer's version).
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]?.replace(/^v/, '')
// MSI needs a plain numeric version, so a tag like v2.0.0-rc1 is refused here instead of failing deep in the bundler.
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error(`Expected a version like 2.0.0 (or v2.0.0), got "${process.argv[2] ?? ''}"`)
  process.exit(1)
}

for (const file of ['package.json', 'src-tauri/tauri.conf.json']) {
  const text = readFileSync(file, 'utf8')
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const json = JSON.parse(text)
  json.version = version
  writeFileSync(file, JSON.stringify(json, null, 2).replace(/\n/g, eol) + eol)
}
console.log(`Version set to ${version}`)

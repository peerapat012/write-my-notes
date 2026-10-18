// Usage: node scripts/set-version.mjs v0.0.1-beta — writes the version into package.json and src-tauri/tauri.conf.json (the installer's version).
// A pre-release suffix (-beta, -rc1) stays on the tag and the GitHub Release; the files get the plain numbers, because MSI needs a numeric version.
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]?.replace(/^v/, '').replace(/-[0-9A-Za-z.-]+$/, '')
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error(`Expected a version like 2.0.0, v2.0.0 or v0.0.1-beta, got "${process.argv[2] ?? ''}"`)
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

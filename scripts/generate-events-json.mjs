// Regenerates src/data/events.json from the Keystatic-managed content
// files in src/content/events/. Runs before every dev/build (see
// package.json's predev/prebuild scripts) so eventUtils.ts can keep
// importing a plain static JSON array — nothing about how the app reads
// event data changes; only where that JSON file comes from does.
import { createReader } from '@keystatic/core/reader'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import keystaticConfig from '../keystatic.config.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const outPath = resolve(repoRoot, 'src/data/events.json')

const reader = createReader(repoRoot, keystaticConfig)
const entries = await reader.collections.events.all()

const events = entries
  .map(({ slug, entry }) => ({ id: slug, ...entry }))
  .sort((a, b) => a.startDate.localeCompare(b.startDate))

await writeFile(outPath, JSON.stringify(events, null, 2) + '\n')
console.log(`Wrote ${events.length} event(s) to src/data/events.json`)

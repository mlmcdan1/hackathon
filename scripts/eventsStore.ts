// Reads and writes the event data behind both the admin panel
// (scripts/adminDevMiddleware.ts) and the site itself. Each event is one
// flat JSON file in src/content/events/, named by its id; src/data/events.json
// is a generated snapshot of all of them that eventUtils.ts imports at
// build/dev time. There's no database — this is the whole "backend".
import { readdir, readFile, writeFile, rm, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, '..')
export const EVENTS_DIR = join(REPO_ROOT, 'src/content/events')
export const EVENTS_JSON_PATH = join(REPO_ROOT, 'src/data/events.json')
export const IMAGES_DIR = join(REPO_ROOT, 'public/events-images')
export const IMAGES_PUBLIC_PATH = '/events-images/'

export interface EventFields {
  title: string
  description: string
  published: boolean
  category: string
  tag: string
  location: string
  format: 'in-person' | 'virtual' | 'hybrid'
  color: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: string
  prizePool: string
  registrationOpen: boolean
  tags: string[]
  image: string | null
}

export type EventRecord = EventFields & { id: string }

const FILENAME_SAFE = /^[a-z0-9-]+$/

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'event'
}

async function existingIds(): Promise<Set<string>> {
  const files = await readdir(EVENTS_DIR).catch(() => [] as string[])
  return new Set(files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length)))
}

export async function uniqueIdFromTitle(title: string): Promise<string> {
  const base = slugify(title)
  const taken = await existingIds()
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function isValidId(id: string): boolean {
  return FILENAME_SAFE.test(id)
}

export async function listEvents(): Promise<EventRecord[]> {
  const files = await readdir(EVENTS_DIR).catch(() => [] as string[])
  const records = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        const id = f.slice(0, -'.json'.length)
        const raw = JSON.parse(await readFile(join(EVENTS_DIR, f), 'utf-8'))
        delete raw.slug // legacy Keystatic artifact, duplicated the title
        return { id, ...raw } as EventRecord
      }),
  )
  return records.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  if (!isValidId(id)) return null
  const raw = await readFile(join(EVENTS_DIR, `${id}.json`), 'utf-8').catch(() => null)
  if (raw === null) return null
  const parsed = JSON.parse(raw)
  delete parsed.slug
  return { id, ...parsed }
}

export async function saveEvent(id: string, fields: EventFields): Promise<void> {
  if (!isValidId(id)) throw new Error('Invalid event id')
  await mkdir(EVENTS_DIR, { recursive: true })
  await writeFile(join(EVENTS_DIR, `${id}.json`), JSON.stringify(fields, null, 2) + '\n')
}

export async function deleteEvent(id: string): Promise<void> {
  if (!isValidId(id)) throw new Error('Invalid event id')
  await rm(join(EVENTS_DIR, `${id}.json`), { force: true })
}

export async function regenerateEventsJson(): Promise<number> {
  const events = await listEvents()
  await writeFile(EVENTS_JSON_PATH, JSON.stringify(events, null, 2) + '\n')
  return events.length
}

export async function saveUploadedImage(filename: string, data: Buffer): Promise<string> {
  await mkdir(IMAGES_DIR, { recursive: true })
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : ''
  const safeBase = slugify(filename.replace(ext, '')) || 'image'
  let name = `${safeBase}${ext}`
  let n = 2
  const taken = new Set(await readdir(IMAGES_DIR).catch(() => [] as string[]))
  while (taken.has(name)) {
    name = `${safeBase}-${n}${ext}`
    n++
  }
  await writeFile(join(IMAGES_DIR, name), data)
  return `${IMAGES_PUBLIC_PATH}${name}`
}

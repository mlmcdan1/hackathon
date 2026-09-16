import { listContentFiles, getContentFile, putContentFile, deleteContentFile } from './github'

const EVENTS_DIR = 'src/content/events'
const IMAGES_DIR = 'public/events-images'
const IMAGES_PUBLIC_PATH = '/events-images/'
const ID_RE = /^[a-z0-9-]+$/

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

export function isValidId(id: string): boolean {
  return ID_RE.test(id)
}

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

function decodeBase64(content: string): string {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf-8')
}

function encodeBase64(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

export async function listEvents(token: string) {
  const files = (await listContentFiles(token, EVENTS_DIR)).filter((f) => f.name.endsWith('.json'))
  const events = await Promise.all(
    files.map(async (f) => {
      const file = await getContentFile(token, f.path)
      if (!file) return null
      const data = JSON.parse(decodeBase64(file.content))
      delete data.slug // legacy artifact from a previous CMS, duplicated the title
      return { id: f.name.slice(0, -'.json'.length), ...data }
    }),
  )
  return events
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export async function uniqueIdFromTitle(token: string, title: string): Promise<string> {
  const base = slugify(title)
  const files = await listContentFiles(token, EVENTS_DIR)
  const taken = new Set(files.map((f) => f.name.replace(/\.json$/, '')))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export async function saveEvent(token: string, id: string, fields: EventFields, message: string): Promise<void> {
  const path = `${EVENTS_DIR}/${id}.json`
  const existing = await getContentFile(token, path)
  await putContentFile(token, path, encodeBase64(JSON.stringify(fields, null, 2) + '\n'), message, existing?.sha)
}

export async function deleteEvent(token: string, id: string): Promise<void> {
  const path = `${EVENTS_DIR}/${id}.json`
  const existing = await getContentFile(token, path)
  if (!existing) return
  await deleteContentFile(token, path, existing.sha, `Delete event: ${id}`)
}

export async function saveImage(token: string, filename: string, base64Data: string): Promise<string> {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : ''
  const safeBase = slugify(filename.slice(0, filename.length - ext.length)) || 'image'
  const suffix = Math.random().toString(36).slice(2, 8)
  const name = `${safeBase}-${suffix}${ext}`
  await putContentFile(token, `${IMAGES_DIR}/${name}`, base64Data, `Upload image: ${name}`)
  return `${IMAGES_PUBLIC_PATH}${name}`
}

import { supabase } from './supabase'

export interface EventRecord {
  id: string
  title: string
  category: string
  tag: string
  description: string
  location: string
  format: 'virtual' | 'in-person' | 'hybrid'
  color: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: string
  prizePool: string
  maxTeams: number
  currentTeams: number
  maxParticipants: number
  currentParticipants: number
  registrationOpen: boolean
  published: boolean
  tags: string[]
  image: string | null
}

export type ComputedStatus = 'draft' | 'completed' | 'active' | 'open-reg' | 'upcoming'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvent(row: any): EventRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    tag: row.tag,
    description: row.description,
    location: row.location,
    format: row.format,
    color: row.color,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    prizePool: row.prize_pool,
    maxTeams: row.max_teams,
    currentTeams: row.current_teams,
    maxParticipants: row.max_participants,
    currentParticipants: row.current_participants,
    registrationOpen: row.registration_open,
    published: row.published,
    tags: row.tags ?? [],
    image: row.image ?? null,
  }
}

function eventToRow(e: EventRecord) {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    tag: e.tag,
    description: e.description,
    location: e.location,
    format: e.format,
    color: e.color,
    start_date: e.startDate,
    end_date: e.endDate,
    start_time: e.startTime,
    end_time: e.endTime,
    duration: e.duration,
    prize_pool: e.prizePool,
    max_teams: e.maxTeams,
    current_teams: e.currentTeams,
    max_participants: e.maxParticipants,
    current_participants: e.currentParticipants,
    registration_open: e.registrationOpen,
    published: e.published,
    tags: e.tags,
    image: e.image,
  }
}

export async function fetchPublicEvents(): Promise<EventRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('published', true)
    .order('start_date', { ascending: true })
  if (error) { console.error('[events] fetchPublicEvents:', error); return [] }
  return (data ?? []).map(rowToEvent)
}

export async function fetchAllEvents(): Promise<EventRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false })
  if (error) { console.error('[events] fetchAllEvents:', error); return [] }
  return (data ?? []).map(rowToEvent)
}

export async function upsertEvent(event: EventRecord): Promise<EventRecord | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('events')
    .upsert(eventToRow(event), { onConflict: 'id' })
    .select()
    .single()
  if (error) {
    console.error('[events] upsertEvent:', error.message, error.code)
    return null
  }
  return data ? rowToEvent(data) : null
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error, count } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .eq('id', id)
  if (error) {
    console.error('[events] deleteEvent:', error.message, error.code)
    return false
  }
  // RLS silently blocks without an error — count stays 0
  if ((count ?? 0) === 0) {
    console.error('[events] deleteEvent: 0 rows deleted — RLS blocked it (not in admins table)')
    return false
  }
  return true
}

export function newBlankEvent(): EventRecord {
  const today = new Date().toISOString().split('T')[0]
  return {
    id: `event-${Date.now()}`,
    title: '',
    category: '',
    tag: 'Hackathon',
    description: '',
    location: '',
    format: 'in-person',
    color: 'purple',
    startDate: today,
    endDate: today,
    startTime: '09:00',
    endTime: '17:00',
    duration: '',
    prizePool: '',
    maxTeams: 0,
    currentTeams: 0,
    maxParticipants: 0,
    currentParticipants: 0,
    registrationOpen: false,
    published: false,
    tags: [],
    image: null,
  }
}

export function computeStatus(event: EventRecord): ComputedStatus {
  if (!event.published) return 'draft'
  const now   = new Date()
  const start = new Date(`${event.startDate}T${event.startTime}:00`)
  const end   = new Date(`${event.endDate}T${event.endTime}:00`)
  if (end < now)    return 'completed'
  if (start <= now) return 'active'
  if (event.registrationOpen) return 'open-reg'
  return 'upcoming'
}

export function getStartDateTime(event: EventRecord): Date {
  return new Date(`${event.startDate}T${event.startTime}:00`)
}

export function getEndDateTime(event: EventRecord): Date {
  return new Date(`${event.endDate}T${event.endTime}:00`)
}

export function displayDay(event: EventRecord): string {
  return new Date(`${event.startDate}T00:00:00`).getDate().toString().padStart(2, '0')
}

export function displayMonth(event: EventRecord): string {
  return new Date(`${event.startDate}T00:00:00`)
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase()
}

export function displayYear(event: EventRecord): string {
  return new Date(`${event.startDate}T00:00:00`).getFullYear().toString()
}

export function displaySpots(event: EventRecord): string {
  if (event.maxParticipants === 0) return 'Open'
  return `${event.maxParticipants}+ devs`
}

export function publicStatusLabel(status: ComputedStatus): 'Open Reg' | 'Upcoming' | 'Active Now' | 'Completed' | 'Draft' {
  switch (status) {
    case 'open-reg':  return 'Open Reg'
    case 'active':    return 'Active Now'
    case 'upcoming':  return 'Upcoming'
    case 'completed': return 'Completed'
    case 'draft':     return 'Draft'
  }
}

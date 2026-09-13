import eventsData from '../data/events.json'

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

export async function fetchPublicEvents(): Promise<EventRecord[]> {
  return (eventsData as EventRecord[])
    .filter((e) => e.published)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
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

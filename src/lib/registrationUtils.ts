import { supabase } from './supabase'

export interface Registration {
  id: string
  eventId: string
  userId: string
  fullName: string
  email: string
  teamName: string
  teamMembers: string
  experienceLevel: string
  projectIdea: string
  agreedToRules: boolean
  status: 'active' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface ProjectSubmission {
  id: string
  eventId: string
  userId: string
  projectTitle: string
  description: string
  githubUrl: string
  demoUrl: string
  videoUrl: string
  slidesUrl: string
  techStack: string
  submittedAt: string
  updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToReg(row: any): Registration {
  return {
    id:              row.id,
    eventId:         row.event_id,
    userId:          row.user_id,
    fullName:        row.full_name,
    email:           row.email,
    teamName:        row.team_name        ?? '',
    teamMembers:     row.team_members     ?? '',
    experienceLevel: row.experience_level,
    projectIdea:     row.project_idea     ?? '',
    agreedToRules:   row.agreed_to_rules,
    status:          row.status,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSub(row: any): ProjectSubmission {
  return {
    id:           row.id,
    eventId:      row.event_id,
    userId:       row.user_id,
    projectTitle: row.project_title,
    description:  row.description,
    githubUrl:    row.github_url  ?? '',
    demoUrl:      row.demo_url    ?? '',
    videoUrl:     row.video_url   ?? '',
    slidesUrl:    row.slides_url  ?? '',
    techStack:    row.tech_stack  ?? '',
    submittedAt:  row.submitted_at,
    updatedAt:    row.updated_at,
  }
}

export async function fetchRegistration(eventId: string, userId: string): Promise<Registration | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data ? rowToReg(data) : null
}

export async function createRegistration(params: {
  eventId: string
  userId: string
  fullName: string
  email: string
  teamName: string
  teamMembers: string
  experienceLevel: string
  projectIdea: string
}): Promise<Registration | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      event_id:         params.eventId,
      user_id:          params.userId,
      full_name:        params.fullName,
      email:            params.email,
      team_name:        params.teamName     || null,
      team_members:     params.teamMembers  || null,
      experience_level: params.experienceLevel,
      project_idea:     params.projectIdea  || null,
      agreed_to_rules:  true,
      status:           'active',
    })
    .select()
    .single()
  if (error) { console.error('[reg] create:', error.message); return null }
  return rowToReg(data)
}

export async function updateRegistration(id: string, params: {
  fullName: string
  teamName: string
  teamMembers: string
  experienceLevel: string
  projectIdea: string
}): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('registrations')
    .update({
      full_name:        params.fullName,
      team_name:        params.teamName     || null,
      team_members:     params.teamMembers  || null,
      experience_level: params.experienceLevel,
      project_idea:     params.projectIdea  || null,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', id)
  if (error) { console.error('[reg] update:', error.message) }
  return !error
}

export async function fetchSubmission(eventId: string, userId: string): Promise<ProjectSubmission | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()
  return data ? rowToSub(data) : null
}

export async function upsertSubmission(params: {
  eventId: string
  userId: string
  projectTitle: string
  description: string
  githubUrl: string
  demoUrl: string
  videoUrl: string
  slidesUrl: string
  techStack: string
}): Promise<ProjectSubmission | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('project_submissions')
    .upsert({
      event_id:      params.eventId,
      user_id:       params.userId,
      project_title: params.projectTitle,
      description:   params.description,
      github_url:    params.githubUrl  || null,
      demo_url:      params.demoUrl    || null,
      video_url:     params.videoUrl   || null,
      slides_url:    params.slidesUrl  || null,
      tech_stack:    params.techStack  || null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'event_id,user_id' })
    .select()
    .single()
  if (error) { console.error('[sub] upsert:', error.message); return null }
  return rowToSub(data)
}

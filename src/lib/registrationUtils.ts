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

export type SubmissionRank = '1st' | '2nd' | '3rd'

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
  adminViewedAt: string | null
  adminShortlisted: boolean
  adminRank: SubmissionRank | null
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
    adminViewedAt:    row.admin_viewed_at ?? null,
    adminShortlisted: row.admin_shortlisted ?? false,
    adminRank:        row.admin_rank ?? null,
  }
}

// Links any guest registration (made before the user had/used an account) to their
// account once they're logged in, matching on their verified email.
export async function claimGuestRegistrations(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('claim_guest_registrations')
  if (error) { console.error('[reg] claimGuest:', error.message) }
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

export async function fetchRegistrationsForUser(userId: string): Promise<Registration[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
  if (error) { console.error('[reg] fetchForUser:', error.message); return [] }
  return (data ?? []).map(rowToReg)
}

export async function fetchSubmissionsForUser(userId: string): Promise<ProjectSubmission[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('user_id', userId)
  if (error) { console.error('[sub] fetchForUser:', error.message); return [] }
  return (data ?? []).map(rowToSub)
}

export async function createRegistration(params: {
  eventId: string
  userId: string | null
  fullName: string
  email: string
  teamName: string
  teamMembers: string
  experienceLevel: string
  projectIdea: string
}): Promise<{ data: Registration | null; errorCode?: string }> {
  if (!supabase) return { data: null }

  const row = {
    event_id:         params.eventId,
    user_id:          params.userId ?? null,
    full_name:        params.fullName,
    email:            params.email,
    team_name:        params.teamName     || null,
    team_members:     params.teamMembers  || null,
    experience_level: params.experienceLevel,
    project_idea:     params.projectIdea  || null,
    agreed_to_rules:  true,
    status:           'active',
  }

  if (params.userId) {
    // Authenticated user — SELECT back so we get the server-generated id/timestamps
    const { data, error } = await supabase.from('registrations').insert(row).select().single()
    if (error) { console.error('[reg] create:', error.message); return { data: null, errorCode: error.code } }
    return { data: rowToReg(data) }
  } else {
    // Guest — anon role has no SELECT policy, so skip RETURNING and build the object locally
    const { error } = await supabase.from('registrations').insert(row)
    if (error) { console.error('[reg] create:', error.message); return { data: null, errorCode: error.code } }
    const now = new Date().toISOString()
    return {
      data: {
        id:              '',
        eventId:         params.eventId,
        userId:          '',
        fullName:        params.fullName,
        email:           params.email,
        teamName:        params.teamName,
        teamMembers:     params.teamMembers,
        experienceLevel: params.experienceLevel,
        projectIdea:     params.projectIdea,
        agreedToRules:   true,
        status:          'active',
        createdAt:       now,
        updatedAt:       now,
      },
    }
  }
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

export async function fetchSubmissionsForEvent(eventId: string): Promise<ProjectSubmission[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false })
  if (error) { console.error('[sub] fetchForEvent:', error.message); return [] }
  return (data ?? []).map(rowToSub)
}

export async function fetchRegistrationsForEvent(eventId: string): Promise<Registration[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[reg] fetchForEvent:', error.message); return [] }
  return (data ?? []).map(rowToReg)
}

export async function markSubmissionViewed(submissionId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.rpc('admin_update_submission_meta', {
    p_submission_id: submissionId,
    p_mark_viewed: true,
  })
  if (error) { console.error('[sub] markViewed:', error.message) }
  return !error
}

export async function setSubmissionShortlisted(submissionId: string, shortlisted: boolean): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.rpc('admin_update_submission_meta', {
    p_submission_id: submissionId,
    p_shortlisted: shortlisted,
  })
  if (error) { console.error('[sub] setShortlisted:', error.message) }
  return !error
}

export async function setSubmissionRank(submissionId: string, rank: SubmissionRank | null): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.rpc('admin_update_submission_meta', {
    p_submission_id: submissionId,
    p_set_rank: true,
    p_rank: rank,
  })
  if (error) { console.error('[sub] setRank:', error.message) }
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

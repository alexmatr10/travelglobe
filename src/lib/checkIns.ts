import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/lib/supabase/types'
import type { Ping } from '@/types/ping'

type CheckInRow = Tables<'check_ins'>
type ProfileRow = Tables<'profiles'>

interface CheckInWithProfile extends CheckInRow {
  profiles?: ProfileRow | ProfileRow[] | null
}

export async function fetchCheckIns(
  client?: SupabaseClient
): Promise<Ping[]> {
  const supabase = client ?? (await createClient())

  const { data, error } = (await supabase
    .from('check_ins')
    .select(
      'id, lat, lng, note, user_id, created_at, profiles(username, avatar_url)'
    )
    .order('created_at', { ascending: false })) as {
    data: CheckInWithProfile[] | null
    error: { message: string } | null
  }

  if (error) {
    console.error('Failed to fetch check-ins:', error)
    return []
  }

  if (!data) return []

  const normalizeProfile = (
    profiles: ProfileRow | ProfileRow[] | null | undefined
  ): ProfileRow | null => {
    if (!profiles) return null
    return Array.isArray(profiles) ? profiles[0] ?? null : profiles
  }

  return data.map((checkIn) => {
    const profile = normalizeProfile(checkIn.profiles)

    return {
      id: checkIn.id,
      lat: checkIn.lat,
      lng: checkIn.lng,
      note: checkIn.note,
      createdAt: checkIn.created_at,
      userId: checkIn.user_id,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    }
  })
}

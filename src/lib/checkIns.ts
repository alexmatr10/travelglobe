import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'
import type { Ping } from '@/types/ping'

type CheckInRow = Tables<'check_ins'>
type TravelerRow = Tables<'travelers'>

interface CheckInWithTraveler extends CheckInRow {
  travelers?: TravelerRow | TravelerRow[] | null
}

export async function fetchCheckIns(): Promise<Ping[]> {
  const supabase = await createClient()

  const { data, error } = (await supabase
    .from('check_ins')
    .select(
      'id, lat, lng, note, user_id, created_at, travelers(username, avatar_url)'
    )
    .order('created_at', { ascending: false })) as {
    data: CheckInWithTraveler[] | null
    error: { message: string } | null
  }

  if (error) {
    console.error('Failed to fetch check-ins:', error)
    return []
  }

  if (!data) return []

  const normalizeTraveler = (
    travelers: TravelerRow | TravelerRow[] | null | undefined
  ): TravelerRow | null => {
    if (!travelers) return null
    return Array.isArray(travelers) ? travelers[0] ?? null : travelers
  }

  return data.map((checkIn) => {
    const traveler = normalizeTraveler(checkIn.travelers)

    return {
      id: checkIn.id,
      lat: checkIn.lat,
      lng: checkIn.lng,
      note: checkIn.note,
      createdAt: checkIn.created_at,
      userId: checkIn.user_id,
      username: traveler?.username ?? null,
      avatarUrl: traveler?.avatar_url ?? null,
    }
  })
}

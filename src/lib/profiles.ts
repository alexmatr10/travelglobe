import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'

export type Profile = Tables<'travelers'>
export type CheckIn = Tables<'check_ins'>

export async function getProfileWithCheckIns(userId: string): Promise<{
  profile: Profile
  checkIns: CheckIn[]
}> {
  const supabase = await createClient()

  const { data: profile, error: profileError } = (await supabase
    .from('travelers')
    .select('*')
    .eq('id', userId)
    .single()) as { data: Profile | null; error: { message: string } | null }

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? 'Profile not found')
  }

  const { data: checkIns, error: checkInsError } = (await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })) as {
    data: CheckIn[] | null
    error: { message: string } | null
  }

  if (checkInsError) {
    throw new Error(checkInsError.message)
  }

  return { profile, checkIns: checkIns ?? [] }
}

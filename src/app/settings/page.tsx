import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar/Navbar'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './ProfileForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: import('@/lib/supabase/types').Profile | null; error: unknown }

  if (!profile) redirect('/auth')

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-md px-4 pt-28">
        <h1 className="mb-6 text-2xl font-bold text-white">Edit profile</h1>
        <ProfileForm initialProfile={profile} />
      </main>
    </>
  )
}

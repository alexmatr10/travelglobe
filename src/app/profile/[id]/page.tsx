import Navbar from '@/components/Navbar/Navbar'
import Globe from '@/components/Globe/Globe'
import { getProfileWithCheckIns } from '@/lib/profiles'
import { notFound } from 'next/navigation'

interface ProfilePageProps {
  params: { id: string }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { profile, checkIns } = await getProfileWithCheckIns(params.id).catch(
    () => {
      notFound()
      return { profile: null as never, checkIns: [] as never }
    }
  )

  const pings = checkIns.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
  }))

  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <div className="pointer-events-none absolute left-6 top-24 z-10 max-w-xs rounded-2xl bg-slate-900/80 p-5 backdrop-blur">
          <h1 className="text-2xl font-bold text-white">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-slate-400">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-sm text-slate-300">{profile.bio}</p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {checkIns.length} ping{checkIns.length === 1 ? '' : 's'}
          </p>
        </div>
        <Globe pings={pings} />
      </main>
    </>
  )
}

import Navbar from '@/components/Navbar/Navbar'
import { HomeClient } from './HomeClient'
import { fetchCheckIns } from '@/lib/checkIns'

export default async function Home() {
  const pings = await fetchCheckIns()

  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <HomeClient initialPings={pings} />
      </main>
    </>
  )
}

import Navbar from '@/components/Navbar/Navbar'
import Globe from '@/components/Globe/Globe'
import { fetchCheckIns } from '@/lib/checkIns'

export default async function Home() {
  const pings = await fetchCheckIns()

  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <Globe pings={pings} />
      </main>
    </>
  )
}

import Navbar from '@/components/Navbar/Navbar'
import Globe from '@/components/Globe/Globe'

export default async function Home() {
  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <Globe pings={[]} />
      </main>
    </>
  )
}

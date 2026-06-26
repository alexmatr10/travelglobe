'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import Globe from '@/components/Globe/Globe'
import { CheckInModal } from '@/components/CheckInModal/CheckInModal'
import type { Ping } from '@/types/ping'

interface HomeClientProps {
  initialPings: Ping[]
}

export function HomeClient({ initialPings }: HomeClientProps) {
  const { user } = useAuth()
  const [pings, setPings] = useState<Ping[]>(initialPings)
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('public:check_ins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins' },
        (payload) => {
          const checkIn = payload.new as Ping
          setPings((prev) => {
            if (prev.some((p) => p.id === checkIn.id)) return prev
            return [checkIn, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    if (!user) return
    setDraft({ lat, lng })
  }

  const handleSubmit = async ({
    placeName,
    note,
  }: {
    placeName: string
    note: string
  }) => {
    if (!draft || !user) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: user.id,
        lat: draft.lat,
        lng: draft.lng,
        place_name: placeName,
        note: note || null,
      })
      .select('id, lat, lng, place_name, note, user_id, created_at')
      .single()

    if (error) {
      console.error('Failed to drop ping:', error)
      throw new Error(error.message)
    }

    if (!data) return

    const newPing: Ping = {
      id: data.id,
      lat: data.lat,
      lng: data.lng,
      note: data.note,
      createdAt: data.created_at,
      userId: data.user_id,
      username: null,
      avatarUrl: null,
    }

    setPings((prev) => [newPing, ...prev])
    setDraft(null)
  }

  return (
    <>
      <Globe pings={pings} onMapClick={handleMapClick} />
      {draft && (
        <CheckInModal
          lat={draft.lat}
          lng={draft.lng}
          onSubmit={handleSubmit}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  )
}

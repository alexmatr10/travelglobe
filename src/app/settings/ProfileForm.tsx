'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

export function ProfileForm({
  initialProfile,
}: {
  initialProfile: Profile
}) {
  const [displayName, setDisplayName] = useState(
    initialProfile.display_name || ''
  )
  const [bio, setBio] = useState(initialProfile.bio || '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('travelers')
      .update({ display_name: displayName, bio })
      .eq('id', initialProfile.id)
    setSaving(false)
    if (!error) router.push(`/profile/${initialProfile.id}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-slate-900 p-6 shadow-xl"
    >
      <div>
        <label className="block text-sm text-slate-400">Username</label>
        <p className="text-white">@{initialProfile.username}</p>
      </div>
      <input
        type="text"
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
      />
      <textarea
        placeholder="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={4}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-cyan-500 py-2 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}

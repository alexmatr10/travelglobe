'use client'

import { useState } from 'react'

interface CheckInModalProps {
  lat: number
  lng: number
  onSubmit: (data: { placeName: string; note: string }) => Promise<void> | void
  onClose: () => void
}

export function CheckInModal({ lat, lng, onSubmit, onClose }: CheckInModalProps) {
  const [placeName, setPlaceName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!placeName.trim() || saving) return

    setSaving(true)
    try {
      await onSubmit({ placeName: placeName.trim(), note: note.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-1 text-xl font-bold text-white">Drop a ping</h3>
        <p className="mb-4 text-sm text-slate-400">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Where are you?"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            required
            disabled={saving}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-60"
          />
          <textarea
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={saving}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-60"
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !placeName.trim()}
              className="flex-1 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Drop ping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

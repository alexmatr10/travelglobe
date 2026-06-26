'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, loading, signOut } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-100 transition-colors hover:text-sky-400"
        >
          TravelGlobe
        </Link>

        <div className="flex items-center gap-4">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
          ) : user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                className="text-sm font-medium text-slate-300 transition-colors hover:text-slate-100"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-slate-100 sm:block"
              >
                Settings
              </Link>
              <button
                onClick={async () => {
                  await signOut()
                }}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}

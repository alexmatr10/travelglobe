# TravelGlobe MVP Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Build a beautiful, browser-based social app where travelers have profiles and can drop “ping” check-ins on an interactive 3D globe.

**Architecture:** Next.js 14 (App Router) + React + TypeScript frontend. Mapbox GL JS renders a WebGL globe with pulsing location pings. Auth and data persistence use Supabase (Postgres + Auth + Realtime). Tailwind CSS handles styling. All MVP functionality is serverless via Supabase client calls from React Server/Client Components.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Mapbox GL JS, Supabase Auth/Postgres/Realtime, Vercel (deployment target).

---

## Task 0: Project Bootstrap

**Objective:** Create the Next.js project and install dependencies so subsequent tasks can build on a clean foundation.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/package.json`
- Create: `/Users/alessandromatrone/projects/travelglobe/.env.local` (skeleton)
- Create: `/Users/alessandromatrone/projects/travelglobe/tsconfig.json`
- Create: `/Users/alessandromatrone/projects/travelglobe/next.config.js`
- Create: `/Users/alessandromatrone/projects/travelglobe/tailwind.config.ts`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/globals.css`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/layout.tsx`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx`

**Step 1: Initialize project**

Run:
```bash
cd /Users/alessandromatrone/projects/travelglobe
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

Expected: Project created with `src/app/page.tsx`, `src/app/layout.tsx`, `tsconfig.json`, `tailwind.config.ts`, `package.json`.

**Step 2: Install runtime dependencies**

Run:
```bash
npm install mapbox-gl @supabase/supabase-js @supabase/auth-ui-react react-icons
npm install -D @types/mapbox-gl
```

Expected: `package.json` now lists these dependencies.

**Step 3: Create environment skeleton**

Create `/Users/alessandromatrone/projects/travelglobe/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

**Step 4: Verify dev server starts**

Run:
```bash
npm run dev
```

In a separate terminal, run:
```bash
curl -s http://localhost:3000 | head -n 5
```

Expected: HTML response containing `<!DOCTYPE html>` or similar.

**Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: bootstrap Next.js 14 + Tailwind + Mapbox + Supabase deps"
```

---

## Task 1: Supabase Schema & Auth Setup

**Objective:** Set up the Supabase project, define the minimal database schema, and enable email auth.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/supabase/migrations/001_initial_schema.sql`

**Step 1: Define schema**

Create the migration file:

```sql
-- supabase/migrations/001_initial_schema.sql

-- Users are handled by auth.users; extend with public profile.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Location check-ins (pings).
create table if not exists public.check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lat double precision not null,
  lng double precision not null,
  place_name text,
  note text,
  created_at timestamptz default now()
);

-- Indexes for common reads.
create index if not exists check_ins_user_id_idx on public.check_ins(user_id);
create index if not exists check_ins_created_at_idx on public.check_ins(created_at desc);

-- Row Level Security (RLS).
alter table public.profiles enable row level security;
alter table public.check_ins enable row level security;

-- Profiles: readable by everyone, writable by owner.
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Check-ins: readable by everyone, writable by owner.
create policy "Check-ins are viewable by everyone"
  on public.check_ins for select using (true);

create policy "Users can insert own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);

create policy "Users can delete own check-ins"
  on public.check_ins for delete using (auth.uid() = user_id);

-- Trigger: create profile after user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Step 2: Apply migration in Supabase**

Run via Supabase SQL Editor or CLI:
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Expected: Migration applies without errors, `profiles` and `check_ins` tables exist.

**Step 3: Enable email provider in Supabase Auth**

In Supabase Dashboard → Authentication → Providers → Email, ensure “Email provider” is enabled. Disable email confirmation for faster local testing if desired.

**Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "chore(supabase): add profiles and check_ins schema with RLS"
```

---

## Task 2: Supabase Client + Auth Context

**Objective:** Create typed Supabase clients and an auth context so the app can sign users in and know who is logged in.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/client.ts`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/server.ts`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/types.ts`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/context/AuthContext.tsx`

**Step 1: Write failing test for typed Supabase client**

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/client.test.ts`:

```typescript
import { createClient } from './client';

describe('createClient', () => {
  it('returns a supabase client', () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });
});
```

Run:
```bash
npx jest src/lib/supabase/client.test.ts
```

Expected: FAIL — module not found.

**Step 2: Implement Supabase clients**

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/types.ts`:

```typescript
export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckIn = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  place_name: string | null;
  note: string | null;
  created_at: string;
};
```

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Install missing dependency:
```bash
npm install @supabase/ssr
```

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

**Step 3: Run tests to verify client compiles**

Run:
```bash
npx jest src/lib/supabase/client.test.ts
```

Expected: PASS.

**Step 4: Implement AuthContext**

Create `/Users/alessandromatrone/projects/travelglobe/src/context/AuthContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Step 5: Wire AuthProvider into root layout**

Modify `/Users/alessandromatrone/projects/travelglobe/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TravelGlobe',
  description: 'See where travelers are pinging around the world.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Step 6: Run dev build to catch compile errors**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 7: Commit**

```bash
git add src/lib/supabase src/context/AuthContext.tsx src/app/layout.tsx package.json package-lock.json
git commit -m "feat(auth): add Supabase typed clients and AuthContext"
```

---

## Task 3: Mapbox Globe Component

**Objective:** Render a full-screen interactive 3D globe with a dark travel aesthetic and an initial “ping” marker.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/components/Globe/Globe.tsx`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/components/Globe/Globe.module.css`

**Step 1: Write failing test for Globe render**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/Globe/Globe.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { Globe } from './Globe';

describe('Globe', () => {
  it('renders a map container', () => {
    const { container } = render(<Globe pings={[]} />);
    expect(container.querySelector('[data-testid="globe-container"]')).toBeInTheDocument();
  });
});
```

Run:
```bash
npx jest src/components/Globe/Globe.test.tsx
```

Expected: FAIL — component not found.

**Step 2: Implement the Globe component**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/Globe/Globe.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './Globe.module.css';

export interface Ping {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

interface GlobeProps {
  pings: Ping[];
  onMapClick?: (lat: number, lng: number) => void;
}

export function Globe({ pings, onMapClick }: GlobeProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: { name: 'globe' },
      zoom: 1.5,
      center: [0, 20],
      antialias: true,
    });

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(15, 23, 42)',
        'high-color': 'rgb(30, 41, 59)',
        'horizon-blend': 0.4,
        'space-color': 'rgb(15, 23, 42)',
        'star-intensity': 0.6,
      });
    });

    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pings.forEach((ping) => {
      const el = document.createElement('div');
      el.className = styles.pingMarker;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ping.lng, ping.lat])
        .addTo(mapRef.current!);

      if (ping.label) {
        marker.setPopup(new mapboxgl.Popup({ offset: 12 }).setText(ping.label));
      }

      markersRef.current.push(marker);
    });
  }, [pings]);

  return (
    <div
      ref={mapContainer}
      data-testid="globe-container"
      className={styles.globe}
      aria-label="Interactive globe with traveler pings"
    />
  );
}
```

Create `/Users/alessandromatrone/projects/travelglobe/src/components/Globe/Globe.module.css`:

```css
.globe {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: #0f172a;
}

.pingMarker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, #22d3ee 0%, #0891b2 70%);
  box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.7);
  animation: pulse 2s infinite;
  cursor: pointer;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 16px rgba(34, 211, 238, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 211, 238, 0);
  }
}
```

**Step 3: Run tests**

Run:
```bash
npx jest src/components/Globe/Globe.test.tsx
```

Expected: PASS. (If Mapbox fails in jsdom due to WebGL, mock mapbox-gl in a setup file — add a note to Task 0 to install `jest-canvas-mock` and mock.)

**Step 4: Verify visually**

Replace `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx` temporarily with:

```tsx
import { Globe } from '@/components/Globe/Globe';

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <Globe pings={[{ id: 'demo', lat: 48.8566, lng: 2.3522, label: 'Paris' }]} />
    </main>
  );
}
```

Run:
```bash
npm run dev
```

Open `http://localhost:3000` and confirm a dark spinning globe with a pulsing cyan marker over Paris.

**Step 5: Revert page to placeholder and commit**

Revert `page.tsx` to a landing shell (see Task 5) and commit the Globe component.

```bash
git add src/components/Globe src/app/page.tsx
git commit -m "feat(globe): add Mapbox 3D globe with pulsing ping markers"
```

---

## Task 4: Auth UI (Sign In / Sign Up)

**Objective:** Add email/password sign-up and sign-in pages so travelers can create accounts.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/auth/page.tsx`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/components/Auth/AuthForm.tsx`

**Step 1: Write failing test for AuthForm**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/Auth/AuthForm.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('toggles between sign in and sign up', () => {
    render(<AuthForm />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/create account/i));
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });
});
```

Run:
```bash
npx jest src/components/Auth/AuthForm.test.tsx
```

Expected: FAIL — component not found.

**Step 2: Implement AuthForm**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/Auth/AuthForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-slate-900 p-8 shadow-xl">
      <h2 className="text-2xl font-bold">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isSignUp && (
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading ? 'Working…' : isSignUp ? 'Sign up' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-slate-400">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-cyan-400 hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Create account'}
        </button>
      </p>
    </form>
  );
}
```

**Step 3: Create auth page**

Create `/Users/alessandromatrone/projects/travelglobe/src/app/auth/page.tsx`:

```tsx
import { AuthForm } from '@/components/Auth/AuthForm';

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <AuthForm />
    </main>
  );
}
```

**Step 4: Run tests**

Run:
```bash
npx jest src/components/Auth/AuthForm.test.tsx
```

Expected: PASS.

**Step 5: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/auth`, create an account, and confirm Supabase Dashboard shows a new user and profile row.

**Step 6: Commit**

```bash
git add src/components/Auth src/app/auth/page.tsx
git commit -m "feat(auth): add email/password sign-in and sign-up UI"
```

---

## Task 5: Home Page Shell + Navigation

**Objective:** Build the main landing page shell with navigation, globe container, and a place to show user state.

**Files:**
- Modify: `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/components/Navbar/Navbar.tsx`

**Step 1: Implement Navbar**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/Navbar/Navbar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <Link href="/" className="text-xl font-bold tracking-tight text-cyan-400">
        TravelGlobe
      </Link>
      <div className="flex items-center gap-4">
        {!loading && user ? (
          <>
            <Link href={`/profile/${user.id}`} className="text-sm text-slate-300 hover:text-white">
              Profile
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
```

**Step 2: Update home page**

Modify `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx`:

```tsx
import { Navbar } from '@/components/Navbar/Navbar';
import { Globe } from '@/components/Globe/Globe';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <Globe pings={[]} />
      </main>
    </>
  );
}
```

**Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 4: Commit**

```bash
git add src/components/Navbar/Navbar.tsx src/app/page.tsx
git commit -m "feat(ui): add fixed navbar and full-screen home page shell"
```

---

## Task 6: Fetch & Display All Pings on the Globe

**Objective:** Load public check-ins from Supabase and render them as pings on the globe.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/lib/checkins.ts`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx` (convert to async server component)

**Step 1: Write failing test for check-in fetcher**

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/checkins.test.ts`:

```typescript
import { getRecentCheckIns } from './checkins';

jest.mock('./supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [{ id: '1', lat: 0, lng: 0, place_name: 'Origin', note: null, user_id: 'u1', created_at: 'now' }], error: null }),
        }),
      }),
    }),
  }),
}));

describe('getRecentCheckIns', () => {
  it('returns recent check-ins', async () => {
    const result = await getRecentCheckIns(10);
    expect(result).toHaveLength(1);
    expect(result[0].place_name).toBe('Origin');
  });
});
```

Run:
```bash
npx jest src/lib/checkins.test.ts
```

Expected: FAIL — module not found.

**Step 2: Implement check-in fetcher**

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/checkins.ts`:

```typescript
import { createClient } from './supabase/server';
import { CheckIn } from './supabase/types';

export async function getRecentCheckIns(limit = 200): Promise<CheckIn[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
```

**Step 3: Run tests**

Run:
```bash
npx jest src/lib/checkins.test.ts
```

Expected: PASS.

**Step 4: Wire into home page**

Modify `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx` to be an async server component:

```tsx
import { Navbar } from '@/components/Navbar/Navbar';
import { Globe } from '@/components/Globe/Globe';
import { getRecentCheckIns } from '@/lib/checkins';

export default async function Home() {
  const checkIns = await getRecentCheckIns(200);
  const pings = checkIns.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    label: c.place_name ?? undefined,
  }));

  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <Globe pings={pings} />
      </main>
    </>
  );
}
```

**Step 5: Seed a test check-in via Supabase SQL Editor**

```sql
insert into public.check_ins (user_id, lat, lng, place_name, note)
values (
  (select id from public.profiles limit 1),
  35.6762,
  139.6503,
  'Tokyo',
  'First ping!'
);
```

**Step 6: Verify visually**

Run `npm run dev` and confirm a ping appears over Tokyo.

**Step 7: Commit**

```bash
git add src/lib/checkins.ts src/app/page.tsx
git commit -m "feat(globe): fetch and render public check-ins as pings"
```

---

## Task 7: Drop a Ping (Check-In)

**Objective:** Let authenticated users click anywhere on the globe to create a new check-in with a place name and note.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/components/CheckInModal/CheckInModal.tsx`
- Modify: `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx`

**Step 1: Write failing test for CheckInModal**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/CheckInModal/CheckInModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInModal } from './CheckInModal';

describe('CheckInModal', () => {
  it('submits lat, lng, place_name and note', () => {
    const onSubmit = jest.fn();
    render(<CheckInModal lat={40.7} lng={-74} onSubmit={onSubmit} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/where are you/i), { target: { value: 'NYC' } });
    fireEvent.change(screen.getByPlaceholderText(/add a note/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /drop ping/i }));
    expect(onSubmit).toHaveBeenCalledWith({ placeName: 'NYC', note: 'Hello' });
  });
});
```

Run:
```bash
npx jest src/components/CheckInModal/CheckInModal.test.tsx
```

Expected: FAIL — component not found.

**Step 2: Implement CheckInModal**

Create `/Users/alessandromatrone/projects/travelglobe/src/components/CheckInModal/CheckInModal.tsx`:

```tsx
'use client';

import { useState } from 'react';

interface CheckInModalProps {
  lat: number;
  lng: number;
  onSubmit: (data: { placeName: string; note: string }) => void;
  onClose: () => void;
}

export function CheckInModal({ lat, lng, onSubmit, onClose }: CheckInModalProps) {
  const [placeName, setPlaceName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({ placeName, note });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-1 text-xl font-bold">Drop a ping</h3>
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
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <textarea
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2 text-slate-300 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !placeName.trim()}
              className="flex-1 rounded-lg bg-cyan-500 py-2 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Drop ping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Run tests**

Run:
```bash
npx jest src/components/CheckInModal/CheckInModal.test.tsx
```

Expected: PASS.

**Step 4: Wire click-to-check-in into home page**

Because `page.tsx` is a server component, move the interactive globe wrapper to a client component. Create `/Users/alessandromatrone/projects/travelglobe/src/app/HomeClient.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Globe } from '@/components/Globe/Globe';
import { CheckInModal } from '@/components/CheckInModal/CheckInModal';
import { createClient } from '@/lib/supabase/client';
import { CheckIn } from '@/lib/supabase/types';

interface HomeClientProps {
  initialPings: Array<{ id: string; lat: number; lng: number; label?: string }>;
  userId?: string;
}

export function HomeClient({ initialPings, userId }: HomeClientProps) {
  const [pings, setPings] = useState(initialPings);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    if (!userId) return;
    setDraft({ lat, lng });
  };

  const handleSubmit = async ({ placeName, note }: { placeName: string; note: string }) => {
    if (!draft || !userId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: userId,
        lat: draft.lat,
        lng: draft.lng,
        place_name: placeName,
        note,
      })
      .select()
      .single();

    if (error) throw error;

    const checkIn = data as CheckIn;
    setPings((prev) => [
      { id: checkIn.id, lat: checkIn.lat, lng: checkIn.lng, label: checkIn.place_name ?? undefined },
      ...prev,
    ]);
    setDraft(null);
  };

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
  );
}
```

Update `/Users/alessandromatrone/projects/travelglobe/src/app/page.tsx`:

```tsx
import { Navbar } from '@/components/Navbar/Navbar';
import { getRecentCheckIns } from '@/lib/checkins';
import { createClient } from '@/lib/supabase/server';
import { HomeClient } from './HomeClient';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const checkIns = await getRecentCheckIns(200);
  const pings = checkIns.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    label: c.place_name ?? undefined,
  }));

  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <HomeClient initialPings={pings} userId={user?.id} />
      </main>
    </>
  );
}
```

**Step 5: Manual verification**

1. Sign in.
2. Click a spot on the globe.
3. Enter place name/note, submit.
4. Confirm new ping renders and persists after refresh.

**Step 6: Commit**

```bash
git add src/components/CheckInModal src/app/HomeClient.tsx src/app/page.tsx
git commit -m "feat(checkin): allow authenticated users to drop pings on the globe"
```

---

## Task 8: User Profile Page

**Objective:** Add a profile page that shows a traveler’s info and their check-in history on the globe.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/profile/[id]/page.tsx`
- Create: `/Users/alessandromatrone/projects/travelglobe/src/lib/profiles.ts`

**Step 1: Write failing test for profile fetcher**

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/profiles.test.ts`:

```typescript
import { getProfileWithCheckIns } from './profiles';

jest.mock('./supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'u1', username: 'alice' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [{ id: 'c1', lat: 0, lng: 0 }], error: null }),
          }),
        });
      }
    },
  }),
}));

describe('getProfileWithCheckIns', () => {
  it('returns a profile and check-ins', async () => {
    const { profile, checkIns } = await getProfileWithCheckIns('u1');
    expect(profile.username).toBe('alice');
    expect(checkIns).toHaveLength(1);
  });
});
```

Run:
```bash
npx jest src/lib/profiles.test.ts
```

Expected: FAIL — module not found.

**Step 2: Implement profile fetcher**

Create `/Users/alessandromatrone/projects/travelglobe/src/lib/profiles.ts`:

```typescript
import { createClient } from './supabase/server';
import { Profile, CheckIn } from './supabase/types';

export async function getProfileWithCheckIns(userId: string): Promise<{
  profile: Profile;
  checkIns: CheckIn[];
}> {
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Profile not found');

  const { data: checkIns, error: checkInsError } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (checkInsError) throw checkInsError;

  return { profile: profile as Profile, checkIns: (checkIns ?? []) as CheckIn[] };
}
```

**Step 3: Run tests**

Run:
```bash
npx jest src/lib/profiles.test.ts
```

Expected: PASS.

**Step 4: Create profile page**

Create `/Users/alessandromatrone/projects/travelglobe/src/app/profile/[id]/page.tsx`:

```tsx
import { Navbar } from '@/components/Navbar/Navbar';
import { Globe } from '@/components/Globe/Globe';
import { getProfileWithCheckIns } from '@/lib/profiles';
import { notFound } from 'next/navigation';

interface ProfilePageProps {
  params: { id: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { profile, checkIns } = await getProfileWithCheckIns(params.id).catch(() => {
    notFound();
  });

  const pings = checkIns.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    label: c.place_name ?? undefined,
  }));

  return (
    <>
      <Navbar />
      <main className="h-screen w-screen pt-16">
        <div className="pointer-events-none absolute left-6 top-24 z-10 max-w-xs rounded-2xl bg-slate-900/80 p-5 backdrop-blur">
          <h1 className="text-2xl font-bold text-white">{profile.display_name || profile.username}</h1>
          <p className="text-sm text-slate-400">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm text-slate-300">{profile.bio}</p>}
          <p className="mt-3 text-xs text-slate-500">{checkIns.length} ping{checkIns.length === 1 ? '' : 's'}</p>
        </div>
        <Globe pings={pings} />
      </main>
    </>
  );
}
```

**Step 5: Verify profile link works**

1. Run `npm run dev`.
2. Click “Profile” in the navbar.
3. Confirm the page shows the signed-in user’s pings on the globe.

**Step 6: Commit**

```bash
git add src/lib/profiles.ts src/app/profile
git commit -m "feat(profile): add profile page with user pings on globe"
```

---

## Task 9: Realtime Ping Updates

**Objective:** When another traveler drops a ping, it appears on the globe without a manual refresh.

**Files:**
- Modify: `/Users/alessandromatrone/projects/travelglobe/src/app/HomeClient.tsx`

**Step 1: Write failing test for realtime subscription**

Create `/Users/alessandromatrone/projects/travelglobe/src/app/HomeClient.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { HomeClient } from './HomeClient';

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({}),
    }),
  }),
}));

describe('HomeClient', () => {
  it('renders without crashing', () => {
    render(<HomeClient initialPings={[]} />);
  });
});
```

Run:
```bash
npx jest src/app/HomeClient.test.tsx
```

Expected: PASS after mock is in place. This is mostly a smoke test; realtime is hard to unit test.

**Step 2: Subscribe to check_ins inserts**

Modify `/Users/alessandromatrone/projects/travelglobe/src/app/HomeClient.tsx`:

Add this `useEffect` inside `HomeClient`:

```tsx
import { useEffect } from 'react';

// ... inside HomeClient:
useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel('public:check_ins')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'check_ins' },
      (payload) => {
        const checkIn = payload.new as CheckIn;
        setPings((prev) => {
          if (prev.some((p) => p.id === checkIn.id)) return prev;
          return [
            { id: checkIn.id, lat: checkIn.lat, lng: checkIn.lng, label: checkIn.place_name ?? undefined },
            ...prev,
          ];
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**Step 3: Enable Realtime in Supabase**

In Supabase Dashboard → Database → Replication → Realtime, ensure the `check_ins` table is listed for realtime. If not, run:

```sql
begin;
  -- Supabase Realtime already enabled by default on most projects.
  -- If not, run:
  -- drop publication if exists supabase_realtime;
  -- create publication supabase_realtime;
  alter publication supabase_realtime add table public.check_ins;
commit;
```

**Step 4: Manual verification**

1. Open the app in two browsers, signed in as two different users.
2. Drop a ping in one browser.
3. Confirm it appears in the other browser within seconds.

**Step 5: Commit**

```bash
git add src/app/HomeClient.tsx src/app/HomeClient.test.tsx
git commit -m "feat(realtime): live-update globe when new check-ins arrive"
```

---

## Task 10: Edit Profile (Username, Display Name, Bio)

**Objective:** Let users customize their profile from a simple settings page.

**Files:**
- Create: `/Users/alessandromatrone/projects/travelglobe/src/app/settings/page.tsx`

**Step 1: Write failing test for profile update**

Create `/Users/alessandromatrone/projects/travelglobe/src/app/settings/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import SettingsPage from './page';

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 'u1', username: 'alice' }, error: null }),
        }),
      }),
    }),
  }),
}));

describe('SettingsPage', () => {
  it('renders for a logged-in user', async () => {
    render(await SettingsPage());
    expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
  });
});
```

Run:
```bash
npx jest src/app/settings/page.test.tsx
```

Expected: FAIL — page not found.

**Step 2: Implement settings page**

Create `/Users/alessandromatrone/projects/travelglobe/src/app/settings/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/Navbar/Navbar';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-md px-4 pt-28">
        <h1 className="mb-6 text-2xl font-bold">Edit profile</h1>
        <ProfileForm initialProfile={profile} />
      </main>
    </>
  );
}
```

Create `/Users/alessandromatrone/projects/travelglobe/src/app/settings/ProfileForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/types';

export function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [displayName, setDisplayName] = useState(initialProfile.display_name || '');
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio })
      .eq('id', initialProfile.id);
    setSaving(false);
    if (!error) router.push(`/profile/${initialProfile.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-slate-900 p-6 shadow-xl">
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
  );
}
```

**Step 3: Add “Settings” link to Navbar**

Modify `/Users/alessandromatrone/projects/travelglobe/src/components/Navbar/Navbar.tsx`:

Add inside the authenticated branch, before Sign out:

```tsx
<Link href="/settings" className="text-sm text-slate-300 hover:text-white">
  Settings
</Link>
```

**Step 4: Run tests**

Run:
```bash
npx jest src/app/settings/page.test.tsx
```

Expected: PASS.

**Step 5: Manual verification**

1. Sign in, go to `/settings`.
2. Change display name and bio, save.
3. Confirm profile page reflects the changes.

**Step 6: Commit**

```bash
git add src/app/settings src/components/Navbar/Navbar.tsx
git commit -m "feat(settings): add profile editing page"
```

---

## Task 11: Responsive Polish & Accessibility

**Objective:** Make the app usable on phones and accessible to keyboard/screen-reader users.

**Files:**
- Modify: `/Users/alessandromatrone/projects/travelglobe/src/components/Navbar/Navbar.tsx`
- Modify: `/Users/alessandromatrone/projects/travelglobe/src/components/CheckInModal/CheckInModal.tsx`
- Modify: `/Users/alessandromatrone/projects/travelglobe/src/components/Auth/AuthForm.tsx`

**Step 1: Add skip link and focus styles**

Modify `globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:focus-visible {
  outline: 2px solid #22d3ee;
  outline-offset: 2px;
}
```

**Step 2: Ensure mobile navbar stacks**

No code change needed if Tailwind classes already use `flex` and spacing. Add a hamburger for very small screens if desired; for MVP, keep the navbar as-is but add `sm:` prefixes where appropriate.

**Step 3: Add aria labels to interactive elements**

Review each form/button and add `aria-label` where visible text is absent.

**Step 4: Test on mobile viewport**

Use browser DevTools responsive mode, 375px width. Confirm:
- Globe still loads full screen.
- Modal fits within viewport.
- Navbar does not wrap awkwardly.

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "a11y: focus-visible and responsive polish"
```

---

## Task 12: Deploy to Vercel

**Objective:** Ship the MVP to production.

**Files:**
- Modify: `/Users/alessandromatrone/projects/travelglobe/.env.local` → values for production (keep local copy, set production env vars in Vercel dashboard)

**Step 1: Configure next.config.js**

Ensure `/Users/alessandromatrone/projects/travelglobe/next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

**Step 2: Push to GitHub**

Run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/travelglobe.git
git branch -M main
git push -u origin main
```

**Step 3: Import into Vercel**

1. Go to https://vercel.com/new.
2. Import the GitHub repo.
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

**Step 4: Add redirect URL in Supabase**

In Supabase Dashboard → Authentication → URL Configuration, set:
- Site URL: `https://travelglobe.vercel.app`
- Redirect URLs: `https://travelglobe.vercel.app/**`

**Step 5: Verify production**

1. Visit the deployed URL.
2. Sign up, drop a ping, view profile.
3. Confirm pings render and realtime works across two browsers.

**Step 6: Commit**

```bash
git add next.config.js
git commit -m "chore(deploy): configure standalone Next.js build for Vercel"
```

---

## Summary of Deliverables

- [ ] Working Next.js web app with Mapbox 3D globe.
- [ ] Email/password auth via Supabase.
- [ ] Public “pings” loaded from Postgres.
- [ ] Authenticated click-to-check-in anywhere on the globe.
- [ ] Profile page per user showing their pings.
- [ ] Realtime ping updates across clients.
- [ ] Editable profile (display name + bio).
- [ ] Deployed to Vercel with production env vars.

---

## Future Work (out of MVP scope)

- Photo posts tied to locations.
- Friend follows and personal feed.
- Trip timelines / itineraries.
- Like/comment on pings.
- Search and discovery.

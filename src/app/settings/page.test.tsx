import { render, screen } from '@testing-library/react'
import SettingsPage from './page'
import { AuthProvider } from '@/context/AuthContext'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1', email: 'alice@example.com' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'u1',
              username: 'alice',
              display_name: 'Alice',
              bio: 'Traveler',
              avatar_url: null,
              created_at: '2025-06-25T12:00:00Z',
              updated_at: '2025-06-25T12:00:00Z',
            },
            error: null,
          }),
        })),
      })),
    })),
  })),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1', email: 'alice@example.com' } },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  })),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

describe('SettingsPage', () => {
  it('renders for a logged-in user', async () => {
    const Page = await SettingsPage()
    render(<AuthProvider>{Page}</AuthProvider>)
    expect(screen.getByText(/edit profile/i)).toBeInTheDocument()
  })
})

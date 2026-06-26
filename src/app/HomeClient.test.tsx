import { render } from '@testing-library/react'
import { HomeClient } from './HomeClient'
import { AuthProvider } from '@/context/AuthContext'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn(function () {
        return this
      }),
      subscribe: jest.fn(() => ({})),
    })),
    removeChannel: jest.fn(),
  })),
}))

describe('HomeClient', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AuthProvider>
        <HomeClient initialPings={[]} />
      </AuthProvider>
    )
    expect(container.querySelector('[data-testid="globe-container"]')).toBeInTheDocument()
  })
})

import { describe, it, expect } from '@jest/globals'
import { getProfileWithCheckIns } from './profiles'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn((table: string) => {
      if (table === 'travelers') {
        return {
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
        }
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'c1',
                  lat: 0,
                  lng: 0,
                  place_name: 'Origin',
                  note: null,
                  user_id: 'u1',
                  created_at: '2025-06-25T12:00:00Z',
                },
              ],
              error: null,
            }),
          })),
        })),
      }
    }),
  })),
}))

describe('getProfileWithCheckIns', () => {
  it('returns a profile and check-ins', async () => {
    const { profile, checkIns } = await getProfileWithCheckIns('u1')
    expect(profile.username).toBe('alice')
    expect(checkIns).toHaveLength(1)
  })
})

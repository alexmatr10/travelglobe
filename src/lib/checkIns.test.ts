import { describe, it, expect, jest } from '@jest/globals'
import { fetchCheckIns } from './checkIns'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockClient({
  data,
  error,
}: {
  data: unknown[] | null
  error: { message: string } | null
}) {
  const orderMock = jest.fn().mockResolvedValue({ data, error })
  const selectMock = jest.fn().mockReturnValue({ order: orderMock })
  const fromMock = jest.fn().mockReturnValue({ select: selectMock })
  return { from: fromMock } as unknown as SupabaseClient
}

describe('fetchCheckIns', () => {
  it('returns an empty array when the query errors', async () => {
    const client = createMockClient({
      data: null,
      error: { message: 'network failure' },
    })

    const result = await fetchCheckIns(client)

    expect(result).toEqual([])
    expect(client.from).toHaveBeenCalledWith('check_ins')
  })

  it('returns sanitized pings when check-ins exist', async () => {
    const client = createMockClient({
      data: [
        {
          id: 'checkin-1',
          lat: 48.8566,
          lng: 2.3522,
          note: 'Paris',
          user_id: 'user-1',
          created_at: '2025-06-25T12:00:00Z',
          profiles: {
            username: 'traveller_one',
            avatar_url: 'https://example.com/avatar1.png',
          },
        },
        {
          id: 'checkin-2',
          lat: 35.6762,
          lng: 139.6503,
          note: null,
          user_id: 'user-2',
          created_at: '2025-06-24T08:30:00Z',
          profiles: [
            {
              username: 'traveller_two',
              avatar_url: null,
            },
          ],
        },
      ],
      error: null,
    })

    const result = await fetchCheckIns(client)

    expect(result).toEqual([
      {
        id: 'checkin-1',
        lat: 48.8566,
        lng: 2.3522,
        note: 'Paris',
        createdAt: '2025-06-25T12:00:00Z',
        userId: 'user-1',
        username: 'traveller_one',
        avatarUrl: 'https://example.com/avatar1.png',
      },
      {
        id: 'checkin-2',
        lat: 35.6762,
        lng: 139.6503,
        note: null,
        createdAt: '2025-06-24T08:30:00Z',
        userId: 'user-2',
        username: 'traveller_two',
        avatarUrl: null,
      },
    ])
  })

  it('returns an empty array when no check-ins exist', async () => {
    const client = createMockClient({ data: [], error: null })

    const result = await fetchCheckIns(client)

    expect(result).toEqual([])
  })
})

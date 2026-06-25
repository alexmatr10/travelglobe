import { createClient } from './client'

describe('createClient', () => {
  it('should return a Supabase client when env vars are available', () => {
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})

import { describe, it, expect } from '@jest/globals'
import { createClient } from './client'

describe('Supabase browser client', () => {
  it('creates a client instance', () => {
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})

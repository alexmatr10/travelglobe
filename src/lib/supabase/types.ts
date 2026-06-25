export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Profile>
      }
      check_ins: {
        Row: CheckIn
        Insert: Omit<CheckIn, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<CheckIn>
      }
    }
  }
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface CheckIn {
  id: string
  user_id: string
  lat: number
  lng: number
  place_name: string | null
  note: string | null
  created_at: string
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

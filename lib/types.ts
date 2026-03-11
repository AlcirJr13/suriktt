// types.ts

export interface Evento {
  id: string
  name: string
  event_date: string
  created_at: string
}

export interface Post {
  id: string
  event_id: string
  type: 'message' | 'image' | 'video'
  content: string
  created_at: string
}
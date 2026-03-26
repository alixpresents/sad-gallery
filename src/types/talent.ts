export interface TalentData {
  links: { label: string; url: string }[]
  pins: { label: string; url: string }[]
}

export interface Talent {
  id: string
  created_at: string
  updated_at: string
  name: string
  status: 'discovered' | 'to_contact' | 'contacted' | 'confirmed'
  disciplines: string[]
  tags: string[]
  image_url: string
  location: string
  email: string
  notes: string
  added_at: string
  last_contact: string | null
  data: TalentData
}

export type TalentInsert = Omit<Talent, 'id' | 'created_at' | 'updated_at' | 'fts'>
export type TalentUpdate = Partial<TalentInsert> & { id: string }

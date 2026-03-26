export const DISCIPLINES = [
  'Photographe',
  'Réalisateur',
  'Writer',
  'Artiste visuel',
  'Net Art',
] as const

export const STATUSES = [
  { id: 'discovered', label: 'Découvert', color: '#a0a0a0' },
  { id: 'to_contact', label: 'À contacter', color: '#e8a838' },
  { id: 'contacted', label: 'Contacté', color: '#6b8aed' },
  { id: 'confirmed', label: 'Confirmé', color: '#4ade80' },
] as const

export type StatusId = typeof STATUSES[number]['id']

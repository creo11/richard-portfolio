export const MAX_PLAYER_REQUEST_BYTES = 4096

export type PlayerDetailsInput = {
  name: string
  description: string | null
}

export function validatePlayerDetails(value: unknown): PlayerDetailsInput | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  if (typeof record.name !== 'string') {
    return null
  }

  const name = record.name.trim()
  if (name.length < 1 || name.length > 80) {
    return null
  }

  if (record.description !== undefined && typeof record.description !== 'string') {
    return null
  }

  const description = typeof record.description === 'string'
    ? record.description.trim()
    : ''

  if (description.length > 240) {
    return null
  }

  return {
    name,
    description: description.length === 0 ? null : description,
  }
}

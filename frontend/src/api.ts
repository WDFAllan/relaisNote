export const UNAUTHORIZED_EVENT = 'relais:unauthorized'

export const notifyUnauthorized = () => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))

// Le payload d'un JWT est du base64url, à convertir en base64 standard avant décodage.
export const getTokenExpiryMs = (jwt: string): number | null => {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload))
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

export const api = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    notifyUnauthorized()
    throw new Error('Session expirée, veuillez vous reconnecter.')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message ?? `Erreur ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_API_KEY, STORAGE_KEYS } from './config'

/**
 * Shared API-key state across all demo pages: reads the key saved by the
 * Places page (localStorage) and falls back to the public demo key. Demo
 * keys only work near the demo cities (New York, London, Paris, Bondi).
 */
export function useApiKey(): [string, (key: string) => void] {
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.API_KEY)
      if (saved) setApiKey(saved)
    } catch { /* SSR/no storage */ }
  }, [])

  const update = (key: string) => {
    setApiKey(key)
    try { localStorage.setItem(STORAGE_KEYS.API_KEY, key) } catch { /* ignore */ }
  }
  return [apiKey, update]
}

/** Demo cities the public demo key is limited to. */
export const DEMO_CITIES = [
  { city: 'New York', lat: 40.7128, lng: -74.006 },
  { city: 'London', lat: 51.5074, lng: -0.1278 },
  { city: 'Paris', lat: 48.8566, lng: 2.3522 },
  { city: 'Bondi Beach', lat: -33.891, lng: 151.2769 },
]

export const getErrorMessage = (error: any): string => {
  if (error?.response?.message) return error.response.message
  if (error?.message) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

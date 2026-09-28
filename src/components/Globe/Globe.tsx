'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import styles from './Globe.module.css'

export interface Ping {
  id?: string | number
  lat: number
  lng: number
}

export interface GlobeProps {
  pings?: Ping[]
  onMapClick?: (lat: number, lng: number) => void
}

type MarkerMap = Map<string | number, mapboxgl.Marker>

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

// Diff pings against existing markers: create missing, remove stale.
// IMPORTANT: must run only after the map has fired 'load' — Mapbox GL v3
// globe projection hides markers added before the style is ready
// (they never get positioned, even on later renders).
function syncMarkers(pings: Ping[], map: mapboxgl.Map, markerMap: MarkerMap) {
  const desiredIds = new Set<string | number>()
  const keyedPings = pings.map((ping, index): [string | number, Ping] => {
    const key = ping.id ?? `index-${index}`
    desiredIds.add(key)
    return [key, ping]
  })

  markerMap.forEach((marker, id) => {
    if (!desiredIds.has(id)) {
      marker.remove()
      markerMap.delete(id)
    }
  })

  keyedPings.forEach(([id, ping]) => {
    if (markerMap.has(id)) return

    const el = document.createElement('div')
    el.className = styles.pingMarker
    el.setAttribute('data-testid', 'ping-marker')

    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([ping.lng, ping.lat])
      .addTo(map)

    markerMap.set(id, marker)
  })
}

export default function Globe({ pings = [], onMapClick }: GlobeProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerMapRef = useRef<MarkerMap>(new Map())
  const mapLoadedRef = useRef(false)
  const pendingPingsRef = useRef<Ping[] | null>(null)
  const onMapClickRef = useRef(onMapClick)

  onMapClickRef.current = onMapClick

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: { name: 'globe' },
      zoom: 1.5,
      center: [0, 20],
      antialias: true,
    })

    mapRef.current = map
    // Debug/test handle for automated verification (harmless in prod)
    ;(window as unknown as Record<string, unknown>).__tgMap = map

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(15, 23, 42)',
        'high-color': 'rgb(30, 41, 59)',
        'horizon-blend': 0.4,
        'space-color': 'rgb(2, 6, 23)',
        'star-intensity': 0.35,
      })
    })

    map.on('load', () => {
      mapLoadedRef.current = true
      const pending = pendingPingsRef.current
      pendingPingsRef.current = null
      if (pending) syncMarkers(pending, map, markerMapRef.current)
    })

    map.on('click', (event) => {
      const latestHandler = onMapClickRef.current
      if (!latestHandler) return
      const { lng, lat } = event.lngLat
      latestHandler(lat, lng)
    })

    const markerMap = markerMapRef.current

    return () => {
      markerMap.forEach((marker) => marker.remove())
      markerMap.clear()
      map.remove()
      mapRef.current = null
      mapLoadedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!mapLoadedRef.current) {
      // Pings arriving before the style is loaded (e.g. server-rendered on
      // first paint) must wait — markers added pre-load stay hidden forever.
      pendingPingsRef.current = pings
      return
    }

    syncMarkers(pings, map, markerMapRef.current)
  }, [pings])

  return (
    <div
      ref={mapContainer}
      className={styles.globe}
      data-testid="globe-container"
      aria-label="Interactive 3D globe"
      role="application"
    />
  )
}

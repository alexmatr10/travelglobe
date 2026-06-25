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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export default function Globe({ pings = [], onMapClick }: GlobeProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerMapRef = useRef<Map<string | number, mapboxgl.Marker>>(new Map())
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

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(15, 23, 42)',
        'high-color': 'rgb(30, 41, 59)',
        'horizon-blend': 0.4,
        'space-color': 'rgb(2, 6, 23)',
        'star-intensity': 0.35,
      })
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
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const desiredIds = new Set<string | number>()
    const keyedPings = pings.map((ping, index): [string | number, Ping] => {
      const key = ping.id ?? `index-${index}`
      desiredIds.add(key)
      return [key, ping]
    })

    markerMapRef.current.forEach((marker, id) => {
      if (!desiredIds.has(id)) {
        marker.remove()
        markerMapRef.current.delete(id)
      }
    })

    keyedPings.forEach(([id, ping]) => {
      if (markerMapRef.current.has(id)) return

      const el = document.createElement('div')
      el.className = styles.pingMarker
      el.setAttribute('data-testid', 'ping-marker')

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([ping.lng, ping.lat])
        .addTo(map)

      markerMapRef.current.set(id, marker)
    })
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

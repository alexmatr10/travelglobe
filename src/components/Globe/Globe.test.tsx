import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import mapboxgl from 'mapbox-gl'
import Globe from './Globe'

// Access the MapMock instance Globe registered on window
const getMapMock = () =>
  (window as unknown as { __tgMap?: { fire: (event: string) => void } }).__tgMap

const MarkerMock = mapboxgl.Marker as unknown as jest.Mock

const aPing = { id: 'ping-1', lat: 25.2048, lng: 55.2708 }

describe('Globe', () => {
  beforeEach(() => {
    MarkerMock.mockClear()
  })

  it('renders a map container with data-testid="globe-container"', () => {
    render(<Globe />)
    const container = screen.getByTestId('globe-container')
    expect(container).toBeInTheDocument()
  })

  it('does NOT create markers before the map fires load', () => {
    // Regression: Mapbox GL v3 globe projection hides markers added before
    // style load (they stay unpositioned forever). Markers must wait for
    // map.on('load').
    render(<Globe pings={[aPing]} />)
    expect(MarkerMock).not.toHaveBeenCalled()
  })

  it('creates markers for pending pings once the map loads', () => {
    render(<Globe pings={[aPing]} />)
    expect(MarkerMock).not.toHaveBeenCalled()

    getMapMock()?.fire('load')

    expect(MarkerMock).toHaveBeenCalledTimes(1)
    const marker = MarkerMock.mock.results[0].value
    expect(marker.setLngLat).toHaveBeenCalledWith([55.2708, 25.2048])
  })

  it('creates markers immediately for pings arriving after load', () => {
    const { rerender } = render(<Globe />)
    getMapMock()?.fire('load')

    rerender(<Globe pings={[aPing]} />)
    expect(MarkerMock).toHaveBeenCalledTimes(1)
    expect(MarkerMock.mock.results[0].value.setLngLat).toHaveBeenCalledWith([55.2708, 25.2048])
  })

  it('replaces pending pings with the latest list before load', () => {
    const { rerender } = render(<Globe pings={[aPing]} />)
    const secondPing = { id: 'ping-2', lat: 16.568, lng: 0 }
    rerender(<Globe pings={[secondPing]} />)
    getMapMock()?.fire('load')

    expect(MarkerMock).toHaveBeenCalledTimes(1)
    expect(MarkerMock.mock.results[0].value.setLngLat).toHaveBeenCalledWith([0, 16.568])
  })
})

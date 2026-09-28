const noop = () => undefined

const markerMock = jest.fn().mockImplementation(() => ({
  setLngLat: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
  remove: jest.fn(),
}))

class MapMock {
  on = jest.fn().mockImplementation(function (this: MapMock, event: string, handler: unknown) {
    if (event === 'style.load' && typeof handler === 'function') {
      handler({ target: this })
    }
    // capture handlers so tests can fire lifecycle events (e.g. 'load')
    this._handlers = this._handlers || {}
    this._handlers[event] = this._handlers[event] || []
    this._handlers[event].push(handler)
    return this
  })
  _handlers: Record<string, unknown[]> = {}
  off = jest.fn().mockReturnThis()
  setFog = jest.fn().mockReturnThis()
  remove = jest.fn()
  setCenter = jest.fn().mockReturnThis()
  setZoom = jest.fn().mockReturnThis()
  setProjection = jest.fn().mockReturnThis()
  project = jest.fn().mockReturnValue({ x: 0, y: 0 })
  unproject = jest.fn().mockReturnValue({ lng: 0, lat: 0 })
  getBounds = jest.fn().mockReturnValue({
    getNorthWest: () => ({ lng: -180, lat: 90 }),
    getSouthEast: () => ({ lng: 180, lat: -90 }),
  })
  fire(event: string) {
    ;(this._handlers[event] || []).forEach((handler) => {
      if (typeof handler === 'function') handler({ target: this })
    })
  }
}

const mapboxglMock = {
  accessToken: '',
  Map: MapMock,
  Marker: markerMock,
  LngLat: noop,
  LngLatBounds: noop,
  Evented: class {},
}

module.exports = mapboxglMock

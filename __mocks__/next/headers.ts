export function cookies() {
  return Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
    setAll: jest.fn(),
  })
}

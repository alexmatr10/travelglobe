const createBrowserClient = jest.fn(() => ({
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signOut: jest.fn(),
  },
}))

module.exports = { createBrowserClient }

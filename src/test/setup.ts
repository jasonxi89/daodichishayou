import '@testing-library/jest-dom'

// Suppress console.log noise from page lifecycle hooks in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

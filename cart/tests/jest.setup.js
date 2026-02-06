// Jest setup file for cart microservice tests
const mongoose = require('mongoose')

// Set environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cart-test'

// Increase test timeout to handle database operations
jest.setTimeout(10000)

// Global setup before all tests
beforeAll(async () => {
  // Connect to test database
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('Connected to test database')
  } catch (error) {
    console.error('Failed to connect to test database:', error)
    process.exit(1)
  }
})

// Global cleanup after all tests
afterAll(async () => {
  try {
    // Close database connection
    await mongoose.disconnect()
    console.log('Disconnected from test database')
  } catch (error) {
    console.error('Failed to disconnect from test database:', error)
    process.exit(1)
  }
})

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error // Keep error logs
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

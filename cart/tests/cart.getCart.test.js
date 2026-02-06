const request = require('supertest')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const app = require('../src/app')
const cartModel = require('../src/models/cart.model')

// Mock token for testing
const mockToken = jwt.sign(
  { userId: 'test-user-id', _id: 'test-user-id', role: 'user' },
  process.env.JWT_SECRET || 'test-secret'
)

const validProductId = new mongoose.Types.ObjectId().toString()
const anotherProductId = new mongoose.Types.ObjectId().toString()

describe('GET /api/cart - Fetch current cart', () => {
  beforeEach(async () => {
    // Clear cart collection before each test
    await cartModel.deleteMany({})
  })

  afterAll(async () => {
    // Cleanup after all tests
    await cartModel.deleteMany({})
  })

  describe('Successful operations', () => {
    test('should return empty cart when user has no cart', async () => {
      const res = await request(app)
        .get('/cart')
        .set('Cookie', `token=${mockToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('cart')
      expect(res.body).toHaveProperty('totals')
      expect(res.body.cart.items).toEqual([])
      expect(res.body.totals.itemCount).toBe(0)
      expect(res.body.totals.totalQuantity).toBe(0)
    })

    test('should return cart with items and correct totals', async () => {
      // Add items to cart first
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: validProductId, qty: 3 })

      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: anotherProductId, qty: 2 })

      // Fetch cart
      const res = await request(app)
        .get('/cart')
        .set('Cookie', `token=${mockToken}`)

      expect(res.status).toBe(200)
      expect(res.body.cart.items).toHaveLength(2)
      expect(res.body.totals.itemCount).toBe(2)
      expect(res.body.totals.totalQuantity).toBe(5)
    })

    test('should return correct totals with single item', async () => {
      // Add single item
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: validProductId, qty: 7 })

      // Fetch cart
      const res = await request(app)
        .get('/cart')
        .set('Cookie', `token=${mockToken}`)

      expect(res.status).toBe(200)
      expect(res.body.cart.items).toHaveLength(1)
      expect(res.body.cart.items[0].quantity).toBe(7)
      expect(res.body.totals.itemCount).toBe(1)
      expect(res.body.totals.totalQuantity).toBe(7)
    })

    test('should return correct totals after updating item quantity', async () => {
      // Add items
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: validProductId, qty: 5 })

      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: anotherProductId, qty: 3 })

      // Update first item
      await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 2 })

      // Fetch cart
      const res = await request(app)
        .get('/cart')
        .set('Cookie', `token=${mockToken}`)

      expect(res.status).toBe(200)
      expect(res.body.totals.itemCount).toBe(2)
      expect(res.body.totals.totalQuantity).toBe(5)
    })

    test('should return correct totals after removing item', async () => {
      // Add items
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: validProductId, qty: 4 })

      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: anotherProductId, qty: 3 })

      // Remove first item (set qty to 0)
      await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 0 })

      // Fetch cart
      const res = await request(app)
        .get('/cart')
        .set('Cookie', `token=${mockToken}`)

      expect(res.status).toBe(200)
      expect(res.body.cart.items).toHaveLength(1)
      expect(res.body.totals.itemCount).toBe(1)
      expect(res.body.totals.totalQuantity).toBe(3)
    })

    test('should return cart with product details', async () => {
      // Add item
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({ productId: validProductId, qty: 2 })

      // Fetch cart
      const res = await request(app)
        .get('/cart')
        .set('Cookie', `token=${mockToken}`)

      expect(res.status).toBe(200)
      expect(res.body.cart.items[0]).toHaveProperty('productId')
      expect(res.body.cart.items[0]).toHaveProperty('quantity')
      expect(res.body.cart.items[0].quantity).toBe(2)
    })
  })

  describe('Authentication errors', () => {
    test('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/cart')

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toContain('Unauthorized')
    })

    test('should return 401 when invalid token is provided', async () => {
      const res = await request(app)
        .get('/cart')
        .set('Cookie', 'token=invalid-token')

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toContain('Unauthorized')
    })
  })
})

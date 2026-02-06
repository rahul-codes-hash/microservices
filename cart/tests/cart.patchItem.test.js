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

describe('PATCH /api/cart/items/:productId', () => {
  beforeEach(async () => {
    // Clear cart collection before each test
    await cartModel.deleteMany({})
  })

  afterAll(async () => {
    // Cleanup after all tests
    await cartModel.deleteMany({})
  })

  describe('Successful operations', () => {
    test('should update item quantity successfully', async () => {
      // First, add an item to cart
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({
          productId: validProductId,
          qty: 5
        })

      // Update the quantity
      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 3 })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('message')
      expect(res.body).toHaveProperty('cart')
      expect(res.body.cart.items[0].quantity).toBe(3)
    })

    test('should remove item when quantity is set to 0', async () => {
      // Add an item to cart
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({
          productId: validProductId,
          qty: 5
        })

      // Update quantity to 0
      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 0 })

      expect(res.status).toBe(200)
      expect(res.body.cart.items).toHaveLength(0)
    })

    test('should update quantity of one item without affecting others', async () => {
      // Add two items to cart
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({
          productId: validProductId,
          qty: 5
        })

      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({
          productId: anotherProductId,
          qty: 3
        })

      // Update first item quantity
      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 2 })

      expect(res.status).toBe(200)
      expect(res.body.cart.items).toHaveLength(2)
      expect(res.body.cart.items[0].quantity).toBe(2)
      expect(res.body.cart.items[1].quantity).toBe(3)
    })
  })

  describe('Validation errors', () => {
    test('should return 400 when qty is missing', async () => {
      // Add an item first
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({
          productId: validProductId,
          qty: 5
        })

      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('errors')
    })

    test('should return 400 when qty is not a positive integer', async () => {
      await request(app)
        .post('/cart/items')
        .set('Cookie', `token=${mockToken}`)
        .send({
          productId: validProductId,
          qty: 5
        })

      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: -1 })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('errors')
    })

    test('should return 400 when productId in URL is invalid', async () => {
      const res = await request(app)
        .patch('/cart/items/invalid-id')
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 5 })

      expect(res.status).toBe(400)
    })
  })

  describe('Not found errors', () => {
    test('should handle updating non-existent item in cart', async () => {
      const nonExistentProductId = new mongoose.Types.ObjectId().toString()

      const res = await request(app)
        .patch(`/cart/items/${nonExistentProductId}`)
        .set('Cookie', `token=${mockToken}`)
        .send({ qty: 5 })

      expect(res.status).toBe(404)
    })
  })

  describe('Authentication errors', () => {
    test('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .send({ qty: 3 })

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toContain('Unauthorized')
    })

    test('should return 401 when invalid token is provided', async () => {
      const res = await request(app)
        .patch(`/cart/items/${validProductId}`)
        .set('Cookie', 'token=invalid-token')
        .send({ qty: 3 })

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toContain('Unauthorized')
    })
  })
})

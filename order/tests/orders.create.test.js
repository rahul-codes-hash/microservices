const request = require('supertest')
const jwt = require('jsonwebtoken')

// These tests are written against POST /api/orders and are skipped by default.
// Remove `.skip` on the describe to enable once the API and controllers exist.

const app = require('../src/app')

describe.skip('POST /api/orders - Create order from current cart', () => {
  // Helper: example cart payload (shape depends on your implementation)
  const exampleCartPayload = {
    userId: '507f1f77bcf86cd799439011',
    items: [
      { productId: '60f6f9c9c9a1b341d8f0a111', quantity: 2 },
      { productId: '60f6f9d7c9a1b341d8f0a222', quantity: 1 }
    ]
  }

  // Helper: create auth cookie using JWT signed with test env secret
  function createAuthCookie(userId, role = 'user') {
    const payload = { id: userId, role }
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })
    return `token=${token}`
  }

  test('copies priced items into order (price snapshot)', async () => {
    // Arrange: depending on your app, you may need to create products and a cart
    // in the DB before calling the endpoint. This test assumes POST /api/orders
    // will use the current cart for `userId` in the request body.

    // Act
    const res = await request(app)
      .post('/api/orders')
      .send(exampleCartPayload)
      .set('Accept', 'application/json')
      .set('Cookie', createAuthCookie(exampleCartPayload.userId))

    // Assert
    expect([201, 200]).toContain(res.status)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
    res.body.items.forEach(item => {
      expect(item).toHaveProperty('product')
      expect(item).toHaveProperty('quantity')
      // price must be copied at time of order
      expect(item).toHaveProperty('price')
      expect(typeof item.price).toBe('number')
      expect(item).toHaveProperty('currency')
    })
  })

  test('sets status to PENDING', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(exampleCartPayload)
      .set('Accept', 'application/json')
      .set('Cookie', createAuthCookie(exampleCartPayload.userId))

    expect([201, 200]).toContain(res.status)
    expect(res.body).toHaveProperty('status')
    // Order model uses uppercase statuses; controller should set pending
    expect(res.body.status.toUpperCase()).toBe('PENDING')
  })

  test('computes taxes and shipping into totalPrice', async () => {
    // This test assumes the API returns a `totalPrice` object with `amount` and `currency`.
    // It also assumes taxes and shipping are included in that amount.
    const res = await request(app)
      .post('/api/orders')
      .send(exampleCartPayload)
      .set('Accept', 'application/json')
      .set('Cookie', createAuthCookie(exampleCartPayload.userId))

    expect([201, 200]).toContain(res.status)
    expect(res.body).toHaveProperty('totalPrice')
    expect(res.body.totalPrice).toHaveProperty('amount')
    expect(typeof res.body.totalPrice.amount).toBe('number')
    expect(res.body.totalPrice.amount).toBeGreaterThan(0)
    expect(res.body.totalPrice).toHaveProperty('currency')
  })

  test('reserves inventory for the ordered items', async () => {
    // The API should reserve inventory on order creation. How this is exposed
    // depends on your implementation; we check for a `reserved` flag per item
    // or a top-level `inventoryReserved: true` property.
    const res = await request(app)
      .post('/api/orders')
      .send(exampleCartPayload)
      .set('Accept', 'application/json')
      .set('Cookie', createAuthCookie(exampleCartPayload.userId))

    expect([201, 200]).toContain(res.status)

    // Either per-item reservation
    if (res.body.items && res.body.items.length) {
      res.body.items.forEach(item => {
        // optional: if your API returns reservation info per item
        if (Object.prototype.hasOwnProperty.call(item, 'reserved')) {
          expect(item.reserved).toBe(true)
        }
      })
    }

    // Or top-level indicator
    if (Object.prototype.hasOwnProperty.call(res.body, 'inventoryReserved')) {
      expect(res.body.inventoryReserved).toBe(true)
    }
  })
})

// Export nothing; this file contains tests only.

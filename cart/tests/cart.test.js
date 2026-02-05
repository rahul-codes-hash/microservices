const request = require('supertest')
const app = require('../src/app')
const productService = require('../src/services/productService')
const cartStore = require('../src/cartStore')

beforeEach(() => {
  productService.resetProducts([
    { id: 'p1', price: 10, stock: 5 },
    { id: 'p2', price: 7.5, stock: 2 }
  ])
  cartStore.resetCart()
})

test('GET /cart returns empty cart initially', async () => {
  const res = await request(app).get('/cart')
  expect(res.status).toBe(200)
  expect(res.body.items).toEqual([])
  expect(res.body.total).toBe(0)
})

test('POST /cart/items adds item and returns recalculated totals', async () => {
  const res = await request(app)
    .post('/cart/items')
    .send({ productId: 'p1', qty: 2 })
  expect(res.status).toBe(200)
  expect(res.body.items).toHaveLength(1)
  expect(res.body.total).toBe(20)
})

test('POST /cart/items with insufficient stock fails', async () => {
  const res = await request(app)
    .post('/cart/items')
    .send({ productId: 'p2', qty: 10 })
  expect(res.status).toBe(400)
  expect(res.body.error).toBe('insufficient stock')
})

test('PATCH /cart/items/:productId updates qty and recalculates totals', async () => {
  await request(app).post('/cart/items').send({ productId: 'p1', qty: 2 })
  const res = await request(app).patch('/cart/items/p1').send({ qty: 1 })
  expect(res.status).toBe(200)
  expect(res.body.total).toBe(10)
})

test('PATCH with qty 0 removes item', async () => {
  await request(app).post('/cart/items').send({ productId: 'p1', qty: 2 })
  const res = await request(app).patch('/cart/items/p1').send({ qty: 0 })
  expect(res.status).toBe(200)
  expect(res.body.items).toHaveLength(0)
  expect(res.body.total).toBe(0)
})

test('DELETE /cart clears the cart', async () => {
  await request(app).post('/cart/items').send({ productId: 'p1', qty: 1 })
  const del = await request(app).delete('/cart')
  expect(del.status).toBe(204)
  const res = await request(app).get('/cart')
  expect(res.body.items).toHaveLength(0)
})

test('DELETE /cart/items/:productId removes a single line and recalculates totals', async () => {
  await request(app).post('/cart/items').send({ productId: 'p1', qty: 2 })
  await request(app).post('/cart/items').send({ productId: 'p2', qty: 1 })
  const del = await request(app).delete('/cart/items/p1')
  expect(del.status).toBe(200)
  expect(del.body.items).toHaveLength(1)
  expect(del.body.total).toBe(7.5)
})

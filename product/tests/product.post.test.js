
jest.mock('../src/middlewares/auth.middleware', () => {
  return {
    createAuthMiddleware: () => (req, res, next) => next(),
  };
});


const request = require('supertest');
const app = require('../src/app.js');

describe('POST /api/products/', () => {
  it('should create a product with valid data', async () => {
    const response = await request(app)
      .post('/api/products/')
      .send({
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        category: 'Electronics'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should return 400 for missing product name', async () => {
    const response = await request(app)
      .post('/api/products/')
      .send({
        description: 'A test product',
        price: 99.99,
        category: 'Electronics'
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 400 for invalid price', async () => {
    const response = await request(app)
      .post('/api/products/')
      .send({
        name: 'Test Product',
        description: 'A test product',
        price: -10,
        category: 'Electronics'
      });

    expect(response.status).toBe(400);
  });
});
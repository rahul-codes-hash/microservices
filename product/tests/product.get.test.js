const request = require('supertest');
const app = require('../src/app.js');
const productController = require('../src/controllers/product.controller.js');

jest.mock('../src/controllers/product.controller.js');
jest.mock('../src/middlewares/auth.middleware.js');
describe('GET /api/products/', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all products with status 200', async () => {
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 99.99 },
      { id: 2, name: 'Product 2', price: 149.99 }
    ];

    productController.getProducts.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: mockProducts });
    });

    const response = await request(app)
      .get('/api/products/');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toHaveProperty('name');
  });

  it('should return empty array when no products exist', async () => {
    productController.getProducts.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: [] });
    });

    const response = await request(app)
      .get('/api/products/');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('should handle server errors gracefully', async () => {
    productController.getProducts.mockImplementation((req, res) => {
      res.status(500).json({ success: false, message: 'Server error' });
    });

    const response = await request(app)
      .get('/api/products/');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/products/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a single product with status 200', async () => {
    const mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product 1',
      description: 'A great product',
      price: { amount: 99.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(200).json({ product: mockProduct });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.product).toBeDefined();
    expect(response.body.product._id).toBe('507f1f77bcf86cd799439011');
    expect(response.body.product.title).toBe('Product 1');
    expect(response.body.product).toHaveProperty('price');
    expect(response.body.product).toHaveProperty('seller');
  });

  it('should return 404 when product does not exist', async () => {
    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(404).json({ message: 'Product not found' });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439099');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Product not found');
  });

  it('should handle invalid MongoDB ID format', async () => {
    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(500).json({ message: 'Internal server error' });
    });

    const response = await request(app)
      .get('/api/products/invalid-id');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });

  it('should return product with all required fields', async () => {
    const mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'iPhone 15 Pro',
      description: 'Latest Apple smartphone',
      price: { amount: 119999, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['iphone15.jpg', 'iphone15-back.jpg'],
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-20')
    };

    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(200).json({ product: mockProduct });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({
      _id: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      price: expect.objectContaining({
        amount: expect.any(Number),
        currency: expect.any(String)
      }),
      seller: expect.any(String),
      images: expect.any(Array)
    });
  });

  it('should handle server errors gracefully', async () => {
    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(500).json({ message: 'Internal server error' });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });

  it('should return product with multiple images', async () => {
    const mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product with Multiple Images',
      description: 'Product description',
      price: { amount: 299.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg']
    };

    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(200).json({ product: mockProduct });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.product.images).toHaveLength(4);
    expect(response.body.product.images).toContain('image1.jpg');
  });

  it('should return product with no description', async () => {
    const mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Simple Product',
      price: { amount: 49.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['product.jpg']
    };

    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(200).json({ product: mockProduct });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.product.title).toBe('Simple Product');
    expect(response.body.product.description).toBeUndefined();
  });

  it('should return 400 for invalid product id', async () => {
    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(400).json({ message: 'Invalid product ID format' });
    });

    const response = await request(app)
      .get('/api/products/invalid@#$');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid product ID format');
  });

  it('should return product when found', async () => {
    const mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Laptop',
      description: 'High performance laptop',
      price: { amount: 89999, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['laptop.jpg']
    };

    productController.getProductbyId.mockImplementation((req, res) => {
      res.status(200).json({ product: mockProduct });
    });

    const response = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.product).toBeDefined();
    expect(response.body.product.title).toBe('Laptop');
    expect(response.body.product.price.amount).toBe(89999);
  });
});
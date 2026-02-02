const request = require('supertest');
const app = require('../src/app.js');
const productController = require('../src/controllers/product.controller.js');

jest.mock('../src/controllers/product.controller.js');
jest.mock('../src/middlewares/auth.middleware.js');

describe('PATCH /api/products/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update product title successfully with status 200', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Updated Product Title',
      description: 'A great product',
      price: { amount: 99.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ title: 'Updated Product Title' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Product updated successfully');
    expect(response.body.product.title).toBe('Updated Product Title');
  });

  it('should update product description successfully', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product 1',
      description: 'Updated description text',
      price: { amount: 99.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ description: 'Updated description text' });

    expect(response.status).toBe(200);
    expect(response.body.product.description).toBe('Updated description text');
  });

  it('should update product price successfully', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product 1',
      description: 'A great product',
      price: { amount: 149.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ price: { amount: 149.99, currency: 'INR' } });

    expect(response.status).toBe(200);
    expect(response.body.product.price.amount).toBe(149.99);
  });

  it('should update multiple fields at once', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'New Title',
      description: 'New description',
      price: { amount: 199.99, currency: 'USD' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ 
        title: 'New Title',
        description: 'New description',
        price: { amount: 199.99, currency: 'USD' }
      });

    expect(response.status).toBe(200);
    expect(response.body.product.title).toBe('New Title');
    expect(response.body.product.description).toBe('New description');
    expect(response.body.product.price.amount).toBe(199.99);
  });

  it('should return 400 for invalid product ID', async () => {
    productController.updateProduct.mockImplementation((req, res) => {
      res.status(400).json({ message: 'Invalid product ID' });
    });

    const response = await request(app)
      .patch('/api/products/invalid-id')
      .send({ title: 'New Title' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid product ID');
  });

  it('should return 404 when product not found', async () => {
    productController.updateProduct.mockImplementation((req, res) => {
      res.status(404).json({ 
        message: 'Product not found or you are not authorized to update this product' 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439099')
      .send({ title: 'New Title' });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Product not found');
  });

  it('should return 403 when user is not authorized', async () => {
    productController.updateProduct.mockImplementation((req, res) => {
      res.status(403).json({ 
        message: 'You are not authorized to update this product' 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ title: 'New Title' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('not authorized');
  });

  it('should ignore fields that are not allowed to be updated', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product 1',
      description: 'A great product',
      price: { amount: 99.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ 
        title: 'Product 1',
        seller: 'different-seller-id',
        images: ['different-image.jpg']
      });

    expect(response.status).toBe(200);
    expect(response.body.product.seller).toBe('507f1f77bcf86cd799439012');
  });

  it('should update only price amount', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product 1',
      description: 'A great product',
      price: { amount: 129.99, currency: 'INR' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ price: { amount: 129.99 } });

    expect(response.status).toBe(200);
    expect(response.body.product.price.amount).toBe(129.99);
    expect(response.body.product.price.currency).toBe('INR');
  });

  it('should update only price currency', async () => {
    const updatedProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Product 1',
      description: 'A great product',
      price: { amount: 99.99, currency: 'USD' },
      seller: '507f1f77bcf86cd799439012',
      images: ['image1.jpg']
    };

    productController.updateProduct.mockImplementation((req, res) => {
      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: updatedProduct 
      });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ price: { currency: 'USD' } });

    expect(response.status).toBe(200);
    expect(response.body.product.price.currency).toBe('USD');
  });

  it('should handle server errors gracefully', async () => {
    productController.updateProduct.mockImplementation((req, res) => {
      res.status(500).json({ message: 'Internal server error' });
    });

    const response = await request(app)
      .patch('/api/products/507f1f77bcf86cd799439011')
      .send({ title: 'New Title' });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});

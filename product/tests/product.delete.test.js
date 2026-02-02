const request = require('supertest');
const app = require('../src/app.js');
const productController = require('../src/controllers/product.controller.js');

jest.mock('../src/controllers/product.controller.js');
jest.mock('../src/middlewares/auth.middleware.js');

describe('DELETE /api/products/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a product successfully and return 200', async () => {
    productController.deleteProduct.mockImplementation((req, res) => {
      res.status(200).json({ message: 'Product deleted successfully' });
    });

    const response = await request(app)
      .delete('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Product deleted successfully');
  });

  it('should return 404 when product is not found', async () => {
    productController.deleteProduct.mockImplementation((req, res) => {
      res.status(404).json({ message: 'Product not found' });
    });

    const response = await request(app)
      .delete('/api/products/507f1f77bcf86cd799439099');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Product not found');
  });

  it('should return 400 for invalid product id', async () => {
    productController.deleteProduct.mockImplementation((req, res) => {
      res.status(400).json({ message: 'Invalid product ID' });
    });

    const response = await request(app)
      .delete('/api/products/invalid-id');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid product ID');
  });

  it('should return 403 when user is not authorized to delete', async () => {
    productController.deleteProduct.mockImplementation((req, res) => {
      res.status(403).json({ message: 'You are not authorized to delete this product' });
    });

    const response = await request(app)
      .delete('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('not authorized');
  });

  it('should handle server errors gracefully', async () => {
    productController.deleteProduct.mockImplementation((req, res) => {
      res.status(500).json({ message: 'Internal server error' });
    });

    const response = await request(app)
      .delete('/api/products/507f1f77bcf86cd799439011');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});

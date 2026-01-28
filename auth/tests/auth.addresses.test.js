const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('Address APIs', () => {
  let testUser;
  let validToken;
  const testPassword = 'TestP@ss123';
  const testEmail = 'address@example.com';

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = await User.create({
      username: 'testuser',
      email: testEmail,
      password: hashedPassword,
      fullName: { firstName: 'Test', lastName: 'User' },
      addresses: [
        {
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          phone: '9876543210',
          isDefault: true
        }
      ]
    });

    validToken = jwt.sign(
      { id: testUser._id, username: testUser.username, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  // ============ GET /api/auth/users/me/addresses ============
  describe('GET /api/auth/users/me/addresses', () => {
    it('should return 200 and list all addresses with default marked', async () => {
      const res = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.addresses)).toBe(true);
      expect(res.body.addresses[0].isDefault).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/auth/users/me/addresses');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============ POST /api/auth/users/me/addresses ============
  describe('POST /api/auth/users/me/addresses', () => {
    it('should return 201 and add address with valid data', async () => {
      const newAddress = {
        street: '456 Oak Ave',
        city: 'New City',
        state: 'NS',
        zipCode: '54321',
        phone: '9123456789'
      };

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidAddress);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid zipCode (not 5-6 digits)', async () => {
      const invalidAddress = {
        street: '456 Oak Ave',
        city: 'New City',
        state: 'NS',
        zipCode: '123',
        phone: '9876543210'
      };

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidAddress);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const newAddress = {
        street: '456 Oak Ave',
        city: 'New City',
        state: 'NS',
        zipCode: '54321',
        phone: '9876543210'
      };

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .send(newAddress);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============ DELETE /api/auth/users/me/addresses/:addressId ============
  describe('DELETE /api/auth/users/me/addresses/:addressId', () => {
    it('should return 200 and delete address with valid ID', async () => {
      const addressId = testUser.addresses[0]._id;

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for non-existent address ID', async () => {
      const fakeAddressId = '507f1f77bcf86cd799439999';

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const addressId = testUser.addresses[0]._id;

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`);

      expect(res.statusCode).toBe(401);
    });

    it('should verify address is actually deleted from database', async () => {
      const addressId = testUser.addresses[0]._id;

      const deleteRes = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(deleteRes.statusCode).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      const deletedAddress = updatedUser.addresses.find(a => a._id.toString() === addressId.toString());
      expect(deletedAddress).toBeUndefined();
    });
  });
});
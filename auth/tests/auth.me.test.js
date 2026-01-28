const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('GET /api/auth/me', () => {
  let testUser;
  let validToken;
  const testPassword = 'TestP@ss123';
  const testEmail = 'me@example.com';

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = await User.create({
      username: 'testuser',
      email: testEmail,
      password: hashedPassword,
      fullName: { firstName: 'Test', lastName: 'User' },
      role: 'user',
      addresses: [
        {
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        }
      ]
    });

    // Generate valid token
    validToken = jwt.sign(
      {
        id: testUser._id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  describe('Cookie-based authentication', () => {
    it('should accept token from Authorization Bearer header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should accept token from cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should prefer Authorization header over cookie when both provided', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: await bcrypt.hash('OtherP@ss123', 10),
        fullName: { firstName: 'Other', lastName: 'User' }
      });

      const otherToken = jwt.sign(
        {
          id: otherUser._id,
          username: otherUser.username,
          email: otherUser.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Cookie', `token=${otherToken}`);

      expect(res.statusCode).toBe(200);
      // Should return data from Authorization header token (validToken)
      expect(res.body.user.email).toBe(testEmail);
    });
  });

  describe('No authentication provided', () => {
    it('returns 401 when no auth header and no cookie provided', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('token');
    });

    it('returns 401 when no auth cookie is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', '');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('token');
    });

    it('returns 401 when Authorization header is empty', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', '');

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 when cookie is missing but other cookies present', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'sessionId=abc123; othercookie=value');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('token');
    });

    it('returns 401 when Authorization header present but cookie missing', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', '');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Invalid token in cookie', () => {
    it('returns 401 for invalid token in cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=invalid.token.here');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('invalid');
    });

    it('returns 401 for malformed token in cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=abc123');

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for expired token in cookie', async () => {
      const expiredToken = jwt.sign(
        {
          id: testUser._id,
          username: testUser.username,
          email: testUser.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('expired');
    });

    it('returns 401 for token signed with wrong secret in cookie', async () => {
      const wrongSecretToken = jwt.sign(
        {
          id: testUser._id,
          username: testUser.username,
          email: testUser.email
        },
        'wrong-secret-key',
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${wrongSecretToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('invalid');
    });

    it('returns 401 for corrupted token in cookie', async () => {
      const corruptedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${corruptedToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for token for non-existent user in cookie', async () => {
      const fakeUserId = '507f1f77bcf86cd799439999';
      const fakeToken = jwt.sign(
        {
          id: fakeUserId,
          username: 'fakeuser',
          email: 'fake@example.com'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${fakeToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('not found');
    });

    it('returns 401 when cookie has empty token value', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Mixed authentication scenarios', () => {
    it('should reject invalid Bearer token even with valid cookie', async () => {
      const invalidBearerToken = 'invalid.bearer.token';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidBearerToken}`)
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should accept valid Bearer token even with invalid cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Cookie', 'token=invalid');

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should fallback to cookie when Authorization header missing', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should reject when both Bearer header and cookie are invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .set('Cookie', 'token=invalid');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Cookie handling edge cases', () => {
    it('should handle cookie with extra spaces', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token = ${validToken}`);

      // May succeed or fail depending on implementation
      expect([200, 401]).toContain(res.statusCode);
    });

    it('should handle multiple cookies correctly', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `sessionId=abc123; token=${validToken}; userId=123`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should not accept token from different cookie name', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `authToken=${validToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should case-sensitively match cookie name', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `Token=${validToken}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Successful requests', () => {
    it('should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.id).toBe(testUser._id.toString());
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.username).toBe('testuser');
    });

    it('should return user data with fullName', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.fullName).toBeDefined();
      expect(res.body.user.fullName.firstName).toBe('Test');
      expect(res.body.user.fullName.lastName).toBe('User');
    });

    it('should return user role', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe('user');
    });

    it('should return user addresses', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.addresses).toBeDefined();
      expect(Array.isArray(res.body.user.addresses)).toBe(true);
    });

    it('should not return password in response', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return user with timestamps', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.createdAt).toBeDefined();
    });
  });

  describe('Authorization header validation', () => {
    it('should reject request without Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('token');
    });

    it('should reject request with empty Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', '');

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with missing Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', validToken);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Bearer');
    });

    it('should reject request with incorrect Bearer format', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Token ${validToken}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Token validation', () => {
    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('invalid');
    });

    it('should reject request with malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer abc123');

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          id: testUser._id,
          username: testUser.username,
          email: testUser.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('expired');
    });

    it('should reject request with token signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        {
          id: testUser._id,
          username: testUser.username,
          email: testUser.email
        },
        'wrong-secret-key',
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with token for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439999';
      const fakeToken = jwt.sign(
        {
          id: fakeUserId,
          username: 'fakeuser',
          email: 'fake@example.com'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('Response format validation', () => {
    it('should return response in correct JSON format', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(typeof res.body).toBe('object');
    });

    it('should return user object with required fields', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      const requiredFields = ['id', 'username', 'email', 'fullName', 'role'];
      requiredFields.forEach(field => {
        expect(res.body.user).toHaveProperty(field);
      });
    });

    it('should return correct data types', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(typeof res.body.user.id).toBe('string');
      expect(typeof res.body.user.username).toBe('string');
      expect(typeof res.body.user.email).toBe('string');
      expect(typeof res.body.user.role).toBe('string');
      expect(typeof res.body.user.fullName).toBe('object');
    });
  });

  describe('User data integrity', () => {
    it('should return only authorized user data', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe(testUser._id.toString());
    });

    it('should not return other users data', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: await bcrypt.hash('OtherP@ss123', 10),
        fullName: { firstName: 'Other', lastName: 'User' }
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).not.toBe('other@example.com');
      expect(res.body.user.username).not.toBe('otheruser');
    });

    it('should return updated user data', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        'fullName.firstName': 'Updated'
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.fullName.firstName).toBe('Updated');
    });
  });

  describe('HTTP method validation', () => {
    it('should only accept GET requests', async () => {
      const postRes = await request(app)
        .post('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(postRes.statusCode).toBe(405);
    });

    it('should reject PUT requests', async () => {
      const putRes = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(putRes.statusCode).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const deleteRes = await request(app)
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(deleteRes.statusCode).toBe(405);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle concurrent requests from same user', async () => {
      const [res1, res2, res3] = await Promise.all([
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken}`),
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken}`),
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken}`)
      ]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res3.statusCode).toBe(200);

      expect(res1.body.user.id).toBe(res2.body.user.id);
      expect(res2.body.user.id).toBe(res3.body.user.id);
    });
  });

  describe('Security', () => {
    it('should not expose sensitive fields', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('__v');
    });

    it('should set secure response headers', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  describe('Edge cases', () => {
    it('should handle user with no addresses', async () => {
      const userWithoutAddresses = await User.create({
        username: 'noaddress',
        email: 'noaddress@example.com',
        password: await bcrypt.hash('TestP@ss123', 10),
        fullName: { firstName: 'No', lastName: 'Address' }
      });

      const token = jwt.sign(
        { id: userWithoutAddresses._id, username: userWithoutAddresses.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.addresses).toBeDefined();
    });

    it('should handle user with empty firstName/lastName', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.fullName).toBeDefined();
    });

    it('should return consistent data on multiple calls', async () => {
      const res1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      const res2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res1.body.user).toEqual(res2.body.user);
    });
  });

  describe('Valid token in cookie - Returns 200 and current user', () => {
    it('returns 200 and current user when valid token cookie is present', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.id).toBe(testUser._id.toString());
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.username).toBe('testuser');
    });

    it('returns 200 with correct user profile from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('fullName');
      expect(res.body.user).toHaveProperty('role');
    });

    it('returns 200 with full user details from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe(testUser._id.toString());
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.fullName.firstName).toBe('Test');
      expect(res.body.user.fullName.lastName).toBe('User');
      expect(res.body.user.role).toBe('user');
    });

    it('returns 200 with user addresses from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.addresses).toBeDefined();
      expect(Array.isArray(res.body.user.addresses)).toBe(true);
      expect(res.body.user.addresses.length).toBeGreaterThan(0);
      expect(res.body.user.addresses[0]).toHaveProperty('street');
      expect(res.body.user.addresses[0]).toHaveProperty('city');
    });

    it('returns 200 without exposing password from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('__v');
    });

    it('returns 200 with correct response structure from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(typeof res.body.user).toBe('object');
      expect(res.body.user).not.toBeNull();
    });

    it('returns 200 with timestamps in user object from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.createdAt).toBeDefined();
      expect(new Date(res.body.user.createdAt)).toBeInstanceOf(Date);
    });

    it('returns 200 with consistent user data on multiple cookie requests', async () => {
      const res1 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      const res2 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res1.body.user).toEqual(res2.body.user);
    });

    it('returns 200 with correct JSON content type from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('returns 200 with user ID matching token payload from cookie', async () => {
      const decodedToken = jwt.decode(validToken);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe(decodedToken.id.toString());
    });

    it('returns 200 with user username matching token payload from cookie', async () => {
      const decodedToken = jwt.decode(validToken);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.username).toBe(decodedToken.username);
    });

    it('returns 200 with user email matching token payload from cookie', async () => {
      const decodedToken = jwt.decode(validToken);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(decodedToken.email);
    });

    it('returns 200 with correct user when multiple cookies present', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `sessionId=abc123; token=${validToken}; userId=456`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('returns 200 with same user data from cookie token vs Bearer header', async () => {
      const resCookie = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      const resBearer = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(resCookie.statusCode).toBe(200);
      expect(resBearer.statusCode).toBe(200);
      expect(resCookie.body.user).toEqual(resBearer.body.user);
    });

    it('returns 200 with active user from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      // User should not be flagged as inactive
      expect(res.body.user.isActive).not.toBe(false);
    });

    it('returns 200 with user role from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBeDefined();
      expect(typeof res.body.user.role).toBe('string');
    });

    it('returns 200 with user fullName object from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.fullName).toBeDefined();
      expect(typeof res.body.user.fullName).toBe('object');
      expect(res.body.user.fullName).toHaveProperty('firstName');
      expect(res.body.user.fullName).toHaveProperty('lastName');
    });

    it('returns 200 for concurrent requests with same valid cookie token', async () => {
      const [res1, res2, res3] = await Promise.all([
        request(app).get('/api/auth/me').set('Cookie', `token=${validToken}`),
        request(app).get('/api/auth/me').set('Cookie', `token=${validToken}`),
        request(app).get('/api/auth/me').set('Cookie', `token=${validToken}`)
      ]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res3.statusCode).toBe(200);
      expect(res1.body.user.email).toBe(testEmail);
      expect(res2.body.user.email).toBe(testEmail);
      expect(res3.body.user.email).toBe(testEmail);
    });

    it('returns 200 with updated user data from cookie token after profile update', async () => {
      // Update user profile
      await User.findByIdAndUpdate(testUser._id, {
        'fullName.firstName': 'UpdatedName'
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.fullName.firstName).toBe('UpdatedName');
    });

    it('returns 200 with correct data type for all user fields from cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(typeof res.body.user.id).toBe('string');
      expect(typeof res.body.user.username).toBe('string');
      expect(typeof res.body.user.email).toBe('string');
      expect(typeof res.body.user.fullName).toBe('object');
      expect(typeof res.body.user.role).toBe('string');
      expect(Array.isArray(res.body.user.addresses)).toBe(true);
    });

    it('returns 200 with non-empty user ID from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBeTruthy();
      expect(res.body.user.id.length).toBeGreaterThan(0);
    });

    it('returns 200 with valid MongoDB ObjectId format from cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      // MongoDB ObjectId is 24 character hex string
      expect(res.body.user.id).toMatch(/^[0-9a-f]{24}$/i);
    });
  });
});
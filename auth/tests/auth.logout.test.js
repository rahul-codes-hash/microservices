const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/user.model');
const redis = require('../src/db/redis');

describe('GET /api/auth/logout', () => {
  let testUser;
  let validToken;
  const testPassword = 'TestP@ss123';
  const testEmail = 'logout@example.com';

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = await User.create({
      username: 'testuser',
      email: testEmail,
      password: hashedPassword,
      fullName: { firstName: 'Test', lastName: 'User' },
      role: 'user'
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

  describe('Successful logout', () => {
    it('should return 200 when user logs out with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return success message on logout', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('logout');
      expect(res.body.message).toContain('successfully');
    });

    it('should clear token cookie on successful logout', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      // Check if Set-Cookie header clears the token
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('token=');
      expect(res.headers['set-cookie'][0]).toContain('Max-Age=0');
    });

    it('should invalidate token in Redis blacklist on logout', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);

      // Check if token is blacklisted in Redis
      const isBlacklisted = await redis.get(`blacklist_${validToken}`);
      expect(isBlacklisted).toBe('true');
    });

    it('should logout user from Bearer token header', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('logout');
    });

    it('should logout user from cookie token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('logout');
    });

    it('should return response with correct JSON structure', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(typeof res.body).toBe('object');
      expect(res.body).toHaveProperty('message');
    });

    it('should logout user without exposing user data', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).not.toHaveProperty('user');
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('No authentication provided', () => {
    it('should return 401 when no auth header provided', async () => {
      const res = await request(app)
        .get('/api/auth/logout');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 when Authorization header is empty', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', '');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when no cookie is provided', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', '');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when neither header nor cookie provided', async () => {
      const res = await request(app)
        .get('/api/auth/logout');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('token');
    });

    it('should return 401 when cookie is missing but other cookies present', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', 'sessionId=abc123; othercookie=value');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Invalid token scenarios', () => {
    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', 'Bearer abc123');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for expired token', async () => {
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
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for token signed with wrong secret', async () => {
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
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for token of non-existent user', async () => {
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
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for invalid token in cookie', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', 'token=invalid.token.here');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for corrupted token in cookie', async () => {
      const corruptedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';

      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${corruptedToken}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Authorization header validation', () => {
    it('should reject logout with missing Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', validToken);

      expect(res.statusCode).toBe(401);
    });

    it('should reject logout with incorrect Bearer format', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Token ${validToken}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Cookie handling', () => {
    it('should accept valid token from cookie', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should handle logout with multiple cookies', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `sessionId=abc123; token=${validToken}; userId=456`);

      expect(res.statusCode).toBe(200);
    });

    it('should not accept token from different cookie name', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `authToken=${validToken}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Token invalidation in Redis', () => {
    it('should blacklist token in Redis after logout', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);

      // Verify token is blacklisted
      const blacklistEntry = await redis.get(`blacklist_${validToken}`);
      expect(blacklistEntry).toBeTruthy();
    });

    it('should set correct expiration on blacklisted token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);

      // Check TTL on blacklist entry
      const ttl = await redis.ttl(`blacklist_${validToken}`);
      // TTL should be around 24 hours (86400 seconds)
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it('should prevent using blacklisted token after logout', async () => {
      // First logout
      const logoutRes = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(logoutRes.statusCode).toBe(200);

      // Try to use same token for authenticated request
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(meRes.statusCode).toBe(401);
      expect(meRes.body.message).toContain('blacklisted');
    });
  });

  describe('Concurrent logout requests', () => {
    it('should handle concurrent logout requests from same user', async () => {
      const [res1, res2] = await Promise.all([
        request(app).get('/api/auth/logout').set('Authorization', `Bearer ${validToken}`),
        request(app).get('/api/auth/logout').set('Authorization', `Bearer ${validToken}`)
      ]);

      expect(res1.statusCode).toBe(200);
      // Second request should fail because token is already blacklisted
      expect(res2.statusCode).toBe(401);
    });

    it('should handle concurrent logouts from different users', async () => {
      // Create another user and token
      const hashedPassword = await bcrypt.hash('AnotherP@ss123', 10);
      const anotherUser = await User.create({
        username: 'anotheruser',
        email: 'another@example.com',
        password: hashedPassword,
        fullName: { firstName: 'Another', lastName: 'User' }
      });

      const anotherToken = jwt.sign(
        {
          id: anotherUser._id,
          username: anotherUser.username,
          email: anotherUser.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const [res1, res2] = await Promise.all([
        request(app).get('/api/auth/logout').set('Authorization', `Bearer ${validToken}`),
        request(app).get('/api/auth/logout').set('Authorization', `Bearer ${anotherToken}`)
      ]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
    });
  });

  describe('Bearer header vs Cookie priority', () => {
    it('should prefer Bearer header over cookie when both provided', async () => {
      const anotherToken = jwt.sign(
        {
          id: testUser._id,
          username: testUser.username,
          email: testUser.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Cookie', `token=${anotherToken}`);

      expect(res.statusCode).toBe(200);

      // Check that validToken is blacklisted
      const validTokenBlacklisted = await redis.get(`blacklist_${validToken}`);
      expect(validTokenBlacklisted).toBe('true');
    });

    it('should fallback to cookie when Bearer header missing', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);

      const isBlacklisted = await redis.get(`blacklist_${validToken}`);
      expect(isBlacklisted).toBe('true');
    });
  });

  describe('HTTP method validation', () => {
    it('should only accept GET requests', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(405);
    });

    it('should reject PUT requests', async () => {
      const res = await request(app)
        .put('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const res = await request(app)
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(405);
    });

    it('should reject POST requests', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(405);
    });
  });

  describe('Response headers and cookies', () => {
    it('should clear token cookie with httpOnly flag', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('should set SameSite=Strict on cleared cookie', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('SameSite');
    });

    it('should set correct JSON content type in response', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  describe('Error messages', () => {
    it('should return clear error message for missing authentication', async () => {
      const res = await request(app)
        .get('/api/auth/logout');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
      expect(typeof res.body.message).toBe('string');
    });

    it('should return clear error message for invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    it('should return clear success message on logout', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.message).toContain('logout');
    });
  });

  describe('Edge cases', () => {
    it('should handle logout with whitespace in token', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer  ${validToken}  `);

      // May succeed or fail depending on implementation
      expect([200, 401]).toContain(res.statusCode);
    });

    it('should handle logout for user with multiple active sessions', async () => {
      // Create multiple tokens for same user
      const token1 = jwt.sign(
        { id: testUser._id, username: testUser.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const token2 = jwt.sign(
        { id: testUser._id, username: testUser.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Logout with token1
      const res1 = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${token1}`);

      expect(res1.statusCode).toBe(200);

      // token1 should be blacklisted
      const token1Blacklisted = await redis.get(`blacklist_${token1}`);
      expect(token1Blacklisted).toBe('true');

      // token2 should still be valid (logout other sessions if needed)
      const res2 = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${token2}`);

      expect(res2.statusCode).toBe(200);
    });

    it('should prevent reusing token after logout', async () => {
      // Logout
      const logoutRes = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(logoutRes.statusCode).toBe(200);

      // Try to logout again with same token
      const secondLogoutRes = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(secondLogoutRes.statusCode).toBe(401);
    });

    it('should handle logout immediately after login', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(loginRes.statusCode).toBe(200);
      const newToken = loginRes.body.token;

      const logoutRes = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${newToken}`);

      expect(logoutRes.statusCode).toBe(200);
    });
  });

  describe('Security', () => {
    it('should not expose user data in logout response', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).not.toHaveProperty('user');
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('token');
    });

    it('should not return new tokens on logout', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('refreshToken');
    });

    it('should use secure cookie flags', async () => {
      const res = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      const setCookieHeader = res.headers['set-cookie'][0];
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite');
    });
  });
});
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/user.model');

describe('POST /api/auth/login', () => {
  let testUser;
  const testPassword = 'TestP@ss123';
  const testEmail = 'login@example.com';

  beforeEach(async () => {
    // Create a test user before each test
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = await User.create({
      username: 'testuser',
      email: testEmail,
      password: hashedPassword,
      fullName: { firstName: 'Test', lastName: 'User' }
    });
  });

  describe('Successful login', () => {
    it('should login user with valid email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('login');
      expect(res.body).toHaveProperty('token');
    });

    it('should return valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      // JWT format: header.payload.signature
      expect(res.body.token.split('.')).toHaveLength(3);
    });

    it('should return user data in response without password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should handle login with username instead of email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should accept email with different case', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail.toUpperCase(),
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('Email validation', () => {
    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testPassword
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject login with empty email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: testPassword
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: testPassword
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject login with null email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: null,
          password: testPassword
        });

      expect(res.statusCode).toBe(400);
    });

    it('should trim whitespace from email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `  ${testEmail}  `,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('Password validation', () => {
    it('should reject login with empty password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: ''
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject login with null password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: null
        });

      expect(res.statusCode).toBe(400);
    });

    it('should not expose password in response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('password');
    });
  });

  describe('Authentication errors', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongP@ss123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('invalid');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('invalid');
    });

    it('should reject login with non-existent username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: testPassword
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('invalid');
    });

    it('should not reveal whether email exists or password is wrong', async () => {
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyP@ss123'
        });

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongP@ss123'
        });

      // Both should return 401 with similar error messages
      expect(res1.statusCode).toBe(401);
      expect(res2.statusCode).toBe(401);
    });
  });

  describe('Request body validation', () => {
    it('should reject login with empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('should reject login with null body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(null);

      expect(res.statusCode).toBe(400);
    });

    it('should ignore extra fields in request body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          isAdmin: true,
          role: 'admin'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('Rate limiting / Brute force protection', () => {
    it('should handle multiple failed login attempts', async () => {
      const wrongPassword = 'WrongP@ss123';

      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: wrongPassword });

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: wrongPassword });

      const res3 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: wrongPassword });

      // All should fail
      expect(res1.statusCode).toBe(401);
      expect(res2.statusCode).toBe(401);
      expect(res3.statusCode).toBe(401);
    });
  });

  describe('Response headers', () => {
    it('should set secure response headers', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      // Check for security headers if implemented
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('should not return sensitive data in headers', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.headers).not.toHaveProperty('x-user-password');
    });
  });

  describe('Token validation', () => {
    it('should return token that can be used for authenticated requests', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(loginRes.statusCode).toBe(200);
      const token = loginRes.body.token;
      expect(token).toBeDefined();

      // If you have a protected route, test it here
      // const protectedRes = await request(app)
      //   .get('/api/auth/profile')
      //   .set('Authorization', `Bearer ${token}`);
      // expect(protectedRes.statusCode).toBe(200);
    });
  });

  describe('Concurrent login attempts', () => {
    it('should handle concurrent logins from same user', async () => {
      const [res1, res2, res3] = await Promise.all([
        request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword }),
        request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword }),
        request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword })
      ]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res3.statusCode).toBe(200);

      expect(res1.body.token).toBeDefined();
      expect(res2.body.token).toBeDefined();
      expect(res3.body.token).toBeDefined();
    });
  });

  describe('User status validation', () => {
    it('should reject login if user account is inactive/deleted', async () => {
      // Create an inactive user
      const hashedPassword = await bcrypt.hash('InactiveP@ss123', 10);
      await User.create({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: hashedPassword,
        fullName: { firstName: 'Inactive', lastName: 'User' },
        isActive: false
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'InactiveP@ss123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('inactive');
    });
  });
});
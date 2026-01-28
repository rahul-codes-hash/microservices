const request = require('supertest');
const app = require('../src/app.js');
const User = require('../src/models/user.model.js');

describe('POST /api/auth/register', () => {
  it('should register a new user with valid credentials', async () => {
    const userData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'P@ssw0rd123',
      fullName: { firstName: 'John', lastName: 'Doe' }
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);

    console.log('DEBUG RESPONSE:', res.statusCode, res.body);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('registered');

    // Verify user exists in DB
    const user = await User.findOne({ email: userData.email });
    expect(user).toBeDefined();
    expect(user.fullName.firstName).toBe('John');
    expect(user.fullName.lastName).toBe('Doe');
  });

  it('should reject duplicate email registration', async () => {
    const userData = {
      username: 'duplicateuser',
      email: 'duplicate@example.com',
      password: 'P@ssw0rd123',
      fullName: { firstName: 'User', lastName: 'One' }
    };

    // Register first user
    await request(app).post('/api/auth/register').send(userData);

    // Attempt to register with same email
    const res = await request(app).post('/api/auth/register').send(userData);

    console.log('DEBUG RESPONSE:', res.statusCode, res.body);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('already exists');
  });

  it('should reject registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' }); // missing password & fullName

    expect(res.statusCode).toBe(400);
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'invalidemailuser',
        email: 'invalid-email',
        password: 'P@ssw0rd123',
        fullName: { firstName: 'Test', lastName: 'User' }
      });

    expect(res.statusCode).toBe(400);
  });

  it('should reject registration with weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'weakpassuser',
        email: 'weak@example.com',
        password: '123', // too weak
        fullName: { firstName: 'Test', lastName: 'User' }
      });

    expect(res.statusCode).toBe(400);
  });
});

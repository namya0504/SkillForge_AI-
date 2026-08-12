import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Auth Endpoints', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'Password123'
  };
  let cookies = [];

  beforeAll(async () => {
    // Ensure test user does not exist
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);
    
    expect(res.body.message).toBe('Registration successful');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
    cookies = res.headers['set-cookie'];
  });

  it('should fail registration if email is duplicate', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(409);
    
    expect(res.body.error).toBeDefined();
  });

  it('should login the user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(testUser)
      .expect(200);
    
    expect(res.body.message).toBe('Login successful');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
    cookies = res.headers['set-cookie']; // Update cookies for the next tests
  });

  it('should get current user info with valid cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);
    
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should fail to get user info without cookie', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('should logout the user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(200);
    
    expect(res.body.message).toBe('Logged out successfully');
  });
});

import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Career Mentor Chat & Certification Endpoints', () => {
  const testUser = {
    email: `chat_test_${Date.now()}@example.com`,
    password: 'Password123'
  };
  let cookies = [];
  let sessionId = '';

  beforeAll(async () => {
    // Clean and create test user
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    cookies = regRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  it('should create a new chat session', async () => {
    const res = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Cookie', cookies)
      .send({ title: 'My Career Journey' })
      .expect(201);

    expect(res.body.session).toBeDefined();
    expect(res.body.session.title).toBe('My Career Journey');
    sessionId = res.body.session.id;
  });

  it('should list user chat sessions', async () => {
    const res = await request(app)
      .get('/api/v1/chat/sessions')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.sessions).toBeDefined();
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('should get session messages history', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/sessions/${sessionId}/messages`)
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.session).toBeDefined();
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('should update certification progress', async () => {
    const certName = 'AWS Certified Solutions Architect';
    const res = await request(app)
      .put(`/api/v1/certifications/progress/${encodeURIComponent(certName)}`)
      .set('Cookie', cookies)
      .send({ status: 'in_progress' })
      .expect(200);

    expect(res.body.certification).toBeDefined();
    expect(res.body.certification.status).toBe('in_progress');
  });

  it('should get certification progress list', async () => {
    const res = await request(app)
      .get('/api/v1/certifications/progress')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.certifications).toBeDefined();
    expect(Array.isArray(res.body.certifications)).toBe(true);
    expect(res.body.certifications.length).toBe(1);
  });

  it('should delete a chat session', async () => {
    const res = await request(app)
      .delete(`/api/v1/chat/sessions/${sessionId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.message).toBe('Chat session deleted successfully');
  });
});

import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Resume Endpoints', () => {
  const testUser = {
    email: `resume_test_${Date.now()}@example.com`,
    password: 'Password123'
  };
  let cookies = [];
  let testPdfPath = path.join(__dirname, 'test.pdf');
  let fakePdfPath = path.join(__dirname, 'fake.pdf');

  beforeAll(async () => {
    // Create test files
    fs.writeFileSync(testPdfPath, '%PDF-1.4\n%Fake PDF content for test'); // Has valid magic bytes roughly
    fs.writeFileSync(fakePdfPath, 'This is just a text file');

    // Register user
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    cookies = res.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
    if (fs.existsSync(fakePdfPath)) fs.unlinkSync(fakePdfPath);
  });

  it('should reject unauthenticated upload', async () => {
    await request(app)
      .post('/api/v1/resume/upload')
      .expect(401);
  });

  it('should reject fake PDF (fails magic byte validation)', async () => {
    const res = await request(app)
      .post('/api/v1/resume/upload')
      .set('Cookie', cookies)
      .attach('resume', fakePdfPath)
      .expect(400);
    
    expect(res.body.error).toContain('Invalid file type');
  });

  it('should accept valid upload and start job', async () => {
    const res = await request(app)
      .post('/api/v1/resume/upload')
      .set('Cookie', cookies)
      .attach('resume', testPdfPath)
      .expect(202);
    
    expect(res.body.jobId).toBeDefined();
    expect(res.body.resumeId).toBeDefined();

    // Check resume status
    const statusRes = await request(app)
      .get('/api/v1/resume/current')
      .set('Cookie', cookies)
      .expect(200);
    
    expect(statusRes.body.id).toBe(res.body.resumeId);
    expect(statusRes.body.parsedStatus).toBeDefined();
  });
});

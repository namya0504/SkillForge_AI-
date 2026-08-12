import 'dotenv/config';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env.js';
import bcrypt from 'bcryptjs';

describe('Skills API', () => {
  let user1, user2;
  let user1Token, user2Token;

  beforeAll(async () => {
    // Create users
    const passwordHash = await bcrypt.hash('password123', 10);
    user1 = await prisma.user.create({
      data: { email: 'user1_skills@test.com', passwordHash }
    });
    user2 = await prisma.user.create({
      data: { email: 'user2_skills@test.com', passwordHash }
    });

    user1Token = jwt.sign({ id: user1.id }, config.jwtSecret);
    user2Token = jwt.sign({ id: user2.id }, config.jwtSecret);
  });

  afterAll(async () => {
    await prisma.skill.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
  });

  beforeEach(async () => {
    await prisma.skill.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
  });

  it('should allow user to add a skill', async () => {
    const res = await request(app)
      .post('/api/v1/skills')
      .set('Cookie', [`token=${user1Token}`])
      .send({ skillName: 'React', proficiency: 'Intermediate' });
    
    expect(res.status).toBe(201);
    expect(res.body.skill).toBeDefined();
    expect(res.body.skill.skillName).toBe('react');
    expect(res.body.skill.proficiency).toBe('Intermediate');
    expect(res.body.skill.source).toBe('manual');
    expect(res.body.skill.userId).toBe(user1.id);
  });

  it('should fetch only the user\'s own skills', async () => {
    await prisma.skill.create({ data: { userId: user1.id, skillName: 'node', proficiency: 'Advanced' } });
    await prisma.skill.create({ data: { userId: user2.id, skillName: 'python', proficiency: 'Beginner' } });

    const res = await request(app)
      .get('/api/v1/skills')
      .set('Cookie', [`token=${user1Token}`]);
    
    expect(res.status).toBe(200);
    expect(res.body.skills.length).toBe(1);
    expect(res.body.skills[0].skillName).toBe('node');
  });

  it('should allow updating proficiency of an owned skill', async () => {
    const skill = await prisma.skill.create({ data: { userId: user1.id, skillName: 'css', proficiency: 'Beginner' } });

    const res = await request(app)
      .put(`/api/v1/skills/${skill.id}`)
      .set('Cookie', [`token=${user1Token}`])
      .send({ proficiency: 'Advanced' });
    
    expect(res.status).toBe(200);
    expect(res.body.skill.proficiency).toBe('Advanced');
  });

  it('should prevent updating another user\'s skill', async () => {
    const skill = await prisma.skill.create({ data: { userId: user2.id, skillName: 'java', proficiency: 'Beginner' } });

    const res = await request(app)
      .put(`/api/v1/skills/${skill.id}`)
      .set('Cookie', [`token=${user1Token}`])
      .send({ proficiency: 'Advanced' });
    
    expect(res.status).toBe(404); // Not found for this user
  });

  it('should allow deleting an owned skill', async () => {
    const skill = await prisma.skill.create({ data: { userId: user1.id, skillName: 'html', proficiency: 'Beginner' } });

    const res = await request(app)
      .delete(`/api/v1/skills/${skill.id}`)
      .set('Cookie', [`token=${user1Token}`]);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await prisma.skill.findUnique({ where: { id: skill.id } });
    expect(check).toBeNull();
  });
});

import prisma from '../src/config/database.js';

afterAll(async () => {
  await prisma.$disconnect();
});

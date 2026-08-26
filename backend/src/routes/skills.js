import express from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../config/database.js';

const router = express.Router();

// Middleware to handle validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  }
  next();
};

// GET /api/skills - Fetch all skills for the authenticated user
router.get('/', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// POST /api/skills - Add a new skill
router.post('/',
  [
    body('skillName').isString().trim().notEmpty().isLength({ max: 50 }),
    body('proficiency').isIn(['Beginner', 'Intermediate', 'Advanced'])
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { skillName, proficiency } = req.body;
      const normalizedName = skillName.toLowerCase();

      const skill = await prisma.skill.upsert({
        where: {
          userId_skillName: { userId: req.user.id, skillName: normalizedName }
        },
        update: { proficiency, source: 'manual' },
        create: {
          userId: req.user.id,
          skillName: normalizedName,
          proficiency,
          source: 'manual'
        }
      });

      res.status(201).json({ skill });
    } catch (error) {
      console.error('Error adding skill:', error);
      res.status(500).json({ error: 'Failed to add skill' });
    }
  }
);

// PUT /api/skills/:id - Update skill proficiency
router.put('/:id',
  [
    param('id').isUUID(),
    body('proficiency').isIn(['Beginner', 'Intermediate', 'Advanced'])
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { proficiency } = req.body;

      // Verify ownership
      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      const skill = await prisma.skill.update({
        where: { id },
        data: { proficiency }
      });

      res.json({ skill });
    } catch (error) {
      console.error('Error updating skill:', error);
      res.status(500).json({ error: 'Failed to update skill' });
    }
  }
);

// DELETE /api/skills/:id - Remove a skill
router.delete('/:id',
  [param('id').isUUID()],
  handleValidation,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      await prisma.skill.delete({ where: { id } });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting skill:', error);
      res.status(500).json({ error: 'Failed to delete skill' });
    }
  }
);

export default router;

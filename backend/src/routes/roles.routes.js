import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { generateRoadmapForUser } from '../services/roadmap.generator.js';

const router = express.Router();

// Middleware to handle validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  }
  next();
};

// GET /api/v1/roles - List all curated reference roles
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.roleReference.findMany({
      orderBy: [
        { isPopular: 'desc' },
        { title: 'asc' }
      ]
    });

    const parsedRoles = roles.map(r => ({
      ...r,
      requiredSkills: JSON.parse(r.requiredSkills || '[]')
    }));

    res.json({ roles: parsedRoles });
  } catch (error) {
    console.error('Error fetching reference roles:', error);
    res.status(500).json({ error: 'Failed to fetch reference roles' });
  }
});

// GET /api/v1/roles/target - Get current user's target role
router.get('/target', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { targetRole: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let parsedTargetRole = null;
    if (user.targetRole) {
      parsedTargetRole = {
        ...user.targetRole,
        requiredSkills: JSON.parse(user.targetRole.requiredSkills || '[]')
      };
    }

    res.json({
      targetRole: parsedTargetRole,
      customTargetRole: user.customTargetRole
    });
  } catch (error) {
    console.error('Error fetching target role:', error);
    res.status(500).json({ error: 'Failed to fetch target role' });
  }
});

// POST /api/v1/roles/target - Save/Update user's target role
router.post('/target',
  authenticate,
  [
    body('roleId').optional({ nullable: true }).isString().trim(),
    body('customRole').optional({ nullable: true }).isString().trim().isLength({ max: 50 }).escape()
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { roleId, customRole } = req.body;

      if (!roleId && (!customRole || !customRole.trim())) {
        return res.status(400).json({ error: 'Please select a role from the list or enter a custom target role.' });
      }

      let selectedRoleReference = null;
      if (roleId) {
        selectedRoleReference = await prisma.roleReference.findUnique({
          where: { id: roleId }
        });
        if (!selectedRoleReference) {
          return res.status(404).json({ error: 'Selected reference role not found.' });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          targetRoleId: roleId || null,
          customTargetRole: roleId ? null : customRole.trim()
        },
        include: { targetRole: true }
      });

      // Automatically regenerate roadmap for the updated target role
      try {
        await generateRoadmapForUser(req.user.id);
      } catch (genErr) {
        console.warn('Roadmap auto-regeneration on target role change notice:', genErr.message);
      }

      let parsedTargetRole = null;
      if (updatedUser.targetRole) {
        parsedTargetRole = {
          ...updatedUser.targetRole,
          requiredSkills: JSON.parse(updatedUser.targetRole.requiredSkills || '[]')
        };
      }

      res.json({
        message: 'Target role updated successfully',
        targetRole: parsedTargetRole,
        customTargetRole: updatedUser.customTargetRole
      });
    } catch (error) {
      console.error('Error updating target role:', error);
      res.status(500).json({ error: 'Failed to update target role' });
    }
  }
);

export default router;

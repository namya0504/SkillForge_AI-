import express from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { generateRoadmapForUser } from '../services/roadmap.generator.js';

const router = express.Router();

// GET /api/v1/roadmap - Fetch current authenticated user's roadmap & recommendations
router.get('/', authenticate, async (req, res) => {
  try {
    const roadmap = await prisma.roadmap.findUnique({
      where: { userId: req.user.id }
    });

    if (!roadmap) {
      return res.json({ roadmap: null });
    }

    res.json({
      roadmap: {
        id: roadmap.id,
        targetRoleTitle: roadmap.targetRoleTitle,
        gapAnalysis: JSON.parse(roadmap.gapAnalysis || '{}'),
        milestones: JSON.parse(roadmap.milestones || '[]'),
        recommendations: JSON.parse(roadmap.recommendations || '{}'),
        updatedAt: roadmap.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// POST /api/v1/roadmap/generate - Generate / Regenerate user's roadmap & recommendations
router.post('/generate', authenticate, async (req, res) => {
  try {
    const generated = await generateRoadmapForUser(req.user.id);
    res.json({
      message: 'Roadmap and recommendations generated successfully',
      roadmap: generated
    });
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: error.message || 'Failed to generate roadmap' });
  }
});

export default router;

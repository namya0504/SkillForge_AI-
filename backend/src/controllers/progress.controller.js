import prisma from '../config/database.js';

export const getProgress = async (req, res) => {
  try {
    const progressList = await prisma.progress.findMany({
      where: { userId: req.user.id }
    });
    res.json({ progress: progressList });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be not_started, in_progress, or completed.' });
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_itemId: {
          userId: req.user.id,
          itemId
        }
      },
      update: { status },
      create: {
        userId: req.user.id,
        itemId,
        status
      }
    });

    res.json({ progress });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

export const getProgressSummary = async (req, res) => {
  try {
    const roadmap = await prisma.roadmap.findUnique({
      where: { userId: req.user.id }
    });

    let totalItems = 0;
    if (roadmap && roadmap.milestones) {
      try {
        const milestones = JSON.parse(roadmap.milestones);
        if (Array.isArray(milestones)) {
          milestones.forEach(phase => {
            if (Array.isArray(phase.topics)) {
              totalItems += phase.topics.length;
            }
          });
        }
      } catch (e) {
        console.warn('Failed to parse milestones for progress summary:', e);
      }
    }

    const progressRecords = await prisma.progress.findMany({
      where: { userId: req.user.id }
    });

    const completedItems = progressRecords.filter(r => r.status === 'completed').length;
    const inProgressItems = progressRecords.filter(r => r.status === 'in_progress').length;
    const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    res.json({
      totalItems,
      completedItems,
      inProgressItems,
      completionPercent
    });
  } catch (error) {
    console.error('Get progress summary error:', error);
    res.status(500).json({ error: 'Failed to compute progress summary' });
  }
};

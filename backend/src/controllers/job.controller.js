import prisma from '../config/database.js';

export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findFirst({
      where: { id, userId: req.user.id } // per-user data isolation!
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result ? JSON.parse(job.result) : null,
      errorMsg: job.errorMsg,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
};

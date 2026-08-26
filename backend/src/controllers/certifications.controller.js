import prisma from '../config/database.js';

/**
 * GET /api/v1/certifications/progress
 * Get all certification progress records for current user
 */
export const getCertificationProgress = async (req, res) => {
  try {
    const certs = await prisma.certificationProgress.findMany({
      where: { userId: req.user.id }
    });

    res.status(200).json({ certifications: certs });
  } catch (error) {
    console.error('Get certification progress error:', error);
    res.status(500).json({ error: 'Failed to retrieve certification progress' });
  }
};

/**
 * PUT /api/v1/certifications/progress/:certIdentifier
 * Update or set certification status ('recommended' | 'in_progress' | 'completed')
 */
export const updateCertificationStatus = async (req, res) => {
  try {
    const { certIdentifier } = req.params;
    const { status } = req.body;

    if (!['recommended', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be recommended, in_progress, or completed.' });
    }

    const certRecord = await prisma.certificationProgress.upsert({
      where: {
        userId_certIdentifier: {
          userId: req.user.id,
          certIdentifier: decodeURIComponent(certIdentifier)
        }
      },
      update: {
        status,
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        certIdentifier: decodeURIComponent(certIdentifier),
        status
      }
    });

    res.status(200).json({
      message: 'Certification status updated successfully',
      certification: certRecord
    });
  } catch (error) {
    console.error('Update certification status error:', error);
    res.status(500).json({ error: 'Failed to update certification status' });
  }
};

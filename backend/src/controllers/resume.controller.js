import prisma from '../config/database.js';
import { saveFile } from '../config/storage.js';
import crypto from 'crypto';

export const uploadResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'No resume file provided. Please attach a valid PDF or DOCX resume.' });
    }

    // Generate random storage key
    const originalName = file.originalname || 'resume.pdf';
    const ext = originalName.includes('.') ? originalName.split('.').pop().toLowerCase() : 'pdf';
    const storageKey = `${crypto.randomUUID()}.${ext}`;

    // Save file to storage (resilient fallback)
    await saveFile(file.buffer, storageKey);

    // Determine mimeType
    const mimeType = ext === 'docx' || ext === 'doc' ? 'docx' : 'pdf';

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        userId,
        storageKey,
        originalName,
        mimeType,
        fileSize: file.size || file.buffer.length,
        parsedStatus: 'pending'
      }
    });

    // Create async job with base64 payload for 100% cloud reliability
    const job = await prisma.job.create({
      data: {
        userId,
        type: 'resume_parse',
        status: 'pending',
        payload: JSON.stringify({ 
          resumeId: resume.id, 
          storageKey, 
          mimeType,
          fileBase64: file.buffer.toString('base64')
        })
      }
    });

    // Return 202 Accepted with job ID
    res.status(202).json({
      message: 'Resume uploaded. Parsing started.',
      jobId: job.id,
      resumeId: resume.id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload resume' });
  }
};

export const getResumeStatus = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!resume) {
      return res.status(404).json({ error: 'No resume found' });
    }

    const parsedData = resume.parsedData ? JSON.parse(resume.parsedData) : null;

    res.json({
      id: resume.id,
      originalName: resume.originalName,
      parsedStatus: resume.parsedStatus,
      parsedData,
      createdAt: resume.createdAt
    });
  } catch (error) {
    console.error('Resume status error:', error);
    res.status(500).json({ error: 'Failed to get resume status' });
  }
};

import prisma from '../config/database.js';
import { saveFile } from '../config/storage.js';
import crypto from 'crypto';

export const uploadResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    
    // Generate random storage key
    const ext = file.originalname.split('.').pop().toLowerCase();
    const storageKey = `${crypto.randomUUID()}.${ext}`;
    
    // Save file to storage
    await saveFile(file.buffer, storageKey);
    
    // Determine mimeType
    const mimeType = ext === 'pdf' ? 'pdf' : 'docx';
    
    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        userId,
        storageKey,
        originalName: file.originalname,
        mimeType,
        fileSize: file.size,
        parsedStatus: 'pending'
      }
    });
    
    // Create async job
    const job = await prisma.job.create({
      data: {
        userId,
        type: 'resume_parse',
        status: 'pending',
        payload: JSON.stringify({ resumeId: resume.id, storageKey, mimeType })
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
    res.status(500).json({ error: 'Failed to upload resume' });
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

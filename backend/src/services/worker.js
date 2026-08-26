import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { readFile } from '../config/storage.js';
import { extractText } from './parser.js';
import { extractStructuredData } from './extractor.js';

class JobWorker {
  constructor() {
    this.maxConcurrent = config.maxConcurrentJobs;
    this.activeJobs = 0;
    this.interval = null;
    this.sweepInterval = null;
  }

  start() {
    console.log(`Worker started (max concurrent: ${this.maxConcurrent})`);
    this.interval = setInterval(() => this.poll(), 2000);
    this.sweepInterval = setInterval(() => this.sweepStalled(), 60000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    if (this.sweepInterval) clearInterval(this.sweepInterval);
  }

  async sweepStalled() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const stalled = await prisma.job.updateMany({
        where: {
          status: 'processing',
          createdAt: { lt: fiveMinutesAgo }
        },
        data: {
          status: 'pending'
        }
      });
      if (stalled.count > 0) {
        console.log(`Swept and reset ${stalled.count} stalled job(s) back to pending`);
      }
    } catch (err) {
      console.warn('Worker stalled job sweep error:', err?.message || err);
    }
  }

  async poll() {
    if (this.activeJobs >= this.maxConcurrent) return;
    try {
      // Compare-and-swap pattern inside a Prisma transaction to prevent race conditions:
      // Two concurrent transactions racing on the same row will have their updateMany calls 
      // serialized by Postgres's row-level locking — only one can see status still 'pending' 
      // and succeed; the other sees 0 rows matched and correctly backs off instead of double-processing.
      const job = await prisma.$transaction(async (tx) => {
        const candidate = await tx.job.findFirst({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' }
        });
        if (!candidate) return null;

        // Atomic claim: only succeeds if status is STILL 'pending' at update time.
        // If another worker already claimed it between findFirst and this update,
        // count will be 0 and we know we lost the race.
        const claim = await tx.job.updateMany({
          where: { id: candidate.id, status: 'pending' },
          data: { status: 'processing' }
        });

        return claim.count === 1 ? candidate : null;
      });

      if (!job) return; // either no pending job, or another worker won the race
      this.processJob(job);
    } catch (err) {
      console.error('Worker poll error:', err?.message || err);
    }
  }

  async processJob(job) {
    this.activeJobs++;
    try {
      switch (job.type) {
        case 'resume_parse':
          await this.handleResumeParse(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (err) {
      console.error(`Job ${job.id} failed:`, err.message);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'failed', errorMsg: err.message, completedAt: new Date() }
      });

      if (job.type === 'resume_parse' && job.payload) {
        try {
          const payload = JSON.parse(job.payload);
          if (payload.resumeId) {
            await prisma.resume.update({
              where: { id: payload.resumeId },
              data: { parsedStatus: 'failed' }
            });
          }
        } catch (e) {
          console.error('Failed to update resume status on job error:', e.message);
        }
      }
    } finally {
      this.activeJobs--;
    }
  }

  async handleResumeParse(job) {
    const payload = JSON.parse(job.payload);
    const { resumeId, storageKey, mimeType, fileBase64 } = payload;

    // Step 1: Read file buffer (direct base64 from database job payload or fallback to disk)
    let buffer;
    if (fileBase64) {
      buffer = Buffer.from(fileBase64, 'base64');
    } else {
      buffer = await readFile(storageKey);
    }

    // Step 2: Extract raw text (throws if scanned/empty/unreadable)
    const rawText = await extractText(buffer, mimeType);

    // Step 3: Extract structured data
    const structured = await extractStructuredData(rawText);

    // Step 4: Save parsed data to resume
    await prisma.resume.update({
      where: { id: resumeId },
      data: { parsedStatus: 'completed', parsedData: JSON.stringify(structured) }
    });

    // Step 5: Save extracted skills to skills table (upsert to avoid duplicates)
    if (structured.skills && structured.skills.length > 0) {
      for (const skill of structured.skills) {
        if (!skill || !skill.name) continue;
        await prisma.skill.upsert({
          where: {
            userId_skillName: { userId: job.userId, skillName: skill.name.toLowerCase() }
          },
          update: { proficiency: skill.proficiency, source: 'extracted' },
          create: {
            userId: job.userId,
            skillName: skill.name.toLowerCase(),
            proficiency: skill.proficiency || 'Beginner',
            source: 'extracted'
          }
        });
      }
    }

    // Step 6: Mark job complete with result
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        result: JSON.stringify(structured),
        completedAt: new Date()
      }
    });
  }
}

export const worker = new JobWorker();

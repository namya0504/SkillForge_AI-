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
  }

  start() {
    console.log(`Worker started (max concurrent: ${this.maxConcurrent})`);
    this.interval = setInterval(() => this.poll(), 2000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async poll() {
    if (this.activeJobs >= this.maxConcurrent) return;
    try {
      const job = await prisma.job.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' }
      });
      if (!job) return;
      this.processJob(job); // fire-and-forget, don't await
    } catch (err) {
      console.error('Worker poll error:', err.message);
    }
  }

  async processJob(job) {
    this.activeJobs++;
    try {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'processing' } });
      
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
    } finally {
      this.activeJobs--;
    }
  }

  async handleResumeParse(job) {
    const payload = JSON.parse(job.payload);
    const { resumeId, storageKey, mimeType } = payload;

    // Step 1: Read file from storage
    const buffer = await readFile(storageKey);

    // Step 2: Extract raw text
    const rawText = await extractText(buffer, mimeType);
    if (!rawText || rawText.trim().length < 20) {
      throw new Error('Could not extract meaningful text from the file. The file may be scanned/image-only.');
    }

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

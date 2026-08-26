import { config } from '../config/env.js';

const SKILLS_LIST = [
  // Programming Languages
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'R', 'MATLAB', 'Scala', 'Dart', 'SQL', 'HTML', 'CSS', 'Sass', 'Bash', 'Shell',
  // Frontend & Mobile
  'React', 'React Native', 'Flutter', 'Next.js', 'Vue', 'Vue.js', 'Angular', 'Svelte', 'TailwindCSS', 'Bootstrap', 'Redux', 'Zustand', 'HTML5', 'CSS3', 'Figma', 'UI/UX', 'Webpack', 'Vite', 'iOS', 'Android',
  // Backend & APIs
  'Node.js', 'Express', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', '.NET', 'ASP.NET', 'Laravel', 'Rails', 'Ruby on Rails', 'REST API', 'GraphQL', 'gRPC', 'WebSocket', 'Microservices',
  // Databases & Caching
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra', 'Oracle', 'Firebase', 'Prisma', 'TypeORM', 'Sequelize', 'Supabase', 'Neo4j',
  // Cloud, DevOps & Infrastructure
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'Terraform', 'Ansible', 'Linux', 'Git', 'GitHub', 'Bitbucket', 'Helm', 'Prometheus', 'Grafana', 'Nginx', 'Kafka', 'RabbitMQ',
  // AI, Data Science & Machine Learning
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Data Science', 'Big Data', 'ETL', 'Tableau', 'Power BI', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-Learn', 'Keras', 'OpenCV', 'LangChain', 'LlamaIndex', 'Vector DBs', 'Pinecone',
  // Testing & Quality Assurance
  'Jest', 'Cypress', 'Playwright', 'Selenium', 'Postman', 'JUnit', 'PyTest',
  // Methodology & Tools
  'Agile', 'Scrum', 'JIRA', 'Confluence', 'System Design', 'OOP', 'Design Patterns'
];

/**
 * Universal High-Speed Resume Extractor
 * Supports plain text, scanned PDFs, images, and multi-column designs
 */
export async function extractStructuredData(parseResult, fileContext = null) {
  const text = typeof parseResult === 'string' ? parseResult : (parseResult?.text || '');
  const isScanned = typeof parseResult === 'object' && parseResult?.isScanned;
  const mimeType = (fileContext?.mimeType || parseResult?.mimeType || 'application/pdf');
  const buffer = fileContext?.buffer;

  // 1. If document is scanned / image-based and buffer is available, use Gemini Multimodal Vision
  if ((isScanned || !text || text.length < 30) && buffer && (config.geminiApiKey || config.llmApiKey)) {
    try {
      const visionResult = await extractWithGeminiVision(buffer, mimeType);
      if (visionResult && visionResult.skills && visionResult.skills.length > 0) {
        return visionResult;
      }
    } catch (visionErr) {
      console.warn('Gemini vision extraction failed, trying fast text extraction:', visionErr.message);
    }
  }

  // 2. High-speed LLM text extraction with Groq / OpenAI
  if (config.llmApiKey && text && text.length >= 20) {
    try {
      return await extractWithFastLLM(text);
    } catch (err) {
      console.warn('Fast LLM extraction failed, falling back to rule engine:', err.message);
    }
  }

  // 3. Ultra-fast local rule engine fallback
  return extractWithFallback(text);
}

/**
 * Extract structured resume data from scanned PDFs or images via Gemini 2.0 Flash Vision
 */
async function extractWithGeminiVision(buffer, mimeType) {
  const apiKey = config.geminiApiKey || config.llmApiKey;
  if (!apiKey) throw new Error('No API key for Gemini Vision');

  const base64Data = buffer.toString('base64');
  const effectiveMime = mimeType.includes('pdf') ? 'application/pdf' : (mimeType.startsWith('image/') ? mimeType : 'image/jpeg');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `Extract all candidate resume information from this document image/PDF into structured JSON.
CRITICAL RULES:
1. ONLY extract skills, tools, frameworks, and programming languages that explicitly appear in the document.
2. For each skill, assign proficiency ('Beginner', 'Intermediate', or 'Advanced').
3. Return ONLY valid JSON matching this schema:
{
  "skills": [
    { "name": "SkillName", "proficiency": "Beginner|Intermediate|Advanced" }
  ],
  "education": [
    { "degree": "Degree Name", "institution": "University/School", "year": "Year" }
  ],
  "experience": [
    { "title": "Job Title", "company": "Company Name", "duration": "Dates/Duration", "description": "Brief summary" }
  ],
  "certifications": [
    { "name": "Certification Name", "issuer": "Issuer Organization" }
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: effectiveMime, data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500
      }
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Gemini Vision error (${response.status})`);
  }

  const data = await response.json();
  let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = resultText.match(/\{[\s\S]*\}/);
  if (match) resultText = match[0];

  return JSON.parse(resultText);
}

/**
 * Fast LLM text extraction with Groq / OpenAI (typically < 800ms)
 */
async function extractWithFastLLM(text) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const isGroq = config.llmApiKey.startsWith('gsk_');
  const apiUrl = isGroq 
    ? 'https://api.groq.com/openai/v1/chat/completions' 
    : 'https://api.openai.com/v1/chat/completions';
  const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo';

  const prompt = `Extract structured skills and background from this candidate resume text:
CRITICAL:
1. ONLY extract skills, tools, frameworks, and programming languages that are EXPLICITLY mentioned in the text.
2. For each skill found, determine proficiency ('Beginner', 'Intermediate', or 'Advanced').

Return ONLY valid JSON matching this schema:
{
  "skills": [
    { "name": "SkillName", "proficiency": "Beginner|Intermediate|Advanced" }
  ],
  "education": [
    { "degree": "Degree Name", "institution": "University/School", "year": "Year" }
  ],
  "experience": [
    { "title": "Job Title", "company": "Company Name", "duration": "Dates/Duration", "description": "Brief summary" }
  ],
  "certifications": [
    { "name": "Certification Name", "issuer": "Issuer Organization" }
  ]
}

RESUME TEXT:
${text.slice(0, 6000)}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llmApiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a lightning-fast, highly accurate resume data parser. Return JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1200
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  let resultText = data.choices[0].message.content || '';
  
  resultText = resultText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = resultText.match(/\{[\s\S]*\}/);
  if (match) {
    resultText = match[0];
  }
  
  const parsed = JSON.parse(resultText);
  if (!parsed.skills || !Array.isArray(parsed.skills)) throw new Error('Invalid schema');
  return parsed;
}

export function extractWithFallback(text) {
  const result = {
    skills: [],
    education: [],
    experience: [],
    certifications: []
  };

  const textLower = (text || '').toLowerCase();
  const addedSkills = new Set();

  SKILLS_LIST.forEach(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isStandardWord = !/[^\w\s]/.test(skill);
    const pattern = isStandardWord
      ? new RegExp(`\\b${escaped}\\b`, 'i')
      : new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');

    if (pattern.test(text || '')) {
      const normSkillKey = skill.toLowerCase();
      if (!addedSkills.has(normSkillKey)) {
        addedSkills.add(normSkillKey);
        
        let proficiency = 'Beginner';
        const skillIdx = textLower.indexOf(normSkillKey);
        if (skillIdx !== -1) {
          const context = textLower.substring(Math.max(0, skillIdx - 20), Math.min(textLower.length, skillIdx + 15));
          if (context.includes('expert') || context.includes('advanced') || context.includes('senior') || context.includes('lead') || context.includes('architect')) {
            proficiency = 'Advanced';
          } else if (context.includes('intermediate') || context.includes('proficient') || context.includes('experienced') || context.includes('working knowledge')) {
            proficiency = 'Intermediate';
          }
        }
        result.skills.push({ name: skill, proficiency });
      }
    }
  });

  const eduPatterns = ['b\\.tech', 'b\\.e\\.', 'm\\.tech', 'mba', 'b\\.sc', 'm\\.sc', 'phd', 'bachelor', 'master'];
  eduPatterns.forEach(pattern => {
    const regex = new RegExp(`([^\\n]*?${pattern}[^\\n]*)`, 'ig');
    const matches = (text || '').match(regex);
    if (matches) {
      matches.forEach(match => {
        result.education.push({ degree: match.trim(), institution: 'Extracted', year: '' });
      });
    }
  });

  const expPatterns = ['intern', 'developer', 'engineer', 'analyst', 'manager', 'lead', 'architect'];
  expPatterns.forEach(pattern => {
    const regex = new RegExp(`([^\\n]*?${pattern}[^\\n]*)`, 'ig');
    const matches = (text || '').match(regex);
    if (matches) {
      matches.forEach(match => {
        result.experience.push({ title: match.trim(), company: 'Extracted', duration: '', description: '' });
      });
    }
  });

  const certPatterns = ['certified', 'certification', 'certificate'];
  certPatterns.forEach(pattern => {
    const regex = new RegExp(`([^\\n]*?${pattern}[^\\n]*)`, 'ig');
    const matches = (text || '').match(regex);
    if (matches) {
      matches.forEach(match => {
        result.certifications.push({ name: match.trim(), issuer: 'Extracted' });
      });
    }
  });

  return result;
}

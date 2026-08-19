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

export async function extractStructuredData(text) {
  if (config.llmApiKey) {
    return await extractWithLLM(text);
  }
  return extractWithFallback(text);
}

async function extractWithLLM(text) {
  let retries = 2;
  while (retries >= 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const isGroq = config.llmApiKey.startsWith('gsk_');
      const apiUrl = isGroq 
        ? 'https://api.groq.com/openai/v1/chat/completions' 
        : 'https://api.openai.com/v1/chat/completions';
      const model = isGroq ? 'qwen/qwen3.6-27b' : 'gpt-3.5-turbo';

      const prompt = `Extract structured data from the candidate resume text below.
CRITICAL REQUIREMENT:
1. ONLY extract skills, tools, frameworks, and programming languages that are EXPLICITLY mentioned in the provided text.
2. Do NOT hallucinate, infer, or add any skills that do not appear in the text.
3. For each skill found, determine proficiency ('Beginner', 'Intermediate', or 'Advanced') based on candidate experience or context.

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
${text}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llmApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a precise resume parser. Return ONLY JSON.' },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      let resultText = data.choices[0].message.content || '';
      
      resultText = resultText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const match = resultText.match(/\{[\s\S]*\}/);
      if (match) {
        resultText = match[0];
      }
      
      const parsed = JSON.parse(resultText);
      if (!parsed.skills || !Array.isArray(parsed.skills)) throw new Error('Invalid schema');
      return parsed;
    } catch (err) {
      retries--;
      if (retries < 0) {
        console.warn('LLM extraction failed after retries, falling back to rule engine', err.message);
        return extractWithFallback(text);
      }
    }
  }
}

function matchSkillInText(skill, textLower) {
  const sLower = skill.toLowerCase();
  const idx = textLower.indexOf(sLower);
  if (idx === -1) return false;

  const charBefore = idx > 0 ? textLower[idx - 1] : ' ';
  const charAfter = (idx + sLower.length) < textLower.length ? textLower[idx + sLower.length] : ' ';

  const isValidBefore = /[\s,;:()\/\-\n\r\[\]\{\}]/.test(charBefore) || idx === 0;
  const isValidAfter = /[\s,;:()\/\-\n\r\[\]\{\}]/.test(charAfter) || (idx + sLower.length) === textLower.length;

  return isValidBefore && isValidAfter;
}

function extractWithFallback(text) {
  const result = {
    skills: [],
    education: [],
    experience: [],
    certifications: []
  };

  const textLower = text.toLowerCase();
  const addedSkills = new Set();

  SKILLS_LIST.forEach(skill => {
    if (matchSkillInText(skill, textLower)) {
      const normSkillKey = skill.toLowerCase();
      if (!addedSkills.has(normSkillKey)) {
        addedSkills.add(normSkillKey);
        
        let proficiency = 'Beginner';
        const skillIdx = textLower.indexOf(normSkillKey);
        if (skillIdx !== -1) {
          const context = textLower.substring(Math.max(0, skillIdx - 40), Math.min(textLower.length, skillIdx + 40));
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
    const matches = text.match(regex);
    if (matches) {
      matches.forEach(match => {
        result.education.push({ degree: match.trim(), institution: 'Extracted', year: '' });
      });
    }
  });

  const expPatterns = ['intern', 'developer', 'engineer', 'analyst', 'manager', 'lead', 'architect'];
  expPatterns.forEach(pattern => {
    const regex = new RegExp(`([^\\n]*?${pattern}[^\\n]*)`, 'ig');
    const matches = text.match(regex);
    if (matches) {
      matches.forEach(match => {
        result.experience.push({ title: match.trim(), company: 'Extracted', duration: '', description: '' });
      });
    }
  });

  const certPatterns = ['certified', 'certification', 'certificate'];
  certPatterns.forEach(pattern => {
    const regex = new RegExp(`([^\\n]*?${pattern}[^\\n]*)`, 'ig');
    const matches = text.match(regex);
    if (matches) {
      matches.forEach(match => {
        result.certifications.push({ name: match.trim(), issuer: 'Extracted' });
      });
    }
  });

  return result;
}

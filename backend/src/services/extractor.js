import { config } from '../config/env.js';

const SKILLS_LIST = [
  'Python', 'JavaScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'TypeScript', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'R', 'MATLAB', 'Scala',
  'React', 'Angular', 'Vue', 'Next.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Node.js', '.NET', 'Laravel', 'Rails', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra', 'Oracle', 'Firebase',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'Terraform', 'Git', 'GitHub', 'Linux',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Data Science', 'Big Data', 'ETL', 'Tableau', 'Power BI',
  'HTML', 'CSS', 'REST API', 'GraphQL', 'WebSocket', 'HTTP',
  'Agile', 'Scrum', 'JIRA', 'Figma', 'UI/UX', 'Microservices', 'System Design', 'OOP'
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llmApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a resume parser. Extract structured data from the following resume text. Return ONLY valid JSON.' },
            { role: 'user', content: `DATA:\n${text}` }
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
      
      // Clean thinking tags or markdown code blocks
      resultText = resultText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const match = resultText.match(/\{[\s\S]*\}/);
      if (match) {
        resultText = match[0];
      }
      
      const parsed = JSON.parse(resultText);
      // Validate schema basic fields
      if (!parsed.skills || !Array.isArray(parsed.skills)) throw new Error('Invalid schema');
      return parsed;
    } catch (err) {
      retries--;
      if (retries < 0) {
        console.warn('LLM extraction failed after retries, falling back', err);
        return extractWithFallback(text);
      }
    }
  }
}

function extractWithFallback(text) {
  const result = {
    skills: [],
    education: [],
    experience: [],
    certifications: []
  };

  const textLower = text.toLowerCase();

  SKILLS_LIST.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      let proficiency = 'Beginner';
      const skillIdx = textLower.indexOf(skill.toLowerCase());
      if (skillIdx !== -1) {
        const context = textLower.substring(Math.max(0, skillIdx - 30), Math.min(textLower.length, skillIdx + 30));
        if (context.includes('expert') || context.includes('advanced') || context.includes('senior')) {
          proficiency = 'Advanced';
        } else if (context.includes('intermediate') || context.includes('proficient') || context.includes('experienced')) {
          proficiency = 'Intermediate';
        }
      }
      result.skills.push({ name: skill, proficiency });
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

  const expPatterns = ['intern', 'developer', 'engineer', 'analyst'];
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

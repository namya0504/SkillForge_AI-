import prisma from '../config/database.js';
import { config } from '../config/env.js';
import crypto from 'crypto';

export function normalizeSkillName(name) {
  if (!name) return '';
  const clean = name.toLowerCase().trim()
    .replace(/[\/\._\-]/g, ' ')
    .replace(/\s+/g, ' ');
  
  const ALIASES = {
    'js': 'javascript',
    'ts': 'typescript',
    'react js': 'react',
    'reactjs': 'react',
    'node': 'node.js',
    'nodejs': 'node.js',
    'node js': 'node.js',
    'express js': 'express',
    'expressjs': 'express',
    'postgres': 'postgresql',
    'pg': 'postgresql',
    'mongo': 'mongodb',
    'react native': 'react native',
    'reactnative': 'react native',
    'rest': 'rest api',
    'restful': 'rest api',
    'restful api': 'rest api',
    'ui ux': 'ui/ux',
    'html5': 'html',
    'css3': 'css',
    'k8s': 'kubernetes',
    'aws': 'aws',
    'amazon web services': 'aws',
    'ml': 'machine learning'
  };

  return ALIASES[clean] || clean;
}

// Mapping of proficiencies to numeric values for gap matrix calculations
const PROFICIENCY_SCORES = {
  'beginner': 1,
  'intermediate': 2,
  'advanced': 3
};

// Certification Library Knowledge Base (Curated mappings traceable to tech skills)
const CERTIFICATION_DATABASE = {
  'aws': [
    { title: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', costType: 'Paid', difficulty: 'Beginner', url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/' },
    { title: 'AWS Certified Solutions Architect - Associate', issuer: 'Amazon Web Services', costType: 'Paid', difficulty: 'Intermediate', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/' }
  ],
  'azure': [
    { title: 'Microsoft Certified: Azure Fundamentals (AZ-900)', issuer: 'Microsoft', costType: 'Paid', difficulty: 'Beginner', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/' }
  ],
  'docker': [
    { title: 'Docker Certified Associate (DCA)', issuer: 'Mirantis', costType: 'Paid', difficulty: 'Intermediate', url: 'https://www.mirantis.com/training/docker-certified-associate/' }
  ],
  'kubernetes': [
    { title: 'Certified Kubernetes Application Developer (CKAD)', issuer: 'CNCF / Linux Foundation', costType: 'Paid', difficulty: 'Advanced', url: 'https://www.linuxfoundation.org/certification/ckad' }
  ],
  'python': [
    { title: 'PCEP – Certified Entry-Level Python Programmer', issuer: 'Python Institute', costType: 'Free', difficulty: 'Beginner', url: 'https://pythoninstitute.org/pcep' },
    { title: 'PCAP – Certified Associate in Python Programming', issuer: 'Python Institute', costType: 'Paid', difficulty: 'Intermediate', url: 'https://pythoninstitute.org/pcap' }
  ],
  'react': [
    { title: 'Meta Front-End Developer Professional Certificate', issuer: 'Meta / Coursera', costType: 'Freemium', difficulty: 'Intermediate', url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer' }
  ],
  'node.js': [
    { title: 'OpenJS Node.js Application Developer (JSNAD)', issuer: 'Linux Foundation', costType: 'Paid', difficulty: 'Intermediate', url: 'https://training.linuxfoundation.org/certification/jsnad/' }
  ],
  'machine learning': [
    { title: 'TensorFlow Developer Certificate', issuer: 'Google', costType: 'Paid', difficulty: 'Intermediate', url: 'https://www.tensorflow.org/certificate' },
    { title: 'DeepLearning.AI Machine Learning Specialization', issuer: 'DeepLearning.AI', costType: 'Freemium', difficulty: 'Intermediate', url: 'https://www.coursera.org/specializations/machine-learning-introduction' }
  ],
  'security': [
    { title: 'CompTIA Security+', issuer: 'CompTIA', costType: 'Paid', difficulty: 'Intermediate', url: 'https://www.comptia.org/certifications/security' }
  ],
  'git': [
    { title: 'Git & GitHub Version Control Certification', issuer: 'FreeCodeCamp', costType: 'Free', difficulty: 'Beginner', url: 'https://www.freecodecamp.org' }
  ]
};

export async function generateRoadmapForUser(userId) {
  // 1. Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: true,
      targetRole: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Determine target role title and required skills benchmark
  let targetRoleTitle = 'Full Stack Web Developer';
  let requiredRoleSkills = [];

  if (user.targetRole) {
    targetRoleTitle = user.targetRole.title;
    requiredRoleSkills = JSON.parse(user.targetRole.requiredSkills || '[]');
  } else if (user.customTargetRole) {
    targetRoleTitle = user.customTargetRole;
    // Default fallback baseline for custom roles
    requiredRoleSkills = [
      { name: 'Core Technology Stack', proficiency: 'Advanced' },
      { name: 'API Design & Integration', proficiency: 'Intermediate' },
      { name: 'Database Management', proficiency: 'Intermediate' },
      { name: 'System Architecture', proficiency: 'Intermediate' }
    ];
  } else {
    // Default reference role
    const defaultRole = await prisma.roleReference.findFirst({ where: { isPopular: true } });
    if (defaultRole) {
      targetRoleTitle = defaultRole.title;
      requiredRoleSkills = JSON.parse(defaultRole.requiredSkills || '[]');
    }
  }

  // 2. Perform Gap Analysis Matrix
  const userSkillsMap = new Map();
  user.skills.forEach(s => {
    const key = normalizeSkillName(s.skillName);
    userSkillsMap.set(key, s.proficiency);
  });

  const matchedSkills = [];
  const levelGaps = [];
  const missingSkills = [];

  requiredRoleSkills.forEach(reqSkill => {
    const normName = normalizeSkillName(reqSkill.name);
    const userProficiency = userSkillsMap.get(normName);
    const targetProficiency = reqSkill.proficiency || 'Intermediate';

    if (!userProficiency) {
      missingSkills.push({
        name: reqSkill.name,
        targetProficiency,
        priority: 'High'
      });
    } else {
      const userScore = PROFICIENCY_SCORES[userProficiency.toLowerCase()] || 1;
      const targetScore = PROFICIENCY_SCORES[targetProficiency.toLowerCase()] || 2;

      if (userScore >= targetScore) {
        matchedSkills.push({
          name: reqSkill.name,
          currentProficiency: userProficiency,
          targetProficiency,
          status: 'Matched'
        });
      } else {
        levelGaps.push({
          name: reqSkill.name,
          currentProficiency: userProficiency,
          targetProficiency,
          status: 'Level Gap'
        });
      }
    }
  });

  const gapAnalysisObj = {
    matchedSkills,
    levelGaps,
    missingSkills
  };

  // 3. Generate Unified Milestones & Recommendations in a Single Pass
  let result;
  if (config.llmApiKey) {
    try {
      result = await generateWithLLM(targetRoleTitle, user.skills, gapAnalysisObj);
    } catch (err) {
      console.warn('LLM roadmap generation failed, falling back to rule engine:', err.message);
      result = generateWithRuleEngine(targetRoleTitle, user.skills, gapAnalysisObj);
    }
  } else {
    result = generateWithRuleEngine(targetRoleTitle, user.skills, gapAnalysisObj);
  }

  // 4. Save to Database (Upsert Roadmap for user)
  const savedRoadmap = await prisma.roadmap.upsert({
    where: { userId },
    update: {
      targetRoleTitle,
      gapAnalysis: JSON.stringify(gapAnalysisObj),
      milestones: JSON.stringify(result.milestones),
      recommendations: JSON.stringify(result.recommendations)
    },
    create: {
      userId,
      targetRoleTitle,
      gapAnalysis: JSON.stringify(gapAnalysisObj),
      milestones: JSON.stringify(result.milestones),
      recommendations: JSON.stringify(result.recommendations)
    }
  });

  return {
    id: savedRoadmap.id,
    targetRoleTitle: savedRoadmap.targetRoleTitle,
    gapAnalysis: gapAnalysisObj,
    milestones: result.milestones,
    recommendations: result.recommendations,
    updatedAt: savedRoadmap.updatedAt
  };
}

const RESOURCE_LINKS = {
  'javascript': { title: 'MDN Web Docs — JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
  'typescript': { title: 'TypeScript Official Documentation', url: 'https://www.typescriptlang.org/docs/' },
  'react': { title: 'React Official Documentation & Guides', url: 'https://react.dev/learn' },
  'react native': { title: 'React Native Official Docs', url: 'https://reactnative.dev/docs/getting-started' },
  'flutter': { title: 'Flutter Docs & Codelabs', url: 'https://docs.flutter.dev/' },
  'next.js': { title: 'Next.js Documentation & App Router', url: 'https://nextjs.org/docs' },
  'node.js': { title: 'Node.js Official Documentation', url: 'https://nodejs.org/en/docs/' },
  'python': { title: 'Python Official Documentation & Tutorials', url: 'https://docs.python.org/3/tutorial/' },
  'postgresql': { title: 'PostgreSQL Tutorial & Documentation', url: 'https://www.postgresqltutorial.com/' },
  'mongodb': { title: 'MongoDB University & Manual', url: 'https://www.mongodb.com/docs/manual/' },
  'docker': { title: 'Docker Official Get Started Guides', url: 'https://docs.docker.com/get-started/' },
  'kubernetes': { title: 'Kubernetes Official Tutorials', url: 'https://kubernetes.io/docs/tutorials/' },
  'aws': { title: 'AWS Skill Builder & Documentation', url: 'https://aws.amazon.com/getting-started/' },
  'git': { title: 'Git Official Book & Reference', url: 'https://git-scm.com/book/en/v2' },
  'rest api': { title: 'RESTful API Design Best Practices Guide', url: 'https://restfulapi.net/' },
  'ui/ux': { title: 'Figma UI/UX Design System Guide', url: 'https://help.figma.com/hc/en-us' },
  'machine learning': { title: 'Google Machine Learning Crash Course', url: 'https://developers.google.com/machine-learning/crash-course' },
  'sql': { title: 'SQL Zoo Interactive Tutorials', url: 'https://sqlzoo.net/' },
  'html': { title: 'MDN Web Docs — HTML Fundamentals', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  'css': { title: 'CSS Tricks & MDN Layout Guides', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS' }
};

function getResourceForSkill(skillName) {
  const norm = (skillName || '').toLowerCase().trim();
  for (const [key, resource] of Object.entries(RESOURCE_LINKS)) {
    if (norm.includes(key)) return resource;
  }
  return { title: 'FreeCodeCamp Interactive Tech Learning', url: 'https://www.freecodecamp.org/learn' };
}

function generateWithRuleEngine(roleTitle, userSkills, gapAnalysis) {
  const allGaps = [...gapAnalysis.missingSkills.map(s => s.name), ...gapAnalysis.levelGaps.map(s => s.name)];
  const primaryGap = allGaps[0] || 'Core Development';
  const secondaryGap = allGaps[1] || allGaps[0] || 'System Architecture';
  const tertiaryGap = allGaps[2] || 'Testing & Security';

  const phase1Skills = allGaps.slice(0, 3);
  const phase2Skills = allGaps.slice(3, 6).length > 0 ? allGaps.slice(3, 6) : allGaps.slice(1, 4);
  const phase3Skills = allGaps.slice(6, 9).length > 0 ? allGaps.slice(6, 9) : [primaryGap, 'Performance Optimization', 'CI/CD Deployment'];

  // 1. Build Dynamic Milestones with Learning Resource Links
  const milestones = [
    {
      phase: 1,
      title: 'Phase 1: Foundation & Gap Remediation',
      duration: '3 - 4 Weeks',
      description: `Master essential missing fundamentals required for ${roleTitle}, focusing on ${phase1Skills.join(', ') || 'Core Skills'}.`,
      topics: phase1Skills.length > 0 
        ? phase1Skills.map(g => ({
            title: `In-depth ${g} core syntax, patterns & best practices`,
            resource: getResourceForSkill(g)
          }))
        : [
            { title: 'Advanced Syntax & Language Fundamentals', resource: { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' } },
            { title: 'Core Data Structures & Algorithms', resource: { title: 'GeeksforGeeks Data Structures', url: 'https://www.geeksforgeeks.org' } }
          ],
      targetSkills: phase1Skills
    },
    {
      phase: 2,
      title: 'Phase 2: Intermediate Implementation & Feature Architecture',
      duration: '4 - 6 Weeks',
      description: `Build real-world components and integrations for ${roleTitle} incorporating ${phase2Skills.join(', ')}.`,
      topics: phase2Skills.map(g => ({
        title: `Building production features with ${g} & component integration`,
        resource: getResourceForSkill(g)
      })),
      targetSkills: phase2Skills
    },
    {
      phase: 3,
      title: 'Phase 3: Production Delivery, Performance & Deployment',
      duration: '3 - 4 Weeks',
      description: `Prepare for ${roleTitle} technical interviews by implementing automated testing, performance tuning, and CI/CD pipelines.`,
      topics: [
        { title: `Performance Tuning & Security for ${roleTitle}`, resource: getResourceForSkill(primaryGap) },
        { title: `Automated Integration & Unit Testing`, resource: getResourceForSkill('testing') },
        { title: `Production CI/CD Deployment for ${roleTitle}`, resource: getResourceForSkill('docker') }
      ],
      targetSkills: phase3Skills
    }
  ];

  // 2. Build Dynamic Project Recommendations (Feature 6)
  const projects = [
    {
      id: `proj-${crypto.randomUUID().slice(0, 8)}`,
      title: `Full-Featured ${primaryGap} Application Platform`,
      description: `Build a production-grade application featuring state management, UI component architecture, and API integration emphasizing ${primaryGap}.`,
      rationale: `Directly addresses your primary skill gap in ${primaryGap} to build resume-worthy hands-on proof of competence.`,
      difficulty: 'Intermediate',
      estimatedHours: '25 - 30 hrs',
      targetSkills: [primaryGap, secondaryGap, 'Git'].filter(Boolean)
    },
    {
      id: `proj-${crypto.randomUUID().slice(0, 8)}`,
      title: `${roleTitle} Enterprise Portfolio Capstone`,
      description: `Construct an end-to-end production system demonstrating expertise in ${secondaryGap} and ${tertiaryGap} tailored for ${roleTitle} positions.`,
      rationale: `Demonstrates end-to-end domain expertise for ${roleTitle} hiring managers by synthesizing key skill gaps.`,
      difficulty: 'Advanced',
      estimatedHours: '40 - 50 hrs',
      targetSkills: [secondaryGap, tertiaryGap, 'Testing'].filter(Boolean)
    }
  ];

  // 3. Build Certification Recommendations (Feature 6)
  const certifications = [];

  // Map certifications based on gap skills
  allGaps.forEach(gap => {
    const normGap = gap.toLowerCase();
    for (const [key, certList] of Object.entries(CERTIFICATION_DATABASE)) {
      if (normGap.includes(key)) {
        certList.forEach(cert => {
          if (!certifications.some(c => c.title === cert.title)) {
            certifications.push({
              id: `cert-${crypto.randomUUID().slice(0, 8)}`,
              ...cert,
              rationale: `Formally verifies your proficiency in ${gap}, making your resume stand out for ${roleTitle} hiring managers.`,
              targetSkills: [gap]
            });
          }
        });
      }
    }
  });

  // Fallback certification if no specific skill matched
  if (certifications.length === 0) {
    certifications.push({
      id: `cert-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Meta Front-End / Back-End Professional Certificate',
      issuer: 'Meta / Coursera',
      costType: 'Freemium',
      difficulty: 'Intermediate',
      url: 'https://www.coursera.org',
      rationale: `Provides structured industry recognition for ${roleTitle} competencies covering core application development workflows.`,
      targetSkills: [primaryGap]
    });
  }

  return {
    milestones,
    recommendations: {
      projects,
      certifications: certifications.slice(0, 4) // Return top 4 relevant certs
    }
  };
}

async function generateWithLLM(roleTitle, userSkills, gapAnalysis) {
  // Single-pass LLM invocation generating milestones AND recommendations
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  const prompt = `You are a career development AI coach for SkillForge AI.
Generate a structured learning roadmap and recommendations for a candidate targeting the role: "${roleTitle}".

Candidate Skills Matrix:
- Matched Skills: ${JSON.stringify(gapAnalysis.matchedSkills)}
- Level Gaps: ${JSON.stringify(gapAnalysis.levelGaps)}
- Missing Skills: ${JSON.stringify(gapAnalysis.missingSkills)}

Return ONLY valid JSON matching this exact structure:
{
  "milestones": [
    {
      "phase": 1,
      "title": "Phase 1 Title",
      "duration": "3 Weeks",
      "description": "Short phase summary",
      "topics": ["Topic 1", "Topic 2"],
      "targetSkills": ["Skill 1", "Skill 2"]
    }
  ],
  "recommendations": {
    "projects": [
      {
        "id": "proj-1",
        "title": "Project Name",
        "description": "Detailed project description",
        "rationale": "1-2 line rationale directly traceable to skill gap",
        "difficulty": "Intermediate",
        "estimatedHours": "20 hrs",
        "targetSkills": ["Skill 1"]
      }
    ],
    "certifications": [
      {
        "id": "cert-1",
        "title": "Cert Name",
        "issuer": "Issuer",
        "costType": "Free/Paid/Freemium",
        "difficulty": "Intermediate",
        "url": "https://...",
        "rationale": "1-2 line rationale directly traceable to skill gap",
        "targetSkills": ["Skill 1"]
      }
    ]
  }
}`;

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
      messages: [{ role: 'user', content: prompt }]
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
  return parsed;
}

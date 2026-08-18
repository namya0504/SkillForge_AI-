import prisma from '../config/database.js';
import { config } from '../config/env.js';
import crypto from 'crypto';

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
  user.skills.forEach(s => userSkillsMap.set(s.skillName.toLowerCase(), s.proficiency));

  const matchedSkills = [];
  const levelGaps = [];
  const missingSkills = [];

  requiredRoleSkills.forEach(reqSkill => {
    const normName = reqSkill.name.toLowerCase();
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

function generateWithRuleEngine(roleTitle, userSkills, gapAnalysis) {
  const allGaps = [...gapAnalysis.missingSkills.map(s => s.name), ...gapAnalysis.levelGaps.map(s => s.name)];
  const primaryGap = allGaps[0] || 'Core Development';

  // 1. Build Milestones
  const milestones = [
    {
      phase: 1,
      title: 'Phase 1: Foundation & Gap Remediation',
      duration: '3 - 4 Weeks',
      description: `Master essential missing fundamentals required for ${roleTitle}, focusing on ${allGaps.slice(0, 3).join(', ') || 'Core Skills'}.`,
      topics: allGaps.length > 0 ? allGaps.slice(0, 3).map(g => `In-depth ${g} core concepts & patterns`) : ['Advanced Syntax', 'Core Data Structures', 'Design Patterns'],
      targetSkills: allGaps.slice(0, 3)
    },
    {
      phase: 2,
      title: 'Phase 2: Intermediate Implementation & Integration',
      duration: '4 - 6 Weeks',
      description: `Build real-world application components for ${roleTitle} integrating API protocols, state management, and persistence.`,
      topics: ['RESTful API Design & Validation', 'Database Schema Modeling', 'State Management & Async Workflows'],
      targetSkills: allGaps.slice(2, 5)
    },
    {
      phase: 3,
      title: 'Phase 3: Production Systems, Cloud & Deployment',
      duration: '3 - 4 Weeks',
      description: `Prepare for ${roleTitle} technical interviews by implementing containerized CI/CD deployment pipelines, system testing, and security best practices.`,
      topics: ['Docker Containerization', 'Automated Integration Testing', 'Cloud Deployment & Monitoring'],
      targetSkills: ['Docker', 'CI/CD', 'Testing']
    }
  ];

  // 2. Build Projects Recommendations (Feature 6)
  const projects = [];

  // Project 1: Targeted at primary gap
  projects.push({
    id: `proj-${crypto.randomUUID().slice(0, 8)}`,
    title: `Full-Featured ${primaryGap} Application Platform`,
    description: `Build a production-grade web application featuring authentication, state persistence, and responsive UI emphasizing ${primaryGap}.`,
    rationale: `Directly addresses your primary skill gap in ${primaryGap} to build resume-worthy hands-on proof of competence.`,
    difficulty: 'Intermediate',
    estimatedHours: '25 - 30 hrs',
    targetSkills: [primaryGap, 'REST API', 'Git']
  });

  // Project 2: Microservices / Full-stack project
  const secondaryGap = allGaps[1] || 'State Management';
  projects.push({
    id: `proj-${crypto.randomUUID().slice(0, 8)}`,
    title: `${roleTitle} Portfolio Capstone Project`,
    description: `Construct a scalable full-stack system incorporating automated testing, error logging, and API optimization tailored for ${roleTitle} roles.`,
    rationale: `Demonstrates end-to-end domain expertise for ${roleTitle} positions by combining ${secondaryGap} with system integration.`,
    difficulty: 'Advanced',
    estimatedHours: '40 - 50 hrs',
    targetSkills: [secondaryGap, 'Docker', 'PostgreSQL']
  });

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llmApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed;
}

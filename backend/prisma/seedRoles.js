import 'dotenv/config';
import prisma from '../src/config/database.js';
import crypto from 'crypto';

const CURATED_ROLES = [
  {
    title: 'Full Stack Web Developer',
    category: 'Software Engineering',
    isPopular: true,
    description: 'Builds end-to-end web applications using modern frontend frameworks, backend APIs, and databases.',
    requiredSkills: JSON.stringify([
      { name: 'JavaScript', proficiency: 'Advanced' },
      { name: 'TypeScript', proficiency: 'Intermediate' },
      { name: 'React', proficiency: 'Advanced' },
      { name: 'Node.js', proficiency: 'Advanced' },
      { name: 'Express', proficiency: 'Intermediate' },
      { name: 'PostgreSQL', proficiency: 'Intermediate' },
      { name: 'REST API', proficiency: 'Advanced' },
      { name: 'Git', proficiency: 'Intermediate' },
      { name: 'Docker', proficiency: 'Beginner' }
    ]),
    capstoneProjects: JSON.stringify([
      {
        id: 'fs-taskmanager',
        title: 'Full-Featured Task Management Platform',
        difficulty: 'Intermediate',
        description: 'A production-grade task/project management app with auth, real-time updates, and team collaboration features.',
        whyThisProject: 'Covers the core skills required for this role end-to-end: data modeling, API design, frontend state management, and deployment.',
        coreSkillsCovered: ['React', 'Node.js', 'PostgreSQL', 'REST API', 'Docker']
      },
      {
        id: 'fs-ecommerce',
        title: 'E-Commerce Marketplace with Payments',
        difficulty: 'Advanced',
        description: 'A comprehensive multi-vendor marketplace featuring shopping cart, Stripe payment integration, and order management.',
        whyThisProject: 'Demonstrates ability to handle complex state, third-party integrations, and robust database transactions.',
        coreSkillsCovered: ['React', 'Next.js', 'Express', 'PostgreSQL', 'Stripe API']
      }
    ])
  },
  {
    title: 'Frontend Engineer',
    category: 'Software Engineering',
    isPopular: true,
    description: 'Specializes in crafting UI/UX, client-side application logic, performance, and responsive design.',
    requiredSkills: JSON.stringify([
      { name: 'HTML', proficiency: 'Advanced' },
      { name: 'CSS', proficiency: 'Advanced' },
      { name: 'JavaScript', proficiency: 'Advanced' },
      { name: 'TypeScript', proficiency: 'Advanced' },
      { name: 'React', proficiency: 'Advanced' },
      { name: 'Next.js', proficiency: 'Intermediate' },
      { name: 'UI/UX', proficiency: 'Intermediate' },
      { name: 'REST API', proficiency: 'Intermediate' },
      { name: 'Figma', proficiency: 'Beginner' }
    ]),
    capstoneProjects: JSON.stringify([
      {
        id: 'fe-dashboard',
        title: 'Interactive Analytics Dashboard',
        difficulty: 'Intermediate',
        description: 'A responsive, high-performance data dashboard using charting libraries and complex state management.',
        whyThisProject: 'Shows mastery of UI/UX implementation, component lifecycle, and handling async data streams.',
        coreSkillsCovered: ['React', 'TypeScript', 'Tailwind CSS', 'Recharts', 'Redux/Zustand']
      }
    ])
  },
  {
    title: 'Backend Engineer',
    category: 'Software Engineering',
    isPopular: true,
    description: 'Designs server architectures, microservices, databases, authentication, and high-performance APIs.',
    requiredSkills: JSON.stringify([
      { name: 'Node.js', proficiency: 'Advanced' },
      { name: 'Python', proficiency: 'Intermediate' },
      { name: 'PostgreSQL', proficiency: 'Advanced' },
      { name: 'MongoDB', proficiency: 'Intermediate' },
      { name: 'Redis', proficiency: 'Intermediate' },
      { name: 'REST API', proficiency: 'Advanced' },
      { name: 'GraphQL', proficiency: 'Intermediate' },
      { name: 'Docker', proficiency: 'Intermediate' },
      { name: 'System Design', proficiency: 'Advanced' }
    ]),
    capstoneProjects: JSON.stringify([
      {
        id: 'be-microservices',
        title: 'Microservices E-Commerce Backend',
        difficulty: 'Advanced',
        description: 'A scalable backend architecture split into user, order, and product microservices communicating via message queues.',
        whyThisProject: 'Proves deep knowledge of distributed systems, message brokers, and robust API design.',
        coreSkillsCovered: ['Node.js', 'PostgreSQL', 'Redis', 'RabbitMQ/Kafka', 'Docker']
      }
    ])
  },
  {
    title: 'DevOps / SRE Engineer',
    category: 'Cloud & Infrastructure',
    isPopular: true,
    description: 'Automates CI/CD pipelines, manages cloud infrastructure, container orchestration, and system reliability.',
    requiredSkills: JSON.stringify([
      { name: 'Docker', proficiency: 'Advanced' },
      { name: 'Kubernetes', proficiency: 'Advanced' },
      { name: 'AWS', proficiency: 'Advanced' },
      { name: 'CI/CD', proficiency: 'Advanced' },
      { name: 'Terraform', proficiency: 'Intermediate' },
      { name: 'Linux', proficiency: 'Advanced' },
      { name: 'Python', proficiency: 'Intermediate' },
      { name: 'Jenkins', proficiency: 'Intermediate' },
      { name: 'Git', proficiency: 'Advanced' }
    ])
  },
  {
    title: 'Data Scientist',
    category: 'Data & AI',
    isPopular: true,
    description: 'Extracts actionable insights from complex datasets using statistical modeling, machine learning, and visualization.',
    requiredSkills: JSON.stringify([
      { name: 'Python', proficiency: 'Advanced' },
      { name: 'R', proficiency: 'Intermediate' },
      { name: 'Pandas', proficiency: 'Advanced' },
      { name: 'NumPy', proficiency: 'Advanced' },
      { name: 'Machine Learning', proficiency: 'Advanced' },
      { name: 'SQL', proficiency: 'Advanced' },
      { name: 'Tableau', proficiency: 'Intermediate' },
      { name: 'Data Visualization', proficiency: 'Advanced' }
    ])
  },
  {
    title: 'Machine Learning Engineer',
    category: 'Data & AI',
    isPopular: true,
    description: 'Deploys production-grade AI/ML models, deep learning networks, neural architectures, and data pipelines.',
    requiredSkills: JSON.stringify([
      { name: 'Python', proficiency: 'Advanced' },
      { name: 'PyTorch', proficiency: 'Advanced' },
      { name: 'TensorFlow', proficiency: 'Intermediate' },
      { name: 'Machine Learning', proficiency: 'Advanced' },
      { name: 'Deep Learning', proficiency: 'Advanced' },
      { name: 'NLP', proficiency: 'Intermediate' },
      { name: 'Docker', proficiency: 'Intermediate' },
      { name: 'REST API', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Mobile App Developer (React Native / Flutter)',
    category: 'Software Engineering',
    isPopular: true,
    description: 'Develops cross-platform or native mobile applications for iOS and Android devices.',
    requiredSkills: JSON.stringify([
      { name: 'JavaScript', proficiency: 'Advanced' },
      { name: 'TypeScript', proficiency: 'Intermediate' },
      { name: 'React Native', proficiency: 'Advanced' },
      { name: 'Flutter', proficiency: 'Intermediate' },
      { name: 'REST API', proficiency: 'Advanced' },
      { name: 'Git', proficiency: 'Intermediate' },
      { name: 'UI/UX', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'AI / Prompt Engineer',
    category: 'Data & AI',
    isPopular: true,
    description: 'Designs LLM prompt architectures, RAG pipelines, fine-tuning workflows, and generative AI agents.',
    requiredSkills: JSON.stringify([
      { name: 'Python', proficiency: 'Advanced' },
      { name: 'NLP', proficiency: 'Advanced' },
      { name: 'LangChain', proficiency: 'Advanced' },
      { name: 'REST API', proficiency: 'Advanced' },
      { name: 'Vector DBs', proficiency: 'Intermediate' },
      { name: 'Machine Learning', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Cloud Architect (AWS / Azure / GCP)',
    category: 'Cloud & Infrastructure',
    isPopular: false,
    description: 'Designs scalable, fault-tolerant cloud architecture blueprints for enterprise systems.',
    requiredSkills: JSON.stringify([
      { name: 'AWS', proficiency: 'Advanced' },
      { name: 'Azure', proficiency: 'Advanced' },
      { name: 'Docker', proficiency: 'Advanced' },
      { name: 'Kubernetes', proficiency: 'Advanced' },
      { name: 'Terraform', proficiency: 'Advanced' },
      { name: 'Linux', proficiency: 'Advanced' },
      { name: 'Microservices', proficiency: 'Advanced' }
    ])
  },
  {
    title: 'Cybersecurity Engineer',
    category: 'Security',
    isPopular: false,
    description: 'Protects application security posture, network infrastructure, identity management, and threat prevention.',
    requiredSkills: JSON.stringify([
      { name: 'Linux', proficiency: 'Advanced' },
      { name: 'Python', proficiency: 'Intermediate' },
      { name: 'Network Security', proficiency: 'Advanced' },
      { name: 'Cryptography', proficiency: 'Intermediate' },
      { name: 'Ethical Hacking', proficiency: 'Intermediate' },
      { name: 'CI/CD Security', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Data Engineer',
    category: 'Data & AI',
    isPopular: false,
    description: 'Builds robust ETL pipelines, data warehouses, streaming systems, and big data infrastructure.',
    requiredSkills: JSON.stringify([
      { name: 'Python', proficiency: 'Advanced' },
      { name: 'SQL', proficiency: 'Advanced' },
      { name: 'ETL', proficiency: 'Advanced' },
      { name: 'PostgreSQL', proficiency: 'Advanced' },
      { name: 'Big Data', proficiency: 'Intermediate' },
      { name: 'Docker', proficiency: 'Intermediate' },
      { name: 'AWS', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'QA Automation Engineer',
    category: 'Quality Assurance',
    isPopular: false,
    description: 'Writes automated end-to-end regression suites, API test fixtures, and integration checks.',
    requiredSkills: JSON.stringify([
      { name: 'Python', proficiency: 'Intermediate' },
      { name: 'JavaScript', proficiency: 'Intermediate' },
      { name: 'Selenium', proficiency: 'Advanced' },
      { name: 'Cypress', proficiency: 'Advanced' },
      { name: 'CI/CD', proficiency: 'Intermediate' },
      { name: 'Git', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'UI/UX Product Designer',
    category: 'Design & Product',
    isPopular: false,
    description: 'Designs intuitive user interfaces, wireframes, visual design systems, and user research workflows.',
    requiredSkills: JSON.stringify([
      { name: 'Figma', proficiency: 'Advanced' },
      { name: 'UI/UX', proficiency: 'Advanced' },
      { name: 'User Research', proficiency: 'Advanced' },
      { name: 'Wireframing', proficiency: 'Advanced' },
      { name: 'HTML', proficiency: 'Beginner' },
      { name: 'CSS', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Product Manager (Tech)',
    category: 'Design & Product',
    isPopular: false,
    description: 'Defines product roadmap strategy, feature specifications, user stories, and cross-functional leadership.',
    requiredSkills: JSON.stringify([
      { name: 'Agile', proficiency: 'Advanced' },
      { name: 'Scrum', proficiency: 'Advanced' },
      { name: 'JIRA', proficiency: 'Advanced' },
      { name: 'Product Strategy', proficiency: 'Advanced' },
      { name: 'Data Analysis', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Embedded Systems / IoT Engineer',
    category: 'Software Engineering',
    isPopular: false,
    description: 'Develops low-level firmware, microcontrollers, real-time operating systems, and IoT protocols.',
    requiredSkills: JSON.stringify([
      { name: 'C++', proficiency: 'Advanced' },
      { name: 'C#', proficiency: 'Intermediate' },
      { name: 'Linux', proficiency: 'Advanced' },
      { name: 'Microcontrollers', proficiency: 'Advanced' },
      { name: 'IoT Protocols', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Blockchain & Web3 Developer',
    category: 'Software Engineering',
    isPopular: false,
    description: 'Builds decentralized applications (dApps), smart contracts, token protocols, and blockchain integrations.',
    requiredSkills: JSON.stringify([
      { name: 'Solidity', proficiency: 'Advanced' },
      { name: 'Ethereum', proficiency: 'Advanced' },
      { name: 'Web3.js', proficiency: 'Intermediate' },
      { name: 'Rust', proficiency: 'Intermediate' },
      { name: 'Smart Contracts', proficiency: 'Advanced' },
      { name: 'Cryptography', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Game Developer (Unity / Unreal)',
    category: 'Software Engineering',
    isPopular: false,
    description: 'Engineers 2D/3D game mechanics, physics engines, shader graphics, and interactive real-time systems.',
    requiredSkills: JSON.stringify([
      { name: 'C++', proficiency: 'Advanced' },
      { name: 'C#', proficiency: 'Advanced' },
      { name: 'Unity', proficiency: 'Advanced' },
      { name: 'Unreal Engine', proficiency: 'Intermediate' },
      { name: '3D Math', proficiency: 'Intermediate' },
      { name: 'Physics', proficiency: 'Intermediate' }
    ])
  },
  {
    title: 'Data Analyst & BI Specialist',
    category: 'Data & AI',
    isPopular: false,
    description: 'Transforms raw business data into interactive dashboards, KPI reports, and statistical insights.',
    requiredSkills: JSON.stringify([
      { name: 'SQL', proficiency: 'Advanced' },
      { name: 'Python', proficiency: 'Intermediate' },
      { name: 'Tableau', proficiency: 'Advanced' },
      { name: 'Power BI', proficiency: 'Advanced' },
      { name: 'Data Visualization', proficiency: 'Advanced' },
      { name: 'Data Analysis', proficiency: 'Advanced' }
    ])
  },
  {
    title: 'Solutions Architect',
    category: 'Cloud & Infrastructure',
    isPopular: false,
    description: 'Constructs enterprise system blueprints, multi-cloud strategy, scalability models, and security compliance.',
    requiredSkills: JSON.stringify([
      { name: 'AWS', proficiency: 'Advanced' },
      { name: 'System Design', proficiency: 'Advanced' },
      { name: 'Microservices', proficiency: 'Advanced' },
      { name: 'Docker', proficiency: 'Intermediate' },
      { name: 'Kubernetes', proficiency: 'Intermediate' },
      { name: 'Security', proficiency: 'Intermediate' }
    ])
  }
];

async function seed() {
  console.log('Seeding curated roles dataset...');
  let seededCount = 0;

  for (const roleData of CURATED_ROLES) {
    const existing = await prisma.roleReference.findFirst({
      where: { title: roleData.title }
    });

    if (!existing) {
      await prisma.roleReference.create({
        data: {
          id: crypto.randomUUID(),
          ...roleData
        }
      });
      seededCount++;
    } else {
      await prisma.roleReference.update({
        where: { id: existing.id },
        data: roleData
      });
    }
  }

  console.log(`Seeding complete! Added/Updated ${CURATED_ROLES.length} curated target roles.`);
  process.exit(0);
}

seed().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
});

import { extractStructuredData } from '../../src/services/extractor.js';

describe('Resume Extractor', () => {
  it('should extract skills from raw text using fallback logic', async () => {
    const rawText = `
      John Doe
      I am a Software Engineer.
      Expert in Python, intermediate in JavaScript.
      React and Node.js developer.
    `;
    const result = await extractStructuredData(rawText);

    expect(result.skills).toBeDefined();
    
    // Convert extracted skills to a map for easy testing
    const skillMap = {};
    result.skills.forEach(s => skillMap[s.name.toLowerCase()] = s.proficiency);

    expect(skillMap['python']).toBe('Advanced');
    expect(skillMap['javascript']).toBe('Intermediate');
    expect(skillMap['react']).toBe('Beginner'); // Default if no proficiency keyword is found
    expect(skillMap['node.js']).toBe('Beginner');
  });

  it('should extract education using fallback logic', async () => {
    const rawText = `Education: B.Tech in Computer Science from IIT Delhi, 2024.`;
    const result = await extractStructuredData(rawText);
    
    expect(result.education).toBeDefined();
    expect(result.education.length).toBeGreaterThan(0);
    expect(result.education[0].degree.toLowerCase()).toContain('b.tech');
  });

  it('should extract experience using fallback logic', async () => {
    const rawText = `Experience: Software Developer Intern at Google for 6 months.`;
    const result = await extractStructuredData(rawText);
    
    expect(result.experience).toBeDefined();
    expect(result.experience.length).toBeGreaterThan(0);
    expect(result.experience[0].title.toLowerCase()).toContain('intern');
  });
});

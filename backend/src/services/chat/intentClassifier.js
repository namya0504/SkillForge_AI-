/**
 * Fast, lightweight intent classification router
 * Classifies query into: 'personal' | 'general' | 'hybrid'
 * Default is always 'personal' to ensure lowest latency and zero unnecessary search cost.
 */
export async function classifyIntent(message) {
  if (!message || typeof message !== 'string') {
    return 'personal';
  }

  const text = message.toLowerCase().trim();

  // Fast heuristic regex matching
  const hasPersonalKeywords = /\b(my|i|me|my skills|my roadmap|my progress|my role|why is|what should i|am i ready|my gap|my cert)\b/i.test(text);
  const hasExternalKeywords = /\b(latest|current|trends|2025|2026|salary|market|industry|news|exam fee|official syllabus|release date|today|newest)\b/i.test(text);

  if (hasPersonalKeywords && hasExternalKeywords) {
    return 'hybrid';
  }

  if (hasPersonalKeywords) {
    return 'personal';
  }

  if (hasExternalKeywords) {
    return 'general';
  }

  // If question is about external tools/certifications in general without personal pronouns
  if (/\b(what is|how does|compare|difference between|is it worth|cost of|prerequisites for)\b/i.test(text)) {
    return 'general';
  }

  // Safe default
  return 'personal';
}

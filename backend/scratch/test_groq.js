import { config } from '../src/config/env.js';

async function testGroq() {
  const modelsToTest = ['qwen/qwen3.6-27b', 'groq/compound', 'openai/gpt-oss-20b'];

  for (const model of modelsToTest) {
    console.log(`\nTesting Groq model: ${model}...`);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llmApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful JSON generator. Return ONLY valid JSON.' },
            { role: 'user', content: 'Return a JSON object with skills: ["React", "Python"]' }
          ]
        })
      });

      const data = await response.json();
      console.log(`Status ${response.status}:`, data.choices?.[0]?.message?.content || data);
      if (response.ok) {
        console.log(`SUCCESS with model: ${model}!`);
        return model;
      }
    } catch (err) {
      console.error(`Error testing ${model}:`, err.message);
    }
  }
}

testGroq();

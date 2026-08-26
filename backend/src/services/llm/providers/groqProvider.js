import { config } from '../../../config/env.js';

/**
 * Streaming completion via Groq (OpenAI-compatible SSE endpoint)
 */
export async function* streamCompletion({ systemPrompt, messages = [], maxTokens = 1000 }) {
  const apiKey = config.llmApiKey;
  if (!apiKey) {
    throw new Error('Groq API Key (LLM_API_KEY) is not configured.');
  }

  const model = 'llama-3.3-70b-versatile'; // Fast, highly capable reasoning model
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature: 0.4,
      stream: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') return;

      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            yield { type: 'chunk', text: delta };
          }
        } catch (e) {
          // Incomplete chunk, continue
        }
      }
    }
  }
}

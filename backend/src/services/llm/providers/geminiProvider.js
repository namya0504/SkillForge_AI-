import { config } from '../../../config/env.js';

/**
 * Streaming completion via Google Gemini with optional Google Search Grounding & citation extraction
 */
export async function* streamCompletion({ systemPrompt, messages = [], maxTokens = 1000, enableGrounding = false }) {
  const apiKey = config.geminiApiKey || config.llmApiKey;
  if (!apiKey) {
    throw new Error('Gemini API Key is not configured.');
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4
    }
  };

  // Add Google Search grounding if requested
  if (enableGrounding) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const collectedCitations = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const candidate = json.candidates?.[0];
        
        // Yield streamed text chunks
        const text = candidate?.content?.parts?.[0]?.text;
        if (text) {
          yield { type: 'chunk', text };
        }

        // Extract grounding metadata and source citations if present
        const groundingMetadata = candidate?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
          groundingMetadata.groundingChunks.forEach((chunk) => {
            if (chunk.web?.uri && !collectedCitations.some(c => c.url === chunk.web.uri)) {
              collectedCitations.push({
                title: chunk.web.title || 'Web Source',
                url: chunk.web.uri
              });
            }
          });
        }
      } catch (e) {
        // Continue buffering
      }
    }
  }

  if (collectedCitations.length > 0) {
    yield { type: 'citations', citations: collectedCitations };
  }
}

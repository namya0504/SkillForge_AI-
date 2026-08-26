import * as groq from './providers/groqProvider.js';
import * as gemini from './providers/geminiProvider.js';
import { config } from '../../config/env.js';

const providers = {
  groq,
  gemini
};

/**
 * Universal LLM Interface with streaming completion
 */
export const llm = {
  async *streamCompletion(options) {
    const selectedProvider = providers[config.llmProvider] || (config.geminiApiKey ? providers.gemini : providers.groq);
    
    // If grounding is enabled, prioritize Gemini since it supports Google Search Tool
    if (options.enableGrounding && config.geminiApiKey) {
      yield* gemini.streamCompletion(options);
      return;
    }

    try {
      yield* selectedProvider.streamCompletion(options);
    } catch (err) {
      console.warn(`[LLM Adapter] Primary provider (${config.llmProvider}) failed, attempting fallback:`, err.message);
      // Fallback between Groq & Gemini if one is unavailable
      if (selectedProvider === groq && config.geminiApiKey) {
        yield* gemini.streamCompletion(options);
      } else if (selectedProvider === gemini && config.llmApiKey) {
        yield* groq.streamCompletion(options);
      } else {
        throw err;
      }
    }
  }
};

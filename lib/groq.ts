// ============================================================================
// Nexus — Groq LLM Wrapper
// Centralized interface for Groq API calls with heavy/fast model routing
// ============================================================================

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function callLLM(
  prompt: string,
  model: 'heavy' | 'fast' = 'heavy',
  systemPrompt?: string
): Promise<string> {
  const modelId = model === 'heavy'
    ? (process.env.LLM_MODEL_HEAVY || 'llama-3.3-70b-versatile')
    : (process.env.LLM_MODEL_LIGHT || 'llama-3.1-8b-instant');
  const temperature = model === 'heavy'
    ? parseFloat(process.env.LLM_TEMPERATURE_HEAVY || '0.2')
    : parseFloat(process.env.LLM_TEMPERATURE_LIGHT || '0.5');

  const response = await groq.chat.completions.create({
    model: modelId,
    temperature,
    max_tokens: 1024,
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

export async function callLLMJSON<T>(
  prompt: string,
  model: 'heavy' | 'fast' = 'heavy',
  systemPrompt?: string
): Promise<T> {
  const raw = await callLLM(prompt, model, systemPrompt);
  // Strip markdown code blocks if present
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

/**
 * A small test call to verify the Groq API key works.
 */
export async function testGroqConnection(): Promise<boolean> {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Reply OK' }],
    });
    return !!res.choices[0]?.message?.content;
  } catch {
    return false;
  }
}

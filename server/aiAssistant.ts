import OpenAI from 'openai';
import type { Response } from 'express';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AiContext {
  currentSession: {
    id: string;
    date: string;
    focus: string;
    content: string | null;
    totalDistance: number | null;
  };
  squad: {
    id: string;
    name: string;
    swimmerCount: number;
    ageRange: string | null;
    averageAge: number | null;
  } | null;
  location: {
    name: string;
    poolLength: number;
  } | null;
  history: {
    recentSessionCount: number;
    averageDistance: number | null;
    commonFocuses: string[];
    recentSessions: Array<{
      date: string;
      focus: string;
      distance: number | null;
    }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Streaming response generator
export async function streamAssistantResponse(
  userMessage: string,
  context: AiContext,
  conversationHistory: ChatMessage[] = [],
  res: Response
): Promise<void> {
  const systemPrompt = buildSystemPrompt(context);
  
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    console.log('[AI Assistant] Starting streaming response...');
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-5',
      messages,
      max_completion_tokens: 1024,
      stream: true,
    });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullContent = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        // Send each chunk as SSE data
        res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ content: '', done: true, fullContent })}\n\n`);
    res.end();
    
    console.log('[AI Assistant] Streaming complete, total length:', fullContent.length);
  } catch (error) {
    console.error('[AI Assistant] Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate response', done: true })}\n\n`);
    res.end();
  }
}

// Non-streaming fallback
export async function generateAssistantResponse(
  userMessage: string,
  context: AiContext,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);
  
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages,
      max_completion_tokens: 1024,
    });

    return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
  } catch (error) {
    console.error('[AI Assistant] Error generating response:', error);
    throw error;
  }
}

function buildSystemPrompt(context: AiContext): string {
  const parts: string[] = [
    `You are an experienced swimming coach assistant helping to plan training sessions.`,
    `You provide practical, age-appropriate advice for swimming training.`,
    `Keep responses concise but helpful. Use bullet points and clear formatting.`,
    `When suggesting sets, always include distances in meters.`,
  ];

  if (context.squad) {
    parts.push(`\n## Current Squad Information`);
    parts.push(`- Squad: ${context.squad.name}`);
    parts.push(`- Number of swimmers: ${context.squad.swimmerCount}`);
    if (context.squad.ageRange) {
      parts.push(`- Age range: ${context.squad.ageRange} years old`);
    }
    if (context.squad.averageAge) {
      parts.push(`- Average age: ${context.squad.averageAge} years`);
    }
  }

  if (context.location) {
    parts.push(`\n## Pool Information`);
    parts.push(`- Pool: ${context.location.name}`);
    parts.push(`- Pool length: ${context.location.poolLength}m`);
  }

  parts.push(`\n## Current Session`);
  parts.push(`- Date: ${context.currentSession.date}`);
  parts.push(`- Focus: ${context.currentSession.focus}`);
  if (context.currentSession.totalDistance) {
    parts.push(`- Current distance: ${context.currentSession.totalDistance}m`);
  }
  if (context.currentSession.content) {
    parts.push(`\n### Current Session Content:`);
    parts.push(`\`\`\`\n${context.currentSession.content}\n\`\`\``);
  }

  if (context.history.recentSessionCount > 0) {
    parts.push(`\n## Squad Training History`);
    if (context.history.averageDistance) {
      parts.push(`- Average session distance: ${context.history.averageDistance}m`);
    }
    if (context.history.commonFocuses.length > 0) {
      parts.push(`- Common focus areas: ${context.history.commonFocuses.join(', ')}`);
    }
    if (context.history.recentSessions.length > 0) {
      parts.push(`- Recent sessions:`);
      context.history.recentSessions.forEach(s => {
        const dist = s.distance ? ` (${s.distance}m)` : '';
        parts.push(`  • ${s.date}: ${s.focus}${dist}`);
      });
    }
  }

  parts.push(`\n## Guidelines`);
  parts.push(`- Tailor suggestions to the swimmers' age and ability level`);
  parts.push(`- Consider the session focus when making recommendations`);
  parts.push(`- Base distance recommendations on the squad's typical session distances`);
  parts.push(`- When calculating distances, use ${context.location?.poolLength || 25}m pool lengths`);

  return parts.join('\n');
}

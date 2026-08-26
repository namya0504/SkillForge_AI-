import prisma from '../config/database.js';
import { buildUserContext, buildSystemPrompt } from '../services/chat/buildContext.js';
import { classifyIntent } from '../services/chat/intentClassifier.js';
import { llm } from '../services/llm/index.js';

/**
 * POST /api/v1/chat/sessions
 * Create a new chat session for user
 */
export const createSession = async (req, res) => {
  try {
    const { title } = req.body;
    const session = await prisma.chatSession.create({
      data: {
        userId: req.user.id,
        title: title || 'Career Mentorship Chat'
      }
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
};

/**
 * GET /api/v1/chat/sessions
 * List user's chat sessions
 */
export const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } }
      }
    });

    res.status(200).json({ sessions });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat sessions' });
  }
};

/**
 * GET /api/v1/chat/sessions/:id/messages
 * Get full message history for a session
 */
export const getSessionMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const formattedMessages = session.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      intent: m.intent,
      citations: m.citations ? JSON.parse(m.citations) : null,
      contextUsed: m.contextUsed ? JSON.parse(m.contextUsed) : null,
      createdAt: m.createdAt
    }));

    res.status(200).json({
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt
      },
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

/**
 * POST /api/v1/chat/sessions/:id/message
 * Send message and stream assistant response via Server-Sent Events (SSE)
 */
export const sendMessageStream = async (req, res) => {
  const { id: sessionId } = req.params;
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  // 1. Verify Session Ownership
  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      userId: req.user.id
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 8 // Keep past 8 messages for conversation continuity
      }
    }
  });

  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  // 2. Classify User Intent (Sub-300ms)
  const intent = await classifyIntent(message);

  // 3. Build Structured Profile Context
  const userContext = await buildUserContext(req.user.id);
  const systemPrompt = buildSystemPrompt(userContext, intent);

  // 4. Save User Message to Database
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'user',
      content: message.trim(),
      intent
    }
  });

  // Update session title dynamically if first message
  if (session.messages.length === 0) {
    const cleanTitle = message.slice(0, 32).trim() + (message.length > 32 ? '...' : '');
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: cleanTitle }
    });
  }

  // 5. Configure Server-Sent Events (SSE) headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx/Render)
  res.flushHeaders?.();

  // Send initial intent & context metadata
  res.write(`event: metadata\ndata: ${JSON.stringify({
    intent,
    contextUsed: {
      targetRole: userContext.targetRole,
      skillsCount: userContext.verifiedSkills.length,
      gapsCount: (userContext.gapAnalysis?.missingSkills?.length || 0) + (userContext.gapAnalysis?.levelGaps?.length || 0),
      milestonesCount: userContext.milestones.length,
      completedTasks: userContext.completedTopicsCount
    }
  })}\n\n`);

  let assistantResponseText = '';
  let responseCitations = null;

  try {
    const historyMessages = session.messages.reverse().map(m => ({
      role: m.role,
      content: m.content
    }));

    historyMessages.push({ role: 'user', content: message.trim() });

    // 6. Stream Completion from LLM Provider
    const stream = llm.streamCompletion({
      systemPrompt,
      messages: historyMessages,
      maxTokens: 1000,
      enableGrounding: intent === 'general' || intent === 'hybrid'
    });

    for await (const chunk of stream) {
      if (chunk.type === 'chunk') {
        assistantResponseText += chunk.text;
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
      } else if (chunk.type === 'citations') {
        responseCitations = chunk.citations;
        res.write(`event: citations\ndata: ${JSON.stringify({ citations: chunk.citations })}\n\n`);
      }
    }

    // 7. Persist Assistant Message to Database
    const savedAssistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantResponseText,
        intent,
        contextUsed: JSON.stringify(userContext),
        citations: responseCitations ? JSON.stringify(responseCitations) : null
      }
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    // 8. End SSE Stream
    res.write(`event: done\ndata: ${JSON.stringify({
      messageId: savedAssistantMsg.id,
      citations: responseCitations
    })}\n\n`);
    res.end();
  } catch (streamError) {
    console.error('Chat streaming error:', streamError);
    res.write(`event: error\ndata: ${JSON.stringify({ error: streamError.message || 'Error generating response.' })}\n\n`);
    res.end();
  }
};

/**
 * DELETE /api/v1/chat/sessions/:id
 * Delete a session and its message history
 */
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    await prisma.chatSession.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Delete chat session error:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
};

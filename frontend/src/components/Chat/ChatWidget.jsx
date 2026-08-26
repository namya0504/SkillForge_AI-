import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Sparkles, ChevronDown, ChevronUp, 
  ExternalLink, Plus, RefreshCw, Globe, Shield, User, Bot, AlertCircle 
} from 'lucide-react';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import './ChatWidget.css';

const STARTER_PROMPTS = [
  "What should I focus on this week based on my roadmap?",
  "Why are my current skill gaps the most important for my target role?",
  "How can I best prepare for technical interviews with my current skills?",
  "Is the recommended certification worth taking in 2026?"
];

export const ChatWidget = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingCitations, setStreamingCitations] = useState(null);
  const [streamingMetadata, setStreamingMetadata] = useState(null);
  const [expandedContextIndex, setExpandedContextIndex] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Load chat sessions when widget opens
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      loadSessions();
    }
  }, [isAuthenticated, isOpen]);

  const loadSessions = async () => {
    try {
      const res = await chatAPI.getSessions();
      setSessions(res.sessions || []);

      if (res.sessions && res.sessions.length > 0) {
        if (!currentSessionId) {
          selectSession(res.sessions[0].id);
        }
      } else {
        createNewSession();
      }
    } catch (err) {
      console.warn('Failed to load chat sessions:', err.message);
    }
  };

  const selectSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    setErrorMsg('');
    try {
      const res = await chatAPI.getSessionMessages(sessionId);
      setMessages(res.messages || []);
    } catch (err) {
      setErrorMsg('Failed to load message history.');
    }
  };

  const createNewSession = async () => {
    setErrorMsg('');
    try {
      const res = await chatAPI.createSession('New Mentorship Chat');
      if (res.session) {
        setSessions(prev => [res.session, ...prev]);
        setCurrentSessionId(res.session.id);
        setMessages([]);
      }
    } catch (err) {
      setErrorMsg('Failed to create new chat session.');
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text || !text.trim() || isStreaming) return;

    setErrorMsg('');
    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
      try {
        const res = await chatAPI.createSession('New Mentorship Chat');
        activeSessionId = res.session.id;
        setCurrentSessionId(activeSessionId);
        setSessions(prev => [res.session, ...prev]);
      } catch (err) {
        setErrorMsg('Failed to initialize session.');
        return;
      }
    }

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setStreamingText('');
    setStreamingCitations(null);
    setStreamingMetadata(null);

    let accumulatedText = '';
    let accumulatedCitations = null;

    await chatAPI.streamMessage(
      activeSessionId,
      text.trim(),
      (chunk) => {
        accumulatedText += chunk;
        setStreamingText(accumulatedText);
      },
      (citations) => {
        accumulatedCitations = citations;
        setStreamingCitations(citations);
      },
      (metadata) => {
        setStreamingMetadata(metadata);
      },
      (doneData) => {
        const assistantMessage = {
          id: doneData.messageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: accumulatedText,
          intent: streamingMetadata?.intent || 'personal',
          citations: accumulatedCitations || doneData.citations,
          contextUsed: streamingMetadata?.contextUsed,
          createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsStreaming(false);
        setStreamingText('');
        setStreamingCitations(null);
        setStreamingMetadata(null);
      },
      (err) => {
        setErrorMsg(err || 'Failed to generate response. Please try again.');
        setIsStreaming(false);
        setStreamingText('');
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="career-mentor-chat-wrapper">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button 
          className="chat-floating-btn flex-center gap-xs"
          onClick={() => setIsOpen(true)}
          title="Open AI Career Mentor Chat"
          aria-label="Open AI Career Mentor Chat"
        >
          <Sparkles size={20} className="sparkle-icon" />
          <span className="chat-btn-label">Career Mentor AI</span>
        </button>
      )}

      {/* Chat Drawer / Dialog */}
      {isOpen && (
        <div className="chat-window-card">
          {/* Header */}
          <div className="chat-header flex-between">
            <div className="flex-center gap-sm">
              <div className="mentor-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="mentor-title">AI Career Mentor</h3>
                <span className="mentor-status">Grounded in your profile</span>
              </div>
            </div>

            <div className="flex-center gap-xs">
              <button 
                className="chat-icon-btn"
                onClick={createNewSession}
                title="Start New Chat"
              >
                <Plus size={18} />
              </button>
              <button 
                className="chat-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="chat-error-banner flex-center gap-xs">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Messages Area */}
          <div className="chat-messages-container">
            {messages.length === 0 && !isStreaming && (
              <div className="chat-starter-container">
                <div className="starter-icon-badge">
                  <Bot size={28} />
                </div>
                <h4>How can I help your career today?</h4>
                <p>Ask anything about your verified skills, roadmap gaps, or certification goals:</p>

                <div className="starter-prompts-grid">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      className="starter-prompt-btn"
                      onClick={() => handleSendMessage(prompt)}
                    >
                      <span>💬 {prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isExpanded = expandedContextIndex === idx;

              return (
                <div key={msg.id || idx} className={`chat-message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
                  {!isUser && (
                    <div className="msg-avatar assistant-avatar">
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                    <div className="message-content">{msg.content}</div>

                    {/* Grounding Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="citations-box">
                        <div className="citations-header flex-center gap-xs">
                          <Globe size={13} />
                          <span>Sources & Citations:</span>
                        </div>
                        <div className="citations-list">
                          {msg.citations.map((c, cIdx) => (
                            <a 
                              key={cIdx} 
                              href={c.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="citation-pill"
                            >
                              [{cIdx + 1}] {c.title} <ExternalLink size={10} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transparency Chip ("Based on your data") */}
                    {!isUser && msg.contextUsed && (
                      <div className="transparency-chip-wrapper">
                        <button 
                          className="transparency-toggle-btn flex-center gap-xs"
                          onClick={() => setExpandedContextIndex(isExpanded ? null : idx)}
                        >
                          <Shield size={12} />
                          <span>Based on your profile data</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {isExpanded && (
                          <div className="transparency-details-card">
                            <p><strong>🎯 Goal Role:</strong> {msg.contextUsed.targetRole || 'Current goal'}</p>
                            {msg.contextUsed.verifiedSkills && (
                              <p><strong>✅ Injected Skills:</strong> {msg.contextUsed.verifiedSkills.slice(0, 6).join(', ')}</p>
                            )}
                            {msg.contextUsed.completedTopicsCount !== undefined && (
                              <p><strong>📈 Completed Milestones:</strong> {msg.contextUsed.completedTopicsCount} topics done</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Response Bubble */}
            {isStreaming && (
              <div className="chat-message-row assistant-row">
                <div className="msg-avatar assistant-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="message-bubble assistant-bubble streaming-bubble">
                  {streamingMetadata && (
                    <div className="streaming-status-badge flex-center gap-xs">
                      <RefreshCw size={12} className="spin-icon" />
                      <span>
                        {streamingMetadata.intent === 'general' || streamingMetadata.intent === 'hybrid'
                          ? 'Searching web & reasoning...'
                          : 'Analyzing with your career profile...'}
                      </span>
                    </div>
                  )}
                  <div className="message-content">{streamingText || 'Thinking...'}</div>

                  {streamingCitations && streamingCitations.length > 0 && (
                    <div className="citations-box">
                      <div className="citations-header flex-center gap-xs">
                        <Globe size={13} />
                        <span>Sources:</span>
                      </div>
                      <div className="citations-list">
                        {streamingCitations.map((c, cIdx) => (
                          <a key={cIdx} href={c.url} target="_blank" rel="noreferrer" className="citation-pill">
                            [{cIdx + 1}] {c.title} <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your Career Mentor..."
              disabled={isStreaming}
              className="chat-textarea"
            />
            <button 
              className="chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={isStreaming || !inputMessage.trim()}
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sparkles, X, Send, Copy, Check, Trash2, RotateCcw, GripHorizontal } from 'lucide-react';
import { cn } from './ui/utils';
import { Squad, SessionFocus } from '../types';
import { format } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionContext: {
    squad: Squad;
    sessionDate: Date;
    sessionDuration?: number;
    poolLength?: number;
    sessionFocus?: SessionFocus;
    currentContent?: string;
  };
  onInsertContent?: (content: string) => void;
}

export function AiChatPanel({
  isOpen,
  onClose,
  sessionId,
  sessionContext,
  onInsertContent,
}: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [mobileHeight, setMobileHeight] = useState(75); // percentage of viewport height
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChat = localStorage.getItem(`session-chat-${sessionId}`);
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        setMessages(parsed.messages || []);
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
  }, [sessionId]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `session-chat-${sessionId}`,
        JSON.stringify({
          sessionId,
          messages,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }, [messages, sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle drag for mobile resizing
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    
    const viewportHeight = window.innerHeight;
    const distanceFromBottom = viewportHeight - clientY;
    const percentage = (distanceFromBottom / viewportHeight) * 100;
    
    // Clamp between 25% and 85%
    const clampedPercentage = Math.min(Math.max(percentage, 25), 85);
    setMobileHeight(clampedPercentage);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleDragMove(e.touches[0].clientY);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e.clientY);
      }
    };

    const handleEnd = () => {
      handleDragEnd();
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (in production, this would call your AI API)
    setTimeout(() => {
      const aiResponse = generateMockResponse(inputValue, sessionContext);
      const assistantMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (content: string, index: number) => {
    // Try modern Clipboard API first, fallback to older method
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(content).then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }).catch(() => {
        fallbackCopy(content, index);
      });
    } else {
      fallbackCopy(content, index);
    }
  };

  const fallbackCopy = (content: string, index: number) => {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
    textArea.remove();
  };

  const handleClearChat = () => {
    if (confirm('Clear all chat history for this session?')) {
      setMessages([]);
      localStorage.removeItem(`session-chat-${sessionId}`);
    }
  };

  const handleStartFresh = () => {
    if (messages.length > 0) {
      if (confirm('Start a new conversation? Previous chat will be cleared.')) {
        handleClearChat();
      }
    }
  };

  const quickActions = [
    { label: 'Suggest warm-up', prompt: 'Suggest a warm-up set for this session' },
    { label: 'Main set ideas', prompt: 'Give me main set ideas based on the session focus' },
    { label: 'Add variety', prompt: 'How can I add variety to this session?' },
    { label: 'Calculate distance', prompt: 'Help me calculate the total distance' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop - semi-transparent so content is visible */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={cn(
          "bg-card border flex flex-col z-50 transition-all duration-300 shadow-2xl",
          // Mobile: bottom sheet style with dynamic height
          "fixed bottom-0 left-0 right-0",
          "rounded-t-2xl lg:rounded-none lg:border-l",
          "w-full lg:w-[400px]",
          // Desktop: positioned on right side from below tabs to bottom of viewport
          "lg:right-0 lg:left-auto lg:bottom-0 lg:top-[210px]",
          isOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"
        )}
        style={{
          height: window.innerWidth < 1024 ? `${mobileHeight}vh` : undefined,
        }}
      >
        {/* Drag handle for mobile - always visible */}
        <div
          onTouchStart={handleDragStart}
          onMouseDown={handleDragStart}
          className={cn(
            "lg:hidden flex justify-center items-center pt-2 pb-1 cursor-grab active:cursor-grabbing transition-colors",
            isDragging && "bg-muted/50"
          )}
        >
          <GripHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Header */}
        <div className="border-b p-3 lg:p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: '#4B9A4A' }} />
              <h3 className="font-semibold text-sm lg:text-base">Assistant</h3>
            </div>
            <div className="flex items-center gap-1 lg:gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  title="Clear chat"
                  className="h-7 w-7 lg:h-8 lg:w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 lg:h-8 lg:w-8 p-0"
              >
                <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </Button>
            </div>
          </div>
          
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartFresh}
                className="h-6 text-xs px-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Start fresh
              </Button>
            </div>
          )}

          {/* Session Context Summary */}
          <div className="mt-2 lg:mt-3 p-2 bg-muted/50 rounded text-xs space-y-0.5">
            <div><strong>{sessionContext.squad.name}</strong> • {sessionContext.squad.ageGroup}</div>
            <div className="text-muted-foreground">
              {format(sessionContext.sessionDate, 'EEE, MMM d')}
              {sessionContext.sessionFocus && ` • ${sessionContext.sessionFocus}`}
            </div>
          </div>
        </div>

        {/* Messages - with internal scroll */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center py-4 lg:py-8">
              <Sparkles className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-3 lg:mb-4 text-muted-foreground" />
              <h4 className="font-medium mb-2 text-sm lg:text-base">How can I help with this session?</h4>
              <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">
                Ask me for set ideas, distance calculations, or session structure advice.
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 mt-3 lg:mt-4">
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputValue(action.prompt);
                      inputRef.current?.focus();
                    }}
                    className="text-xs h-auto py-2 whitespace-normal"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-3 text-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.role === 'assistant' && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(message.content, idx)}
                        className="h-7 px-2 text-xs"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      {onInsertContent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsertContent(message.content)}
                          className="h-7 px-2 text-xs"
                          style={{ color: '#4B9A4A' }}
                        >
                          Insert
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-2">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input - always visible */}
        <div className="border-t p-3 lg:p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              style={{ backgroundColor: '#4B9A4A' }}
              className="text-white px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 hidden lg:block">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}

// Mock AI response generator (replace with actual API call)
function generateMockResponse(userInput: string, context: any): string {
  const input = userInput.toLowerCase();
  
  if (input.includes('warm') || input.includes('warm-up') || input.includes('warmup')) {
    return `Here's a warm-up suggestion for ${context.squad.name}:

Warm-up (400m):
• 200m FC easy (build every 50m)
• 4 x 50m on 1:00 (25m kick, 25m drill)
• 100m choice (focus on technique)

This gets the heart rate up gradually and prepares them for the main set.`;
  }
  
  if (input.includes('main set') || input.includes('main')) {
    return `For a ${context.sessionFocus || 'general'} focused session, try this main set:

Main Set (1600m):
• 8 x 200m FC on 3:00
  - Hold 80% effort throughout
  - Focus on consistent splits
  - Rest 15s between each

Adjust intervals based on your squad's pace.`;
  }
  
  if (input.includes('variety') || input.includes('mix')) {
    return `To add variety, consider:

• Mixed stroke ladder (50, 100, 150, 200, 150, 100, 50)
• Equipment rotation (fins → paddles → snorkel → swim)
• Partner relay sets
• Timed challenges vs distance repeats
• IM order changes

This keeps swimmers engaged and challenges different energy systems.`;
  }
  
  if (input.includes('distance') || input.includes('calculate')) {
    return `I can help calculate distances! 

Current format examples:
• 4 x 200m = 800m
• 8 x 50m = 400m

Share your set structure and I'll calculate the total distance for you.`;
  }
  
  // Default response
  return `I understand you're asking about: "${userInput}"

For ${context.squad.name} (${context.squad.ageGroup}), I recommend considering:
• Session focus: ${context.sessionFocus || 'General training'}
• Age-appropriate distances and intervals
• Progressive difficulty throughout the session
• Recovery time between sets

Would you like me to suggest specific sets or help with session structure?`;
}
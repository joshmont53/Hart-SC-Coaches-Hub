import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Squad, SessionFocus } from '@/lib/typeAdapters';
import { format } from 'date-fns';

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
}: AiChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Chat Panel - Desktop only for Phase 1 */}
      <div
        ref={panelRef}
        className={cn(
          "bg-card border flex flex-col z-50 transition-all duration-300 shadow-2xl",
          "fixed bottom-0 right-0 w-[400px]",
          "rounded-none border-l",
          "top-[210px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        data-testid="panel-ai-assistant"
      >
        {/* Header */}
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: '#4B9A4A' }} />
              <h3 className="font-semibold text-base">Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                data-testid="button-close-assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Session Context Summary */}
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs space-y-0.5">
            <div><strong>{sessionContext.squad?.name || 'Squad'}</strong></div>
            <div className="text-muted-foreground">
              {sessionContext.sessionDate ? format(new Date(sessionContext.sessionDate), 'EEE, MMM d') : 'Date'}
              {sessionContext.sessionFocus && ` • ${sessionContext.sessionFocus}`}
            </div>
          </div>
        </div>

        {/* Messages placeholder - Phase 1 shell */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="font-medium mb-2 text-base">How can I help with this session?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Ask me for set ideas, distance calculations, or session structure advice.
            </p>
            <p className="text-xs text-muted-foreground italic">
              (Full chat functionality coming in later phases)
            </p>
          </div>
        </div>

        {/* Input placeholder - Phase 1 shell */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 h-9 bg-muted/50 rounded-md flex items-center px-3 text-sm text-muted-foreground">
              Ask me anything...
            </div>
            <Button
              disabled
              size="sm"
              style={{ backgroundColor: '#4B9A4A' }}
              className="text-white px-3 opacity-50"
              data-testid="button-send-message"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

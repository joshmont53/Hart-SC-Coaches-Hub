import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X, GripHorizontal } from 'lucide-react';
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
  const [mobileHeight, setMobileHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    
    const viewportHeight = window.innerHeight;
    const distanceFromBottom = viewportHeight - clientY;
    const percentage = (distanceFromBottom / viewportHeight) * 100;
    
    const clampedPercentage = Math.min(Math.max(percentage, 40), 85);
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
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
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

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop - semi-transparent so content is visible */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
        data-testid="backdrop-ai-assistant"
      />

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={cn(
          "bg-card border flex flex-col z-50 transition-all duration-300 shadow-2xl",
          "fixed bottom-0 left-0 right-0",
          "rounded-t-2xl lg:rounded-none lg:border-l",
          "w-full lg:w-[400px]",
          "lg:right-0 lg:left-auto lg:bottom-0 lg:top-[210px]",
          isOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"
        )}
        style={{
          height: typeof window !== 'undefined' && window.innerWidth < 1024 ? `${mobileHeight}vh` : undefined,
        }}
        data-testid="panel-ai-assistant"
      >
        {/* Drag handle for mobile - always visible */}
        <div
          onTouchStart={handleDragStart}
          onMouseDown={handleDragStart}
          className={cn(
            "lg:hidden flex justify-center items-center pt-2 pb-1 cursor-grab active:cursor-grabbing transition-colors",
            isDragging && "bg-muted/50"
          )}
          data-testid="drag-handle-assistant"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 lg:h-8 lg:w-8 p-0"
                data-testid="button-close-assistant"
              >
                <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </Button>
            </div>
          </div>

          {/* Session Context Summary */}
          <div className="mt-2 lg:mt-3 p-2 bg-muted/50 rounded text-xs space-y-0.5">
            <div><strong>{sessionContext.squad?.name || 'Squad'}</strong></div>
            <div className="text-muted-foreground">
              {sessionContext.sessionDate ? format(new Date(sessionContext.sessionDate), 'EEE, MMM d') : 'Date'}
              {sessionContext.sessionFocus && ` • ${sessionContext.sessionFocus}`}
            </div>
          </div>
        </div>

        {/* Messages placeholder */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0">
          <div className="text-center py-4 lg:py-8">
            <Sparkles className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-3 lg:mb-4 text-muted-foreground" />
            <h4 className="font-medium mb-2 text-sm lg:text-base">How can I help with this session?</h4>
            <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">
              Ask me for set ideas, distance calculations, or session structure advice.
            </p>
            <p className="text-xs text-muted-foreground italic">
              (Full chat functionality coming in later phases)
            </p>
          </div>
        </div>

        {/* Input placeholder */}
        <div className="border-t p-3 lg:p-4 flex-shrink-0">
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
          <p className="text-xs text-muted-foreground mt-2 hidden lg:block">
            Press Enter to send
          </p>
        </div>
      </div>
    </>
  );
}

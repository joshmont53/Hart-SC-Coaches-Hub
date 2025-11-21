import { useState } from 'react';
import { Drill } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ChevronDown, ChevronUp, Play, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './ui/utils';

interface DrillsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detectedDrills: Drill[];
}

export function DrillsSidebar({ open, onOpenChange, detectedDrills }: DrillsSidebarProps) {
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);

  const getStrokeBadgeColor = (strokeType: string) => {
    const colors: Record<string, string> = {
      'Freestyle': 'bg-blue-500',
      'Backstroke': 'bg-purple-500',
      'Breaststroke': 'bg-green-500',
      'Butterfly': 'bg-orange-500',
      'Starts': 'bg-red-500',
      'Turns': 'bg-teal-500',
    };
    return colors[strokeType] || 'bg-gray-500';
  };

  const toggleDrill = (drillId: string) => {
    setExpandedDrillId(expandedDrillId === drillId ? null : drillId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[30rem] sm:max-w-[30rem] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Session Drills
          </SheetTitle>
          <SheetDescription>
            {detectedDrills.length} drill{detectedDrills.length !== 1 ? 's' : ''} detected in this session
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {detectedDrills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-muted-foreground mb-2">No drills detected</h3>
              <p className="text-sm text-muted-foreground">
                Drills will be automatically detected when you save the session content
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {detectedDrills.map((drill) => (
                <motion.div
                  key={drill.id}
                  layout
                  className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => toggleDrill(drill.id)}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="truncate">{drill.name}</h4>
                          {drill.videoUrl && (
                            <Play className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <Badge className={`${getStrokeBadgeColor(drill.strokeType)} text-white text-xs`}>
                          {drill.strokeType}
                        </Badge>
                      </div>
                      <div className="flex-shrink-0">
                        {expandedDrillId === drill.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedDrillId === drill.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 space-y-4">
                          {drill.description && (
                            <div>
                              <p className="text-sm text-muted-foreground">{drill.description}</p>
                            </div>
                          )}

                          {drill.videoUrl && (
                            <div>
                              <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="aspect-video bg-black rounded-lg overflow-hidden"
                              >
                                {drill.videoUrl.startsWith('blob:') || drill.videoUrl.includes('/uploads/') ? (
                                  <video
                                    src={drill.videoUrl}
                                    className="w-full h-full"
                                    controls
                                    title={drill.name}
                                  />
                                ) : (
                                  <iframe
                                    src={drill.videoUrl}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title={drill.name}
                                    loading="lazy"
                                  />
                                )}
                              </motion.div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

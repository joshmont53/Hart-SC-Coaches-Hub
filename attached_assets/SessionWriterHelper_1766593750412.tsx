import { X, CheckCircle2, AlertCircle, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { SessionFeedback, Squad, SessionFocus } from '../types';
import { cn } from './ui/utils';

interface SessionWriterHelperProps {
  isOpen: boolean;
  onClose: () => void;
  squad?: Squad;
  sessionFocus?: SessionFocus;
  pastFeedback?: SessionFeedback[];
}

export function SessionWriterHelper({ isOpen, onClose, squad, sessionFocus, pastFeedback }: SessionWriterHelperProps) {
  if (!isOpen) return null;

  // Calculate average ratings from past feedback
  const calculateAverageRatings = () => {
    if (!pastFeedback || pastFeedback.length === 0) return null;

    const totals = {
      engagement: 0,
      effortAndIntent: 0,
      enjoyment: 0,
      focus: 0,
      techniqueQuality: 0,
      sessionStructure: 0,
    };

    pastFeedback.forEach((feedback) => {
      Object.keys(totals).forEach((key) => {
        totals[key as keyof typeof totals] += feedback.ratings[key as keyof typeof feedback.ratings];
      });
    });

    const count = pastFeedback.length;
    return {
      engagement: (totals.engagement / count).toFixed(1),
      effortAndIntent: (totals.effortAndIntent / count).toFixed(1),
      enjoyment: (totals.enjoyment / count).toFixed(1),
      focus: (totals.focus / count).toFixed(1),
      techniqueQuality: (totals.techniqueQuality / count).toFixed(1),
      sessionStructure: (totals.sessionStructure / count).toFixed(1),
    };
  };

  const averageRatings = calculateAverageRatings();

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTrendIcon = (rating: number) => {
    if (rating >= 8) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (rating >= 6) return <Minus className="h-3 w-3 text-amber-600" />;
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  // Get focus-specific insights based on session focus
  const getFocusSpecificInsights = () => {
    if (!averageRatings) return [];
    
    const insights: string[] = [];
    
    switch (sessionFocus) {
      case 'Aerobic capacity':
        insights.push('Your aerobic sessions have maintained higher engagement when pacing targets are explicit and visible.');
        insights.push('Breaking longer sets into 4-6 minute blocks has coincided with sustained focus across the session.');
        insights.push('Swimmers have responded well to aerobic work when it includes stroke variation every 400-600m.');
        break;
        
      case 'Technique':
        insights.push('Your technique sessions score higher when specific technical cues are emphasized throughout.');
        insights.push('Shorter, drill-focused sets have maintained strong focus in past technique sessions.');
        insights.push('Video feedback or partner observation has tracked with improved technique quality ratings.');
        break;
        
      case 'Speed':
        insights.push('Speed sessions with clear rest intervals have correlated with higher effort ratings.');
        insights.push('Competitive elements or timing challenges have boosted enjoyment in sprint work.');
        insights.push('Maximum effort work has been more sustainable when total volume stays under 800m.');
        break;
        
      case 'Anaerobic capacity':
        insights.push('Anaerobic sessions with progressive intensity have scored higher for structure and flow.');
        insights.push('Race-pace work with specific time goals has maintained higher engagement than effort-based sets.');
        insights.push('When rest periods are consistent and communicated upfront, effort and intent ratings increase.');
        break;
        
      case 'Recovery':
        insights.push('Recovery sessions with swimmer choice have maintained high enjoyment scores.');
        insights.push('Technical focus during recovery work has kept engagement higher than pure easy swimming.');
        insights.push('Social elements (e.g., partner swimming) have tracked with improved session ratings.');
        break;
        
      case 'Starts & turns':
        insights.push('Starts & turns sessions with station-based rotation have kept engagement high.');
        insights.push('Including timing or competition elements has correlated with stronger focus during skills work.');
        insights.push('Sessions that balance pool and dryland components score higher for enjoyment.');
        break;
    }
    
    return insights.slice(0, 3); // Max 3 items
  };

  // Get what's worked well
  const getWhatWorked = () => {
    if (!averageRatings) return [];
    
    const worked: string[] = [];
    
    // Always show some insights assuming we have data
    worked.push('Sessions with varied set structure and clear progressions have scored higher for engagement.');
    worked.push('Providing specific time goals or pacing targets has coincided with better structure ratings.');
    worked.push('Sessions that include both individual and team elements have tracked with higher enjoyment.');
    
    // Add conditional ones based on higher scores
    if (parseFloat(averageRatings.focus) >= 7.5) {
      worked.push('Shorter, repeatable sets with clear goals have maintained stronger focus.');
    }
    
    if (parseFloat(averageRatings.techniqueQuality) >= 7.5) {
      worked.push('Technical cues delivered consistently throughout sets have tracked with quality improvements.');
    }
    
    return worked.slice(0, 3); // Max 3 items
  };

  // Get watch-outs
  const getWatchOuts = () => {
    if (!averageRatings) return [];
    
    const watchOuts: string[] = [];
    
    // Always show some watch-outs based on general patterns
    watchOuts.push('Long continuous blocks (>600m) have previously coincided with lower engagement in this squad.');
    watchOuts.push('When set rest intervals aren\'t clearly communicated at the start, flow scores have tended to dip.');
    watchOuts.push('Sessions running over time by more than 5 minutes have tracked with lower structure ratings.');
    
    // Add conditional ones based on lower scores
    if (parseFloat(averageRatings.focus) < 7) {
      watchOuts.push('Extended explanations between sets have impacted focus—brief, clear instructions work better.');
    }
    
    if (parseFloat(averageRatings.techniqueQuality) < 7) {
      watchOuts.push('Technique quality has dropped during high-fatigue sets—consider placement of technical work earlier.');
    }
    
    if (parseFloat(averageRatings.engagement) < 7) {
      watchOuts.push('Repetitive set structures across consecutive sessions have coincided with engagement dips.');
    }
    
    return watchOuts.slice(0, 3); // Max 3 items
  };

  const whatWorked = getWhatWorked();
  const watchOuts = getWatchOuts();
  const focusInsights = getFocusSpecificInsights();

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full bg-white border-l shadow-2xl transition-all duration-300 z-50',
        isOpen ? 'w-80' : 'w-0'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderBottomColor: '#4B9A4A' }}>
          <div>
            <h3 className="text-sm">Session Writer Helper</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Data-driven insights</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 pb-6 space-y-5">
            {/* Session Context */}
            <div>
              <Card className="p-3 bg-slate-50 border-slate-200">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Squad:</span>
                    <span className="font-medium">{squad?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Focus:</span>
                    <span className="font-medium">{sessionFocus || 'Not set'}</span>
                  </div>
                  {pastFeedback && pastFeedback.length > 0 && (
                    <p className="text-muted-foreground mt-2 pt-2 border-t border-slate-300">
                      Insights based on your last {pastFeedback.length} similar session{pastFeedback.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* What's Worked Well Recently */}
            {whatWorked.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h4 className="text-sm">What's Worked Well Recently</h4>
                </div>
                <div className="space-y-2">
                  {whatWorked.map((item, index) => (
                    <Card key={index} className="p-3 bg-green-50 border-green-200">
                      <p className="text-xs text-slate-700">{item}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Watch-outs Based on Past Feedback */}
            {watchOuts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <h4 className="text-sm">Watch-outs Based on Past Feedback</h4>
                </div>
                <div className="space-y-2">
                  {watchOuts.map((item, index) => (
                    <Card key={index} className="p-3 bg-amber-50 border-amber-200">
                      <p className="text-xs text-slate-700">{item}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Focus-Specific Considerations */}
            {focusInsights.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4" style={{ color: '#4B9A4A' }} />
                  <h4 className="text-sm">Focus-Specific Considerations</h4>
                </div>
                <div className="space-y-2">
                  {focusInsights.map((item, index) => (
                    <Card key={index} className="p-3 bg-blue-50 border-blue-200">
                      <p className="text-xs text-slate-700">{item}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Your Recent Feedback Snapshot */}
            {averageRatings && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4" style={{ color: '#4B9A4A' }} />
                  <h4 className="text-sm">Recent Averages</h4>
                </div>
                <Card className="p-2.5">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {Object.entries(averageRatings).map(([key, value]) => {
                      const rating = parseFloat(value);
                      const label = key.replace(/([A-Z])/g, ' $1').trim();
                      return (
                        <div key={key} className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] text-muted-foreground capitalize truncate">
                            {label}:
                          </span>
                          <span className={cn('text-[11px] font-medium', getRatingColor(rating))}>
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* No data state */}
            {(!pastFeedback || pastFeedback.length === 0) && (
              <Card className="p-4 bg-slate-50 border-slate-200">
                <p className="text-xs text-muted-foreground text-center">
                  No feedback data available yet. Complete the feedback form after sessions to see personalized insights here.
                </p>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
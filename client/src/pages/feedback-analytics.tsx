import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    overallAverage: number;
    totalFeedbackCount: number;
    categoryAverages: Record<string, number>;
    trend: number | null;
    trendPeriod: string;
  };
  chartData: Array<{
    weekStart: string;
    weekEnd: string;
    average: number | null;
    count: number;
  }>;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    significance: number;
    direction: 'positive' | 'negative' | 'neutral';
    category?: string;
  }>;
  filters: {
    squadId: string | null;
    coachId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  meta: {
    squads: Array<{ id: string; name: string }>;
    coaches: Array<{ id: string; name: string }>;
  };
}

interface DrillDownDialog {
  open: boolean;
  pattern: AnalyticsData['patterns'][0] | null;
}

interface FeedbackAnalyticsProps {
  onBack: () => void;
}

const categoryLabels: Record<string, string> = {
  engagement: 'Engagement',
  effortAndIntent: 'Effort & Intent',
  enjoyment: 'Enjoyment',
  sessionClarity: 'Session Clarity',
  appropriatenessOfChallenge: 'Challenge Level',
  sessionFlow: 'Session Flow',
};

export function FeedbackAnalytics({ onBack }: FeedbackAnalyticsProps) {
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [drillDownDialog, setDrillDownDialog] = useState<DrillDownDialog>({ open: false, pattern: null });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (squadFilter && squadFilter !== 'all') params.append('squadId', squadFilter);
    if (coachFilter && coachFilter !== 'all') params.append('coachId', coachFilter);
    return params.toString();
  };

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/feedback/analytics', squadFilter, coachFilter],
    queryFn: async () => {
      const queryString = buildQueryString();
      const url = `/api/feedback/analytics${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  const getTrendIcon = (rating: number) => {
    if (rating >= 8) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rating >= 6.5) return <Minus className="h-4 w-4 text-amber-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPatternBgColor = (direction: 'positive' | 'negative' | 'neutral') => {
    if (direction === 'positive') return 'bg-green-50 dark:bg-green-950/30';
    if (direction === 'negative') return 'bg-amber-50 dark:bg-amber-950/30';
    return 'bg-blue-50 dark:bg-blue-950/30';
  };

  const getPatternIconColor = (direction: 'positive' | 'negative' | 'neutral') => {
    if (direction === 'positive') return 'text-green-600';
    if (direction === 'negative') return 'text-amber-600';
    return 'text-blue-600';
  };

  const getPatternBadgeStyle = (direction: 'positive' | 'negative' | 'neutral') => {
    if (direction === 'positive') return 'text-green-600 bg-green-50 dark:bg-green-950/50';
    if (direction === 'negative') return 'text-amber-600 bg-amber-50 dark:bg-amber-950/50';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-950/50';
  };

  const getSelectedSquadName = () => {
    if (squadFilter === 'all' || !analytics) return null;
    return analytics.meta.squads.find(s => s.id === squadFilter)?.name;
  };

  const getSelectedCoachName = () => {
    if (coachFilter === 'all' || !analytics) return null;
    return analytics.meta.coaches.find(c => c.id === coachFilter)?.name;
  };

  const handlePatternClick = (pattern: AnalyticsData['patterns'][0]) => {
    setDrillDownDialog({ open: true, pattern });
  };

  const getDrillDownData = (patternType: string) => {
    switch (patternType) {
      case 'strength':
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {}).map(([key, value]) => ({
            name: categoryLabels[key] || key,
            rating: value,
          })),
          insights: [
            'This category consistently scores above average',
            'Swimmers respond well to this aspect of sessions',
            'Consider leveraging this strength in other areas',
          ],
        };
      case 'improvement':
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {}).map(([key, value]) => ({
            name: categoryLabels[key] || key,
            rating: value,
          })),
          insights: [
            'This category has room for improvement',
            'Consider specific techniques to enhance this area',
            'Small improvements here could boost overall satisfaction',
          ],
        };
      case 'duration':
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {}).map(([key, value]) => ({
            name: categoryLabels[key] || key,
            rating: value,
          })),
          insights: [
            'Session duration affects engagement and focus',
            'Consider experimenting with different session lengths',
            'Monitor how swimmers respond to varying durations',
          ],
        };
      case 'squad':
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {}).map(([key, value]) => ({
            name: categoryLabels[key] || key,
            rating: value,
          })),
          insights: [
            'Feedback varies by squad characteristics',
            'Consider squad-specific session adjustments',
            'Age groups may respond differently to training styles',
          ],
        };
      case 'trend':
        return {
          chartData: analytics?.chartData.slice(-6).map(week => ({
            name: new Date(week.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            rating: week.average || 0,
          })) || [],
          insights: [
            'Recent sessions show this trend direction',
            'Monitor upcoming sessions for continued patterns',
            'Consider what changed during this period',
          ],
        };
      default:
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {}).map(([key, value]) => ({
            name: categoryLabels[key] || key,
            rating: value,
          })),
          insights: ['Pattern analysis showing category breakdown'],
        };
    }
  };

  const getBarColor = (rating: number) => {
    if (rating >= 8) return '#16a34a';
    if (rating >= 6.5) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-analytics">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-analytics-title">Feedback Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover patterns and insights from session feedback
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="mb-4 shrink-0">
        {/* Collapsed View */}
        {!filtersExpanded && (
          <button 
            onClick={() => setFiltersExpanded(true)}
            className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
            data-testid="button-expand-filters"
          >
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="text-muted-foreground">Filters:</span>
              <span className="px-2 py-0.5 bg-muted rounded text-xs">
                All Sessions
              </span>
              {getSelectedSquadName() && (
                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                  {getSelectedSquadName()}
                </span>
              )}
              {getSelectedCoachName() && (
                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                  {getSelectedCoachName()}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                ({analytics?.overview.totalFeedbackCount ?? 0} entries)
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Expanded View */}
        {filtersExpanded && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Filters</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFiltersExpanded(false)}
                data-testid="button-collapse-filters"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Squad Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Squad (optional)</Label>
                <Select value={squadFilter} onValueChange={setSquadFilter}>
                  <SelectTrigger data-testid="select-squad-filter">
                    <SelectValue placeholder="All squads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All squads</SelectItem>
                    {analytics?.meta.squads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coach Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Coach (optional)</Label>
                <Select value={coachFilter} onValueChange={setCoachFilter}>
                  <SelectTrigger data-testid="select-coach-filter">
                    <SelectValue placeholder="All coaches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All coaches</SelectItem>
                    {analytics?.meta.coaches.map(coach => (
                      <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Viewing {analytics?.overview.totalFeedbackCount ?? 0} feedback entr{(analytics?.overview.totalFeedbackCount ?? 0) === 1 ? 'y' : 'ies'}
            </div>
          </div>
        )}
      </Card>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {isLoading ? (
          <div className="space-y-6">
            <div>
              <Skeleton className="h-5 w-36 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="p-3">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : analytics && analytics.overview.totalFeedbackCount > 0 ? (
          <>
            {/* Feedback Overview - 6 Category Cards */}
            <div>
              <h2 className="text-sm font-medium mb-4">Feedback Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(analytics.overview.categoryAverages).map(([key, value]) => {
                  const rating = typeof value === 'number' ? value : 0;
                  return (
                    <Card key={key} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-muted-foreground capitalize leading-tight">
                          {categoryLabels[key] || key}
                        </span>
                        {getTrendIcon(rating)}
                      </div>
                      <div className={cn('text-2xl font-bold', getRatingColor(rating))} data-testid={`text-category-${key}`}>
                        {rating.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">out of 10</div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Pattern Explorer - Insight Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Pattern Explorer</h2>
                <span className="text-xs text-muted-foreground">What influences session quality?</span>
              </div>
              {analytics.patterns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics.patterns.map((pattern, index) => (
                    <Card 
                      key={index} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePatternClick(pattern)}
                      data-testid={`card-insight-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg shrink-0", getPatternBgColor(pattern.direction))}>
                          <Info className={cn("h-4 w-4", getPatternIconColor(pattern.direction))} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-medium mb-1.5">{pattern.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {pattern.description}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            {pattern.category && (
                              <span className={cn("text-[10px] px-2 py-0.5 rounded", getPatternBadgeStyle(pattern.direction))}>
                                {pattern.category}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              View breakdown →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    More data needed to generate insights. Keep collecting feedback!
                  </p>
                </Card>
              )}
            </div>

            {/* Weekly Performance Chart */}
            <div>
              <h2 className="text-sm font-medium mb-4">Weekly Performance</h2>
              <Card className="p-4">
                <div className="h-[200px] flex items-end gap-2">
                  {analytics.chartData.map((week, index) => {
                    const maxHeight = 160;
                    const barHeight = week.average !== null ? (week.average / 10) * maxHeight : 0;
                    const weekLabel = new Date(week.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    
                    const getBarColorClass = (avg: number | null) => {
                      if (avg === null) return 'bg-muted';
                      if (avg >= 8) return 'bg-green-500';
                      if (avg >= 6.5) return 'bg-amber-500';
                      return 'bg-red-500';
                    };
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: maxHeight }}>
                          {week.average !== null ? (
                            <>
                              <span className="text-xs font-medium mb-1">{week.average.toFixed(1)}</span>
                              <div 
                                className={cn("w-full rounded-t transition-all", getBarColorClass(week.average))}
                                style={{ height: barHeight }}
                                data-testid={`bar-week-${index}`}
                              />
                            </>
                          ) : (
                            <div className="w-full h-8 rounded-t bg-muted flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">-</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{weekLabel}</span>
                        <span className="text-xs text-muted-foreground">({week.count})</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Feedback Data Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No feedback data available for the selected filters.
              <br />
              <span className="text-xs mt-2 block">
                Insights will appear as more feedback is collected.
              </span>
            </p>
          </Card>
        )}
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={drillDownDialog.open} onOpenChange={(open) => setDrillDownDialog({ ...drillDownDialog, open })}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-base">{drillDownDialog.pattern?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              Detailed breakdown and supporting data
            </DialogDescription>
          </DialogHeader>
          
          {drillDownDialog.pattern && (() => {
            const drillData = getDrillDownData(drillDownDialog.pattern.type);
            
            return (
              <div className="space-y-4 w-full">
                {/* Pattern Description */}
                <Card className={cn("p-3 border", getPatternBgColor(drillDownDialog.pattern.direction))}>
                  <div className="flex items-start gap-2">
                    <div className={cn("p-1.5 rounded-lg shrink-0", getPatternBgColor(drillDownDialog.pattern.direction))}>
                      <Info className={cn("h-3.5 w-3.5", getPatternIconColor(drillDownDialog.pattern.direction))} />
                    </div>
                    <p className="text-xs leading-relaxed">{drillDownDialog.pattern.description}</p>
                  </div>
                </Card>

                {/* Chart Visualization */}
                {drillData.chartData.length > 0 && (
                  <div className="w-full">
                    <h3 className="text-xs font-medium mb-2">Distribution Analysis</h3>
                    <Card className="p-3 w-full">
                      <div className="h-[160px] flex items-end gap-1 w-full">
                        {drillData.chartData.map((item, index) => {
                          const maxHeight = 120;
                          const barHeight = (item.rating / 10) * maxHeight;
                          
                          return (
                            <div key={index} className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                              <div className="w-full flex flex-col items-center justify-end" style={{ height: maxHeight }}>
                                <span className={cn("text-[10px] font-medium mb-0.5", getRatingColor(item.rating))}>
                                  {item.rating.toFixed(1)}
                                </span>
                                <div 
                                  className="w-full max-w-[40px] mx-auto rounded-t transition-all"
                                  style={{ 
                                    height: barHeight,
                                    backgroundColor: getBarColor(item.rating)
                                  }}
                                />
                              </div>
                              <span className="text-[8px] text-muted-foreground text-center leading-tight w-full break-words hyphens-auto">
                                {item.name.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Key Insights */}
                <div className="w-full">
                  <h3 className="text-xs font-medium mb-2">Key Takeaways</h3>
                  <Card className="p-3 bg-slate-50 dark:bg-slate-900/50 border">
                    <ul className="space-y-1.5">
                      {drillData.insights.map((insight, index) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                          <span className="break-words">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                {/* Category badge */}
                {drillDownDialog.pattern.category && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Related to:</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded", getPatternBadgeStyle(drillDownDialog.pattern.direction))}>
                      {categoryLabels[drillDownDialog.pattern.category] || drillDownDialog.pattern.category}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

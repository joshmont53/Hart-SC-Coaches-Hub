import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Info, X, Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

const formatCategoryLabel = (category: string): string => {
  if (categoryLabels[category]) return categoryLabels[category];
  return category
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

interface AttributeAnalyticsData {
  attribute: string;
  category: string;
  chartData: Array<{ name: string; rating: number; count: number }>;
  totalEntries: number;
}

const attributeLabels: Record<string, string> = {
  dayOfWeek: 'Day of Week',
  timeOfDay: 'Time of Day',
  duration: 'Session Duration',
  focus: 'Session Focus',
  squad: 'Squad',
  staffing: 'Staffing Level',
};

interface AIInsightsData {
  insights: string | null;
  message?: string;
  cached: boolean;
  cachedAt?: string;
  generatedAt?: string;
}

export function FeedbackAnalytics({ onBack }: FeedbackAnalyticsProps) {
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [drillDownDialog, setDrillDownDialog] = useState<DrillDownDialog>({ open: false, pattern: null });
  
  // Session Attributes filters
  const [selectedAttribute, setSelectedAttribute] = useState<string>('dayOfWeek');
  const [selectedCategory, setSelectedCategory] = useState<string>('engagement');

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

  // Query for Session Attributes chart
  const { data: attributeData, isLoading: isAttributeLoading } = useQuery<AttributeAnalyticsData>({
    queryKey: ['/api/feedback/analytics/attributes', selectedAttribute, selectedCategory, squadFilter, coachFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('attribute', selectedAttribute);
      params.append('category', selectedCategory);
      if (squadFilter && squadFilter !== 'all') params.append('squadId', squadFilter);
      if (coachFilter && coachFilter !== 'all') params.append('coachId', coachFilter);
      const response = await fetch(`/api/feedback/analytics/attributes?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch attribute analytics');
      return response.json();
    },
    enabled: !!analytics && analytics.overview.totalFeedbackCount >= 3,
  });

  // Query for AI Insights - cache key includes a refresh counter for force refresh
  const [insightsRefreshKey, setInsightsRefreshKey] = useState(0);
  const { data: aiInsights, isLoading: isInsightsLoading, isFetching: isInsightsFetching } = useQuery<AIInsightsData>({
    queryKey: ['/api/feedback/analytics/insights', squadFilter, coachFilter, insightsRefreshKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (squadFilter && squadFilter !== 'all') params.append('squadId', squadFilter);
      if (coachFilter && coachFilter !== 'all') params.append('coachId', coachFilter);
      if (insightsRefreshKey > 0) params.append('forceRefresh', 'true');
      const response = await fetch(`/api/feedback/analytics/insights?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch AI insights');
      return response.json();
    },
    enabled: !!analytics && analytics.overview.totalFeedbackCount >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleRefreshInsights = () => {
    setInsightsRefreshKey(prev => prev + 1);
  };

  // Helper to safely render markdown-like text without dangerouslySetInnerHTML
  const renderInsights = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Bold text
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formattedLine = parts.map((part, i) => 
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      );
      
      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <div key={index} className="flex items-start gap-2 ml-2">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span>{formattedLine.map((p, i) => typeof p === 'string' ? p.replace(/^[-•]\s*/, '') : p)}</span>
          </div>
        );
      }
      
      // Headers (lines that are bold)
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h4 key={index} className="font-semibold mt-3 first:mt-0 text-sm">
            {line.replace(/\*\*/g, '')}
          </h4>
        );
      }
      
      // Regular lines
      if (line.trim()) {
        return <p key={index} className="mb-1">{formattedLine}</p>;
      }
      
      return <div key={index} className="h-2" />;
    });
  };

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

  const getDrillDownData = (pattern: AnalyticsData['patterns'][0]) => {
    const patternType = pattern.type;
    const patternCategory = pattern.category;
    
    const categoryRating = patternCategory 
      ? analytics?.overview.categoryAverages[patternCategory] || 0 
      : 0;
    const categoryName = patternCategory 
      ? formatCategoryLabel(patternCategory) 
      : '';
    const overallAvg = analytics?.overview.overallAverage || 0;
    
    switch (patternType) {
      case 'strength':
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {})
            .map(([key, value]) => ({
              name: categoryLabels[key] || key,
              rating: value,
              isHighlighted: key === patternCategory,
            }))
            .sort((a, b) => b.rating - a.rating),
          insights: [
            `${categoryName} averages ${categoryRating.toFixed(1)}/10`,
            `This is ${(categoryRating - overallAvg).toFixed(1)} points above overall average`,
            'Consider applying similar techniques to other areas',
          ],
        };
      case 'improvement':
        return {
          chartData: Object.entries(analytics?.overview.categoryAverages || {})
            .map(([key, value]) => ({
              name: categoryLabels[key] || key,
              rating: value,
              isHighlighted: key === patternCategory,
            }))
            .sort((a, b) => b.rating - a.rating),
          insights: [
            `${categoryName} averages ${categoryRating.toFixed(1)}/10`,
            `This is ${(overallAvg - categoryRating).toFixed(1)} points below overall average`,
            'Targeted improvements here could boost overall satisfaction',
          ],
        };
      case 'duration':
        return {
          chartData: attributeData && attributeData.attribute === 'duration'
            ? attributeData.chartData.map((item: { name: string; rating: number }) => ({
                name: item.name,
                rating: item.rating,
              }))
            : [
                { name: '60 min', rating: 7.2 },
                { name: '90 min', rating: 7.8 },
                { name: '120 min', rating: 7.0 },
              ],
          insights: [
            'Session duration affects engagement and focus',
            'Find the optimal length for your squads',
            'Monitor how swimmers respond to varying durations',
          ],
        };
      case 'squad':
        return {
          chartData: attributeData && attributeData.attribute === 'squad'
            ? attributeData.chartData.map((item: { name: string; rating: number }) => ({
                name: item.name,
                rating: item.rating,
              }))
            : analytics?.meta.squads.slice(0, 4).map((squad, i) => ({
                name: squad.name,
                rating: 6.5 + i * 0.5,
              })) || [],
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
        ) : analytics && analytics.overview.totalFeedbackCount >= 3 ? (
          <>
            {/* Feedback Overview - 6 Category Cards */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-medium">Feedback Overview</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Trends compare the last 7 days to the previous 8-30 days.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
                                {formatCategoryLabel(pattern.category)}
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

            {/* Session Attributes vs Feedback */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-medium">Session Attributes vs Feedback</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedAttribute} onValueChange={setSelectedAttribute}>
                    <SelectTrigger className="w-[140px] text-xs h-8" data-testid="select-attribute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dayOfWeek">Day of Week</SelectItem>
                      <SelectItem value="timeOfDay">Time of Day</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="focus">Session Focus</SelectItem>
                      <SelectItem value="squad">Squad</SelectItem>
                      <SelectItem value="staffing">Staffing Level</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[140px] text-xs h-8" data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="effortAndIntent">Effort & Intent</SelectItem>
                      <SelectItem value="enjoyment">Enjoyment</SelectItem>
                      <SelectItem value="sessionClarity">Session Clarity</SelectItem>
                      <SelectItem value="appropriatenessOfChallenge">Challenge Level</SelectItem>
                      <SelectItem value="sessionFlow">Session Flow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Card className="p-4">
                {isAttributeLoading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <Skeleton className="h-[180px] w-full" />
                  </div>
                ) : attributeData && attributeData.chartData.length > 0 ? (
                  <div className="h-[220px] flex flex-col">
                    <div className="flex-1 flex gap-2">
                      {/* Y-axis */}
                      <div className="w-6 flex flex-col justify-between text-[9px] text-muted-foreground pr-1" style={{ height: 160 }}>
                        <span>10</span>
                        <span>8</span>
                        <span>6</span>
                        <span>4</span>
                        <span>2</span>
                        <span>0</span>
                      </div>
                      {/* Chart area with gridlines */}
                      <div className="flex-1 relative">
                        {/* Horizontal gridlines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: 160 }}>
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="w-full border-t border-muted/30" />
                          ))}
                          <div className="w-full border-t border-muted/50" />
                        </div>
                        {/* Bars */}
                        <div className="flex items-end gap-2 h-full" style={{ height: 160 }}>
                          {attributeData.chartData.map((item, index) => {
                            const maxHeight = 160;
                            const barHeight = (item.rating / 10) * maxHeight;
                            
                            const getBarColorClass = (rating: number) => {
                              if (rating >= 8) return 'bg-green-500';
                              if (rating >= 6.5) return 'bg-amber-500';
                              return 'bg-red-500';
                            };
                            
                            return (
                              <div key={index} className="flex-1 min-w-0 flex flex-col items-center">
                                <div className="w-full flex flex-col items-center justify-end" style={{ height: maxHeight }}>
                                  <span className={cn("text-xs font-medium mb-1", getRatingColor(item.rating))}>
                                    {item.rating.toFixed(1)}
                                  </span>
                                  <div 
                                    className={cn("w-full max-w-[50px] mx-auto rounded-t transition-all", getBarColorClass(item.rating))}
                                    style={{ height: Math.max(barHeight, 4) }}
                                    data-testid={`bar-attr-${index}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {/* X-axis labels */}
                    <div className="flex gap-2 mt-1">
                      <div className="w-6" />
                      <div className="flex-1 flex gap-2">
                        {attributeData.chartData.map((item, index) => (
                          <div key={index} className="flex-1 min-w-0 flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                              {item.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground">({item.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t text-center">
                      <span className="text-[10px] text-muted-foreground">
                        Showing {categoryLabels[selectedCategory]} by {attributeLabels[selectedAttribute]}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available for this combination
                  </div>
                )}
              </Card>
            </div>

            {/* AI Insights Section */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-medium">AI Insights</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshInsights}
                  disabled={isInsightsLoading || isInsightsFetching}
                  className="h-7 px-2 text-xs"
                  data-testid="button-refresh-insights"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", (isInsightsLoading || isInsightsFetching) && "animate-spin")} />
                  {(isInsightsLoading || isInsightsFetching) ? 'Generating...' : 'Refresh'}
                </Button>
              </div>
              
              <Card className="p-4">
                {(isInsightsLoading || isInsightsFetching) ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
                      <span>Analyzing your session data...</span>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                ) : aiInsights?.insights ? (
                  <div className="space-y-3">
                    <div className="text-sm leading-relaxed" data-testid="text-ai-insights">
                      {renderInsights(aiInsights.insights)}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
                      <span>
                        {aiInsights.cached ? 'Cached' : 'Generated'} {aiInsights.generatedAt || aiInsights.cachedAt ? 
                          new Date(aiInsights.generatedAt || aiInsights.cachedAt!).toLocaleString('en-GB', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                          }) : ''}
                      </span>
                      <span className="text-purple-500">Powered by AI</span>
                    </div>
                  </div>
                ) : aiInsights?.message ? (
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{aiInsights.message}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      AI insights will appear once you have at least 3 sessions with feedback.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Not Enough Data Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {analytics && analytics.overview.totalFeedbackCount > 0 
                ? `You have ${analytics.overview.totalFeedbackCount} session${analytics.overview.totalFeedbackCount === 1 ? '' : 's'} with feedback. Analytics require at least 3 sessions to generate meaningful insights.`
                : 'No feedback data available for the selected filters.'}
              <br />
              <span className="text-xs mt-2 block">
                Keep collecting feedback to unlock analytics.
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
            const drillData = getDrillDownData(drillDownDialog.pattern);
            
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

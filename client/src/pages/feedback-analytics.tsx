import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Lightbulb, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const getTrendIcon = (trend: number | null) => {
    if (trend === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (trend: number | null) => {
    if (trend === null) return 'text-muted-foreground';
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getPatternIcon = (direction: 'positive' | 'negative' | 'neutral') => {
    if (direction === 'positive') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (direction === 'negative') return <TrendingDown className="h-5 w-5 text-amber-600" />;
    return <Lightbulb className="h-5 w-5 text-blue-600" />;
  };

  const getPatternBorderColor = (direction: 'positive' | 'negative' | 'neutral') => {
    if (direction === 'positive') return 'border-l-green-600';
    if (direction === 'negative') return 'border-l-amber-600';
    return 'border-l-blue-600';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-foreground';
    if (rating >= 4) return 'text-amber-600';
    return 'text-red-600';
  };

  const clearFilters = () => {
    setSquadFilter('all');
    setCoachFilter('all');
  };

  const hasActiveFilters = squadFilter !== 'all' || coachFilter !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-analytics">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-analytics-title">Feedback Analytics</h1>
          <p className="text-sm text-muted-foreground">Insights from session feedback data</p>
        </div>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-toggle-filters">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {filtersOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              Clear filters
            </Button>
          )}
        </div>
        <CollapsibleContent className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium mb-1.5 block">Squad</label>
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
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium mb-1.5 block">Coach</label>
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
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : analytics && analytics.overview.totalFeedbackCount > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Average</p>
                    <p className={cn("text-3xl font-bold", getRatingColor(analytics.overview.overallAverage))} data-testid="text-overall-average">
                      {analytics.overview.overallAverage.toFixed(1)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">out of 10</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">15-Day Trend</p>
                    <div className="flex items-center gap-2">
                      <p className={cn("text-3xl font-bold", getTrendColor(analytics.overview.trend))} data-testid="text-trend">
                        {analytics.overview.trend !== null 
                          ? `${analytics.overview.trend > 0 ? '+' : ''}${analytics.overview.trend.toFixed(1)}`
                          : '-'
                        }
                      </p>
                      {getTrendIcon(analytics.overview.trend)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs previous 15 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions Rated</p>
                  <p className="text-3xl font-bold" data-testid="text-total-feedback">
                    {analytics.overview.totalFeedbackCount}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">with feedback</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(analytics.overview.categoryAverages).map(([key, value]) => (
                  <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{categoryLabels[key] || key}</p>
                    <p className={cn("text-2xl font-bold", getRatingColor(value))} data-testid={`text-category-${key}`}>
                      {value.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.patterns.length > 0 ? (
                <div className="space-y-3">
                  {analytics.patterns.map((pattern, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border-l-4 bg-muted/30",
                        getPatternBorderColor(pattern.direction)
                      )}
                      data-testid={`card-insight-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        {getPatternIcon(pattern.direction)}
                        <div>
                          <p className="font-medium">{pattern.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{pattern.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  More data needed to generate insights. Keep collecting feedback!
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-end gap-2">
                {analytics.chartData.map((week, index) => {
                  const maxHeight = 160;
                  const barHeight = week.average !== null ? (week.average / 10) * maxHeight : 0;
                  const weekLabel = new Date(week.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: maxHeight }}>
                        {week.average !== null ? (
                          <>
                            <span className="text-xs font-medium mb-1">{week.average.toFixed(1)}</span>
                            <div 
                              className={cn(
                                "w-full rounded-t transition-all",
                                week.average >= 7 ? "bg-green-500" : week.average >= 5 ? "bg-amber-500" : "bg-red-500"
                              )}
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
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Feedback Data Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start collecting feedback on your training sessions to see analytics and insights here.
                {hasActiveFilters && " Try clearing your filters to see all available data."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Coach, Session, Squad } from '../types';
import { sessionFeedback } from '../lib/mockDataExtensions';
import { cn } from './ui/utils';
import { format, subDays, isWithinInterval } from 'date-fns';

interface FeedbackAnalyticsProps {
  coach: Coach;
  sessions: Session[];
  squads: Squad[];
  onBack: () => void;
}

type TimeRange = 'last30' | 'last90' | 'custom';
type Dimension = 'dayOfWeek' | 'sessionFocus' | 'staffingLevel' | 'attendance';

const BRAND_COLOR = '#4B9A4A';

export function FeedbackAnalytics({ coach, sessions, squads, onBack }: FeedbackAnalyticsProps) {
  const [scope, setScope] = useState<'my' | 'clubwide'>('my');
  const [timeRange, setTimeRange] = useState<TimeRange>('last30');
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<Dimension>('dayOfWeek');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [drillDownDialog, setDrillDownDialog] = useState<{
    open: boolean;
    title: string;
    data: any;
  }>({ open: false, title: '', data: null });

  // Filter sessions based on scope, time range, and squad
  const filteredFeedback = useMemo(() => {
    let relevantSessions = sessions;

    // Scope filter
    if (scope === 'my') {
      relevantSessions = relevantSessions.filter(s => 
        s.setWriterId === coach.id
      );
    }

    // Time range filter
    const now = new Date();
    if (timeRange === 'last30') {
      const startDate = subDays(now, 30);
      relevantSessions = relevantSessions.filter(s => 
        isWithinInterval(s.date, { start: startDate, end: now })
      );
    } else if (timeRange === 'last90') {
      const startDate = subDays(now, 90);
      relevantSessions = relevantSessions.filter(s => 
        isWithinInterval(s.date, { start: startDate, end: now })
      );
    }

    // Squad filter
    if (selectedSquads.length > 0) {
      relevantSessions = relevantSessions.filter(s => 
        selectedSquads.includes(s.squadId)
      );
    }

    // Get feedback for these sessions
    const sessionIds = new Set(relevantSessions.map(s => s.id));
    return sessionFeedback.filter(f => sessionIds.has(f.sessionId));
  }, [scope, timeRange, selectedSquads, sessions, coach.id]);

  // Calculate average ratings
  const averageRatings = useMemo(() => {
    if (filteredFeedback.length === 0) {
      return {
        engagement: 0,
        effortAndIntent: 0,
        enjoyment: 0,
        focus: 0,
        techniqueQuality: 0,
        sessionStructure: 0,
      };
    }

    const totals = filteredFeedback.reduce((acc, f) => ({
      engagement: acc.engagement + f.ratings.engagement,
      effortAndIntent: acc.effortAndIntent + f.ratings.effortAndIntent,
      enjoyment: acc.enjoyment + f.ratings.enjoyment,
      focus: acc.focus + f.ratings.focus,
      techniqueQuality: acc.techniqueQuality + f.ratings.techniqueQuality,
      sessionStructure: acc.sessionStructure + f.ratings.sessionStructure,
    }), {
      engagement: 0,
      effortAndIntent: 0,
      enjoyment: 0,
      focus: 0,
      techniqueQuality: 0,
      sessionStructure: 0,
    });

    return {
      engagement: totals.engagement / filteredFeedback.length,
      effortAndIntent: totals.effortAndIntent / filteredFeedback.length,
      enjoyment: totals.enjoyment / filteredFeedback.length,
      focus: totals.focus / filteredFeedback.length,
      techniqueQuality: totals.techniqueQuality / filteredFeedback.length,
      sessionStructure: totals.sessionStructure / filteredFeedback.length,
    };
  }, [filteredFeedback]);

  // Get dimension data for interactive chart
  const dimensionData = useMemo(() => {
    if (filteredFeedback.length === 0) return [];

    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    switch (selectedDimension) {
      case 'dayOfWeek': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayData = days.map(day => ({
          name: day.slice(0, 3),
          fullName: day,
          engagement: 0,
          enjoyment: 0,
          focus: 0,
          count: 0,
        }));

        filteredFeedback.forEach(f => {
          const session = sessionMap.get(f.sessionId);
          if (session) {
            const dayIndex = session.date.getDay();
            dayData[dayIndex].engagement += f.ratings.engagement;
            dayData[dayIndex].enjoyment += f.ratings.enjoyment;
            dayData[dayIndex].focus += f.ratings.focus;
            dayData[dayIndex].count += 1;
          }
        });

        return dayData
          .filter(d => d.count > 0)
          .map(d => ({
            name: d.name,
            fullName: d.fullName,
            engagement: parseFloat((d.engagement / d.count).toFixed(1)),
            enjoyment: parseFloat((d.enjoyment / d.count).toFixed(1)),
            focus: parseFloat((d.focus / d.count).toFixed(1)),
          }));
      }

      case 'sessionFocus': {
        const focusData: Record<string, any> = {};

        filteredFeedback.forEach(f => {
          const session = sessionMap.get(f.sessionId);
          if (session && session.focus) {
            if (!focusData[session.focus]) {
              focusData[session.focus] = {
                name: session.focus,
                engagement: 0,
                effortAndIntent: 0,
                techniqueQuality: 0,
                count: 0,
              };
            }
            focusData[session.focus].engagement += f.ratings.engagement;
            focusData[session.focus].effortAndIntent += f.ratings.effortAndIntent;
            focusData[session.focus].techniqueQuality += f.ratings.techniqueQuality;
            focusData[session.focus].count += 1;
          }
        });

        return Object.values(focusData).map(d => ({
          name: d.name,
          engagement: parseFloat((d.engagement / d.count).toFixed(1)),
          effortAndIntent: parseFloat((d.effortAndIntent / d.count).toFixed(1)),
          techniqueQuality: parseFloat((d.techniqueQuality / d.count).toFixed(1)),
        }));
      }

      case 'staffingLevel': {
        const staffingData = [
          { name: '1 Coach', engagement: 0, sessionStructure: 0, count: 0 },
          { name: '2 Coaches', engagement: 0, sessionStructure: 0, count: 0 },
          { name: '3+ Coaches', engagement: 0, sessionStructure: 0, count: 0 },
        ];

        filteredFeedback.forEach(f => {
          const session = sessionMap.get(f.sessionId);
          if (session) {
            let coachCount = 1;
            if (session.secondCoachId) coachCount++;
            if (session.helperId) coachCount++;

            const index = coachCount === 1 ? 0 : coachCount === 2 ? 1 : 2;
            staffingData[index].engagement += f.ratings.engagement;
            staffingData[index].sessionStructure += f.ratings.sessionStructure;
            staffingData[index].count += 1;
          }
        });

        return staffingData
          .filter(d => d.count > 0)
          .map(d => ({
            name: d.name,
            engagement: parseFloat((d.engagement / d.count).toFixed(1)),
            sessionStructure: parseFloat((d.sessionStructure / d.count).toFixed(1)),
          }));
      }

      case 'attendance': {
        // Mock attendance bins
        const attendanceBins = [
          { name: '5-10', min: 5, max: 10, engagement: 0, enjoyment: 0, count: 0 },
          { name: '11-15', min: 11, max: 15, engagement: 0, enjoyment: 0, count: 0 },
          { name: '16-20', min: 16, max: 20, engagement: 0, enjoyment: 0, count: 0 },
          { name: '21+', min: 21, max: 100, engagement: 0, enjoyment: 0, count: 0 },
        ];

        filteredFeedback.forEach(f => {
          // Mock attendance between 8-25
          const attendance = 10 + Math.floor(Math.random() * 15);
          const bin = attendanceBins.find(b => attendance >= b.min && attendance <= b.max);
          if (bin) {
            bin.engagement += f.ratings.engagement;
            bin.enjoyment += f.ratings.enjoyment;
            bin.count += 1;
          }
        });

        return attendanceBins
          .filter(b => b.count > 0)
          .map(b => ({
            name: b.name,
            engagement: parseFloat((b.engagement / b.count).toFixed(1)),
            enjoyment: parseFloat((b.enjoyment / b.count).toFixed(1)),
          }));
      }

      default:
        return [];
    }
  }, [selectedDimension, filteredFeedback, sessions]);

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

  const getBarColor = (rating: number) => {
    if (rating >= 8) return '#16a34a';
    if (rating >= 6.5) return '#d97706';
    return '#dc2626';
  };

  const patternInsights = [
    {
      title: 'Staffing Patterns',
      description: 'Sessions with 2+ coaches show 15% higher average engagement compared to single-coach sessions.',
      category: 'Engagement',
      type: 'staffing' as const,
    },
    {
      title: 'Weekday Trends',
      description: 'Midweek evening sessions tend to score lower for focus than weekend morning sessions.',
      category: 'Focus',
      type: 'weekday' as const,
    },
    {
      title: 'Session Length',
      description: 'Sessions between 60-75 minutes have coincided with the highest enjoyment ratings across squads.',
      category: 'Enjoyment',
      type: 'sessionLength' as const,
    },
  ];

  // Get drill-down data based on pattern type
  const getDrillDownData = (patternType: 'staffing' | 'weekday' | 'sessionLength') => {
    switch (patternType) {
      case 'staffing':
        return {
          chartData: [
            { name: '1 Coach', engagement: 7.2, sessions: 8, avg: 7.2 },
            { name: '2 Coaches', engagement: 8.3, sessions: 12, avg: 8.3 },
            { name: '3+ Coaches', engagement: 8.5, sessions: 4, avg: 8.5 },
          ],
          exampleSessions: [
            { date: '2024-12-18', squad: 'Performance', coaches: '2 Coaches', engagement: 8.5, structure: 8.0 },
            { date: '2024-12-15', squad: 'Elite', coaches: '3 Coaches', engagement: 9.0, structure: 8.5 },
            { date: '2024-12-12', squad: 'Skills Advanced', coaches: '1 Coach', engagement: 7.0, structure: 7.5 },
            { date: '2024-12-10', squad: 'Development', coaches: '2 Coaches', engagement: 8.0, structure: 8.0 },
          ],
        };
      
      case 'weekday':
        return {
          chartData: [
            { name: 'Mon Evening', focus: 6.8, count: 5 },
            { name: 'Tue Evening', focus: 6.5, count: 6 },
            { name: 'Wed Evening', focus: 6.9, count: 7 },
            { name: 'Thu Evening', focus: 7.0, count: 5 },
            { name: 'Sat Morning', focus: 8.2, count: 8 },
            { name: 'Sun Morning', focus: 8.4, count: 6 },
          ],
          exampleSessions: [
            { date: '2024-12-21', day: 'Sat Morning', squad: 'Performance', focus: 8.5, enjoyment: 8.0 },
            { date: '2024-12-18', day: 'Wed Evening', squad: 'Skills Advanced', focus: 7.0, enjoyment: 7.5 },
            { date: '2024-12-14', day: 'Sat Morning', squad: 'Elite', focus: 8.0, enjoyment: 8.5 },
            { date: '2024-12-11', day: 'Tue Evening', squad: 'Development', focus: 6.5, enjoyment: 7.0 },
          ],
        };
      
      case 'sessionLength':
        return {
          chartData: [
            { name: '45-60 min', enjoyment: 7.5, count: 6 },
            { name: '60-75 min', enjoyment: 8.6, count: 11 },
            { name: '75-90 min', enjoyment: 7.8, count: 7 },
          ],
          exampleSessions: [
            { date: '2024-12-20', duration: '70 min', squad: 'Performance', enjoyment: 9.0, effort: 8.5 },
            { date: '2024-12-17', duration: '65 min', squad: 'Skills Advanced', enjoyment: 8.5, effort: 8.0 },
            { date: '2024-12-13', duration: '80 min', squad: 'Elite', enjoyment: 7.5, effort: 8.5 },
            { date: '2024-12-09', duration: '55 min', squad: 'Development', enjoyment: 7.0, effort: 7.5 },
          ],
        };
    }
  };

  const aiInsights = [
    'Engagement appears most sensitive to session variety and staffing levels.',
    'Enjoyment is consistently higher in sessions with moderate volume and stroke variation.',
    'Focus scores vary more by time of day than by session focus type.',
    'Sessions with clear technical cues throughout have tracked with quality improvements.',
    'Structure ratings improve when transitions between sets are explicitly planned.',
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Inline Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate">Feedback Analytics</h1>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4 shrink-0">
        {/* Collapsed View */}
        {!filtersExpanded && (
          <button 
            onClick={() => setFiltersExpanded(true)}
            className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Filters:</span>
              <span className="px-2 py-0.5 bg-muted rounded text-xs">
                {scope === 'my' ? 'My Sessions' : 'Club-wide'}
              </span>
              <span className="px-2 py-0.5 bg-muted rounded text-xs">
                {timeRange === 'last30' ? 'Last 30 days' : timeRange === 'last90' ? 'Last 90 days' : 'Custom'}
              </span>
              {selectedSquads.length > 0 && (
                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                  {squads.find(s => s.id === selectedSquads[0])?.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                ({filteredFeedback.length} entries)
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Expanded View */}
        {filtersExpanded && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm">Filters</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFiltersExpanded(false)}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Scope */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Scope</Label>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <button
                      onClick={() => setScope('my')}
                      className={cn(
                        'flex-1 px-3 py-1.5 text-xs rounded transition-all',
                        scope === 'my' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      )}
                    >
                      My Sessions
                    </button>
                    <button
                      onClick={() => setScope('clubwide')}
                      className={cn(
                        'flex-1 px-3 py-1.5 text-xs rounded transition-all',
                        scope === 'clubwide' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      )}
                    >
                      Club-wide
                    </button>
                  </div>
                </div>

                {/* Time Range */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Time Range</Label>
                  <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last30">Last 30 days</SelectItem>
                      <SelectItem value="last90">Last 90 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Squad Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Squad (optional)</Label>
                  <Select 
                    value={selectedSquads.length === 0 ? 'all' : selectedSquads[0]} 
                    onValueChange={(v) => setSelectedSquads(v === 'all' ? [] : [v])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All squads" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All squads</SelectItem>
                      {squads.map(squad => (
                        <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Advanced filters
              </Button>
            </div>

            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Viewing {filteredFeedback.length} feedback entr{filteredFeedback.length === 1 ? 'y' : 'ies'}
              {scope === 'my' && ' from your sessions'}
            </div>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {filteredFeedback.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              No feedback data available for the selected filters.
              <br />
              <span className="text-xs mt-2 block">
                Insights will appear as more feedback is collected.
              </span>
            </p>
          </Card>
        ) : (
          <>
            {/* Feedback Overview */}
            <div>
              <h2 className="text-sm mb-4">Feedback Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(averageRatings).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').trim();
                  const rating = typeof value === 'number' ? value : 0;
                  return (
                    <Card key={key} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-muted-foreground capitalize leading-tight">
                          {label}
                        </span>
                        {getTrendIcon(rating)}
                      </div>
                      <div className={cn('text-2xl', getRatingColor(rating))}>
                        {rating.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">out of 10</div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Pattern Explorer */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm">Pattern Explorer</h2>
                <span className="text-xs text-muted-foreground">What influences session quality?</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {patternInsights.map((insight, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                    setDrillDownDialog({
                      open: true,
                      title: insight.title,
                      data: insight,
                    });
                  }}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                        <Info className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs mb-1.5">{insight.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {insight.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {insight.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            View breakdown →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Session Attributes vs Feedback */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm">Session Attributes vs Feedback</h2>
                <Select value={selectedDimension} onValueChange={(v) => setSelectedDimension(v as Dimension)}>
                  <SelectTrigger className="w-[200px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dayOfWeek">Day of Week</SelectItem>
                    <SelectItem value="sessionFocus">Session Focus</SelectItem>
                    <SelectItem value="staffingLevel">Staffing Level</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Card className="p-6">
                {dimensionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dimensionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      {selectedDimension === 'dayOfWeek' && (
                        <>
                          <Bar dataKey="engagement" name="Engagement" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="enjoyment" name="Enjoyment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="focus" name="Focus" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                      {selectedDimension === 'sessionFocus' && (
                        <>
                          <Bar dataKey="engagement" name="Engagement" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="effortAndIntent" name="Effort & Intent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="techniqueQuality" name="Technique Quality" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                      {selectedDimension === 'staffingLevel' && (
                        <>
                          <Bar dataKey="engagement" name="Engagement" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="sessionStructure" name="Session Structure" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                      {selectedDimension === 'attendance' && (
                        <>
                          <Bar dataKey="engagement" name="Engagement" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="enjoyment" name="Enjoyment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available for this dimension
                  </div>
                )}
              </Card>
            </div>

            {/* AI Insight Summary */}
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mb-3"
                onClick={() => setShowAIInsights(!showAIInsights)}
              >
                {showAIInsights ? <ChevronUp className="h-3 w-3 mr-2" /> : <ChevronDown className="h-3 w-3 mr-2" />}
                AI Insight Summary
              </Button>
              
              {showAIInsights && (
                <Card className="p-4 bg-slate-50 border-slate-200">
                  <p className="text-xs text-muted-foreground mb-3">
                    Key patterns identified across your feedback data:
                  </p>
                  <ul className="space-y-2">
                    {aiInsights.map((insight, index) => (
                      <li key={index} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={drillDownDialog.open} onOpenChange={(open) => setDrillDownDialog({ ...drillDownDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{drillDownDialog.title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Detailed breakdown and supporting data
            </DialogDescription>
          </DialogHeader>
          
          {drillDownDialog.data && (() => {
            const drillData = getDrillDownData(drillDownDialog.data.type);
            const isStaffing = drillDownDialog.data.type === 'staffing';
            const isWeekday = drillDownDialog.data.type === 'weekday';
            const isSessionLength = drillDownDialog.data.type === 'sessionLength';
            
            return (
              <div className="space-y-4 sm:space-y-6">
                {/* Pattern Description */}
                <Card className="p-3 sm:p-4 bg-blue-50 border-blue-200">
                  <p className="text-xs sm:text-sm">{drillDownDialog.data.description}</p>
                </Card>

                {/* Chart Visualization */}
                <div>
                  <h3 className="text-xs sm:text-sm mb-2 sm:mb-3">Distribution Analysis</h3>
                  <Card className="p-3 sm:p-6">
                    <ResponsiveContainer width="100%" height={200} minWidth={0}>
                      <BarChart data={drillData.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          stroke="#6b7280"
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          domain={[0, 10]} 
                          tick={{ fontSize: 10 }}
                          stroke="#6b7280"
                          width={30}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '10px'
                          }}
                        />
                        {isStaffing && (
                          <Bar dataKey="engagement" name="Engagement" radius={[4, 4, 0, 0]}>
                            {drillData.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={getBarColor(entry.engagement)} />
                            ))}
                          </Bar>
                        )}
                        {isWeekday && (
                          <Bar dataKey="focus" name="Focus" radius={[4, 4, 0, 0]}>
                            {drillData.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={getBarColor(entry.focus)} />
                            ))}
                          </Bar>
                        )}
                        {isSessionLength && (
                          <Bar dataKey="enjoyment" name="Enjoyment" radius={[4, 4, 0, 0]}>
                            {drillData.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={getBarColor(entry.enjoyment)} />
                            ))}
                          </Bar>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Example Sessions Table */}
                <div>
                  <h3 className="text-xs sm:text-sm mb-2 sm:mb-3">Example Sessions</h3>
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] sm:text-xs">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="text-left p-2 sm:p-3 whitespace-nowrap">Date</th>
                            {isStaffing && <th className="text-left p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">Staffing</th>}
                            {isWeekday && <th className="text-left p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">Time</th>}
                            {isSessionLength && <th className="text-left p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">Duration</th>}
                            <th className="text-left p-2 sm:p-3 whitespace-nowrap">Squad</th>
                            {isStaffing && (
                              <>
                                <th className="text-right p-2 sm:p-3 whitespace-nowrap">Eng.</th>
                                <th className="text-right p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">Struct.</th>
                              </>
                            )}
                            {isWeekday && (
                              <>
                                <th className="text-right p-2 sm:p-3 whitespace-nowrap">Focus</th>
                                <th className="text-right p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">Enjoy.</th>
                              </>
                            )}
                            {isSessionLength && (
                              <>
                                <th className="text-right p-2 sm:p-3 whitespace-nowrap">Enjoy.</th>
                                <th className="text-right p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">Effort</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {drillData.exampleSessions.map((session: any, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="p-2 sm:p-3 whitespace-nowrap text-[9px] sm:text-[10px]">
                                {session.date.slice(5)}
                              </td>
                              {isStaffing && <td className="p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">{session.coaches}</td>}
                              {isWeekday && <td className="p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">{session.day}</td>}
                              {isSessionLength && <td className="p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">{session.duration}</td>}
                              <td className="p-2 sm:p-3 whitespace-nowrap text-[9px] sm:text-[10px]">
                                {session.squad.split(' ')[0]}
                              </td>
                              {isStaffing && (
                                <>
                                  <td className={cn('p-2 sm:p-3 text-right whitespace-nowrap', getRatingColor(session.engagement))}>
                                    {session.engagement.toFixed(1)}
                                  </td>
                                  <td className={cn('p-2 sm:p-3 text-right whitespace-nowrap hidden sm:table-cell', getRatingColor(session.structure))}>
                                    {session.structure.toFixed(1)}
                                  </td>
                                </>
                              )}
                              {isWeekday && (
                                <>
                                  <td className={cn('p-2 sm:p-3 text-right whitespace-nowrap', getRatingColor(session.focus))}>
                                    {session.focus.toFixed(1)}
                                  </td>
                                  <td className={cn('p-2 sm:p-3 text-right whitespace-nowrap hidden sm:table-cell', getRatingColor(session.enjoyment))}>
                                    {session.enjoyment.toFixed(1)}
                                  </td>
                                </>
                              )}
                              {isSessionLength && (
                                <>
                                  <td className={cn('p-2 sm:p-3 text-right whitespace-nowrap', getRatingColor(session.enjoyment))}>
                                    {session.enjoyment.toFixed(1)}
                                  </td>
                                  <td className={cn('p-2 sm:p-3 text-right whitespace-nowrap hidden sm:table-cell', getRatingColor(session.effort))}>
                                    {session.effort.toFixed(1)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Key Insights */}
                <div className="text-xs sm:text-sm text-muted-foreground bg-slate-50 p-3 sm:p-4 rounded-lg border">
                  <p className="mb-2">📊 Pattern Summary:</p>
                  <ul className="space-y-1 text-[10px] sm:text-xs">
                    {isStaffing && (
                      <>
                        <li>• Single-coach sessions averaged <span className="text-amber-600">7.2</span> for engagement</li>
                        <li>• Sessions with 2 coaches showed a <span className="text-green-600">+15% improvement</span> (8.3 avg)</li>
                        <li>• This pattern held across {drillData.chartData.reduce((sum: number, d: any) => sum + d.sessions, 0)} sessions</li>
                      </>
                    )}
                    {isWeekday && (
                      <>
                        <li>• Weekend morning sessions averaged <span className="text-green-600">8.3</span> for focus</li>
                        <li>• Midweek evening sessions averaged <span className="text-amber-600">6.8</span> for focus</li>
                        <li>• The gap appears most pronounced on Tuesday and Wednesday evenings</li>
                      </>
                    )}
                    {isSessionLength && (
                      <>
                        <li>• 60-75 minute sessions showed the <span className="text-green-600\">highest enjoyment</span> (8.6 avg)</li>
                        <li>• Both shorter and longer sessions showed modest declines</li>
                        <li>• This pattern was consistent across {drillData.chartData.reduce((sum: number, d: any) => sum + d.count, 0)} sessions</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}